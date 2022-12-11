import * as ts from "typescript";
import { Graph, Edge } from "./graph";
import { SymbolTable } from "./symbolTable";
import { ConstTable } from "./constTable";
import { NodeId, UNKNOWN_ID, VertexType, BinaryOperation, UnaryOperation } from "./types";
import * as vertex from "./vertex";

class Analyzer {
    private output: string;
    private sourceName: string;
    private graph: Graph;
    private symbolTable: SymbolTable;
    private constTable: ConstTable;
    private controlVertex: NodeId;
    private functionsStack: Array<NodeId>;
    private currentBranchType: boolean;
    private backPachtingStack: Array<Array<string>>;
    private patchingVariablesCounter: NodeId;

    public constructor( _output: string, _sourceName: string) {
        this.output = _output;
        this.sourceName = _sourceName;
        this.graph = new Graph();
        this.symbolTable = new SymbolTable();
        this.constTable = new ConstTable(this.graph);
        this.controlVertex = 0;
        this.functionsStack = new Array<NodeId>();
        this.currentBranchType = false;
        this.backPachtingStack = new Array<Array<string>>();
        this.patchingVariablesCounter = -1;
    }

    public run() {
        this.buildGraph();
    }
        
    private static getVarName(identifierExpression: ts.Identifier): string{
        return (identifierExpression as any).escapedText;
    }

    private buildGraph() {
        this.initGraph();
        this.initSymbolTable();

        const program = ts.createProgram([this.sourceName], {});
        let sourceFiles = program.getSourceFiles().filter((sourceFile: ts.SourceFile) => !sourceFile.isDeclarationFile);
        sourceFiles.forEach((sourceFile: ts.SourceFile) => this.processStatements(sourceFile.statements));

        this.graph.print(false, this.output);

        this.destroySymbolTable();
    }

    private initGraph(): void {
        this.controlVertex = this.graph.addVertex(VertexType.Start, {name: "__entryPoint__"});
    }

    private initSymbolTable(): void {
        this.symbolTable.addNewScope();
    }

    private destroySymbolTable(): void {
        this.symbolTable.removeCurrentScope();
    }

    private nextControl(nextControlId: NodeId) {
        let currentControlVertex: vertex.Vertex = this.graph.getVertexById(this.controlVertex);
        if (!(currentControlVertex instanceof vertex.ReturnVertex)) {
            let isBranchVertex = currentControlVertex instanceof vertex.IfVertex ||
                                 currentControlVertex instanceof vertex.WhileVertex;
            let edgeLabel: string = isBranchVertex ? String(this.currentBranchType) + "-control" : "control";
            this.graph.addEdge(this.controlVertex, nextControlId, edgeLabel);
        }
        this.controlVertex = nextControlId;
    }

    private processStatements(statements: ts.NodeArray<ts.Statement>): void {
        let postponedFunctionStatements: Array<ts.FunctionDeclaration> = [];

        statements.forEach((statement: ts.Statement) => {
            switch (statement.kind) {
                case ts.SyntaxKind.FunctionDeclaration:
                    this.processFunctionDeclaration(statement as ts.FunctionDeclaration);
                    postponedFunctionStatements.push(statement as ts.FunctionDeclaration);
                    break;
                case ts.SyntaxKind.VariableStatement:
                    this.processVariableStatement(statement as ts.VariableStatement);
                    break;
                case ts.SyntaxKind.ExpressionStatement:
                    this.processExpressionStatement(statement as ts.ExpressionStatement);
                    break;
                case ts.SyntaxKind.IfStatement:
                    this.processIfStatement(statement as ts.IfStatement);
                    break;
                case ts.SyntaxKind.ReturnStatement:
                    this.processReturnStatement(statement as ts.ReturnStatement);
                    break;
                case ts.SyntaxKind.WhileStatement:
                    this.processWhileStatement(statement as ts.WhileStatement);
                    break;
                default:
                    throw new Error(`not implemented`);
            }
        });

        this.processPostponedFunctionStatements(postponedFunctionStatements);
    }

    private processPostponedFunctionStatements(postponedFunctionStatements: Array<ts.FunctionDeclaration>): void {
        let prevControlVertex: NodeId = this.controlVertex;

        postponedFunctionStatements.forEach((funcDeclaration: ts.FunctionDeclaration) => {
            let funcName: string = (funcDeclaration.name as any).escapedText;
            let funcStartNodeId: NodeId = this.symbolTable.getIdByName(funcName);
            this.controlVertex = funcStartNodeId;

            this.symbolTable.addNewScope();
            this.functionsStack.unshift(funcStartNodeId);

            funcDeclaration.parameters.forEach((parameter: ts.ParameterDeclaration, position: number) => {
                let parameterName: string = (parameter.name as any).escapedText;
                let parameterNodeId: NodeId = this.graph.addVertex(VertexType.Parameter,
                                                                   {pos: position + 1, funcId: funcStartNodeId});
                this.symbolTable.addSymbol(parameterName, parameterNodeId, false, true);
            });

            this.processStatements((funcDeclaration.body as ts.Block).statements);

            this.functionsStack.shift();
            this.symbolTable.removeCurrentScope();
        });

        this.controlVertex = prevControlVertex;
    }

    private processFunctionDeclaration(funcDeclaration: ts.FunctionDeclaration): void {
        let funcName: string = (funcDeclaration.name as any).escapedText;
        let funcStartNodeId: NodeId = this.graph.addVertex(VertexType.Start, {name: funcName});
        this.symbolTable.addSymbol(funcName, funcStartNodeId, true);
    }

    private processVariableStatement(varStatement: ts.VariableStatement): void {
        varStatement.forEachChild(child => {
            switch (child.kind) {
                case ts.SyntaxKind.VariableDeclarationList:
                    this.processVariableDeclarationList(child as ts.VariableDeclarationList);
                    break;
                default:
                    throw new Error(`not implemented`);
            }
        });
    }

    private processExpressionStatement(expStatement: ts.ExpressionStatement): NodeId {
        switch (expStatement.expression.kind) {
            case ts.SyntaxKind.BinaryExpression:
                return this.processBinaryExpression(expStatement.expression as ts.BinaryExpression);
            case ts.SyntaxKind.CallExpression:
                return this.processCallExpression(expStatement.expression as ts.CallExpression);
            default:
                throw new Error(`not implemented`);
        }
    }

    private processCallExpression(callExpression: ts.CallExpression): NodeId {
        let callNodeId: NodeId = this.graph.addVertex(VertexType.Call);

        this.nextControl(callNodeId);

        callExpression.arguments.forEach((argument, pos) => {
            let argumentNodeId: NodeId = this.processExpression(argument);
            this.graph.addEdge(argumentNodeId, callNodeId, "pos: " + String(pos + 1));
        });

        let startNodeId: NodeId = this.processExpression(callExpression.expression);//callExpression.expression - name of function
        this.graph.addEdge(callNodeId, startNodeId, "call");

        return callNodeId;
    }

    private processWhileStatement(whileStatement: ts.WhileStatement): void {
        let preStatementControlVertex: NodeId = this.controlVertex;
        let expNodeId: NodeId = this.processExpression(whileStatement.expression);
        let whileNodeId: NodeId = this.graph.addVertex(VertexType.While)
        let mergeNodeId: NodeId = this.graph.addVertex(VertexType.Merge, {branchOriginId: whileNodeId});
        this.nextControl(mergeNodeId);
        this.nextControl(whileNodeId);
        this.graph.addEdge(expNodeId, whileNodeId, "condition");
        this.currentBranchType = true;

        let symbolTableCopy: Map<string, NodeId> = this.symbolTable.getCopy();
        let previousPatchingVariablesCounter: NodeId = this.patchingVariablesCounter;
        let patchingIdToVarName: Map<NodeId, string> = new Map<NodeId, string>();
        symbolTableCopy.forEach((nodeId: NodeId, varName: string) => {
            this.symbolTable.updateNodeId(varName, this.patchingVariablesCounter);
            patchingIdToVarName.set(this.patchingVariablesCounter, varName);
            this.patchingVariablesCounter--;
        });

        this.processIfBlock(whileStatement.statement);
        let lastBlockControlVertex: NodeId = this.getLastControlVertex(whileNodeId);

        let changedVars: Map<string, NodeId> = new Map<string, NodeId>();
        symbolTableCopy.forEach((nodeId: NodeId, varName: string) => {
            let currentNodeId: NodeId = this.symbolTable.getIdByName(varName);
            if (currentNodeId < 0) { // the variable was not changed during the while-block.
                                     // thus we need to recover its node id
                this.symbolTable.updateNodeId(varName, nodeId);
            }
            else { // the variable was changed during the while-block.
                   // thus we need to create a phi vertex for it
                changedVars.set(varName, currentNodeId);
            }
        });
        this.createPhiVertices(symbolTableCopy, changedVars, new Map<string, NodeId>(),
                               mergeNodeId, lastBlockControlVertex, preStatementControlVertex);

        let edgesWithNegativeSource: Array<Edge> = this.graph.getEdgesWithNegativeSource();
        edgesWithNegativeSource.forEach((edge: Edge) => {
            let varName: string = patchingIdToVarName.get(edge.srcId) as string;
            let nodeId: NodeId = this.symbolTable.getIdByName(varName);
            edge.srcId = nodeId;
        });

        this.nextControl(mergeNodeId);
        this.controlVertex = whileNodeId;
        this.currentBranchType = false;
        this.patchingVariablesCounter = previousPatchingVariablesCounter;
    }

    private processIfStatement(ifStatement: ts.IfStatement): Set<string> {
        let ifNodeId: NodeId = this.graph.addVertex(VertexType.If);

        this.nextControl(ifNodeId);

        let expNodeId: NodeId = this.processExpression(ifStatement.expression);
        this.graph.addEdge(expNodeId, ifNodeId, "condition");

        let symbolTableCopy: Map<string, NodeId> = this.symbolTable.getCopy();

        let allChangedVars: Set<string> = new Set<string>();
        let changedVars: Set<string>;
        let trueBranchSymbolTable: Map<string, NodeId>;
        let falseBranchSymbolTable: Map<string, NodeId>;

        let mergeNodeId: NodeId = this.graph.addVertex(VertexType.Merge, {branchOriginId: ifNodeId});

        this.currentBranchType = true;
        changedVars = this.processIfBlock(ifStatement.thenStatement);
        changedVars.forEach((e : string) => { allChangedVars.add(e); });
        trueBranchSymbolTable = this.symbolTable.getCopy(changedVars);

        let lastTrueBranchControlVertex: NodeId = this.getLastControlVertex(ifNodeId);
        this.nextControl(mergeNodeId);

        this.controlVertex = ifNodeId;

        this.currentBranchType = false;

        if (ifStatement.elseStatement === undefined) {
            falseBranchSymbolTable = new Map<string, NodeId>();
        }
        else {
            // In case we have else-if then ifStatement.elseStatement is a ifStatement itself.
            // Otherwise, the ifStatement.elseStatement is a block of the false branch.
            if (ifStatement.elseStatement.kind === ts.SyntaxKind.IfStatement) {
                changedVars = this.processIfStatement(ifStatement.elseStatement as ts.IfStatement);
            }
            else {
                changedVars = this.processIfBlock(ifStatement.elseStatement);
            }
            changedVars.forEach((e : string) => { allChangedVars.add(e); });
            falseBranchSymbolTable = this.symbolTable.getCopy(changedVars);
        }

        let lastFalseBranchControlVertex: NodeId = this.getLastControlVertex(ifNodeId);
        this.nextControl(mergeNodeId);

        this.createPhiVertices(symbolTableCopy, trueBranchSymbolTable, falseBranchSymbolTable,
                               mergeNodeId, lastTrueBranchControlVertex, lastFalseBranchControlVertex);

        return allChangedVars;
    }

    private getLastControlVertex(StartBlockNodeId: NodeId) : NodeId {
        // when there are no control vertices inside the branch block, we want to create a dummy
        // node for the matching phi vertices.
        if (StartBlockNodeId === this.controlVertex) {
            let dummyNodeId: NodeId = this.graph.addVertex(VertexType.Dummy, {});
            this.nextControl(dummyNodeId);
            return dummyNodeId;
        }
        return this.controlVertex;
    }

    private createPhiVertices(symbolTableCopy: Map<string, NodeId>,
                              trueBranchSymbolTable: Map<string, NodeId>,
                              falseBranchSymbolTable: Map<string, NodeId>,
                              mergeNodeId: NodeId,
                              lastTrueBranchControlVertex: NodeId,
                              lastFalseBranchControlVertex: NodeId): void {
        symbolTableCopy.forEach((nodeId: NodeId, varName: string) => {
            let trueBranchNodeId = trueBranchSymbolTable.get(varName);
            let falseBranchNodeId = falseBranchSymbolTable.get(varName);

            let phiEdgesLabels = {
                true: "from " + String(lastTrueBranchControlVertex),
                false: "from " + String(lastFalseBranchControlVertex)
            };

            if (!(trueBranchNodeId) && !(falseBranchNodeId)) {
                // TODO: assert (remove after testing)
                if (nodeId !== this.symbolTable.getIdByName(varName)) {
                    throw new Error(`unexpected node id ${nodeId} in symbol table`);
                }
            }
            else {
                let phiNodeId: NodeId = this.graph.addVertex(VertexType.Phi, {mergeId: mergeNodeId});
                if (trueBranchNodeId && falseBranchNodeId) {
                    this.graph.addEdge(trueBranchNodeId, phiNodeId, phiEdgesLabels.true);
                    this.graph.addEdge(falseBranchNodeId, phiNodeId, phiEdgesLabels.false);
                }
                else if (trueBranchNodeId) {
                    this.graph.addEdge(trueBranchNodeId, phiNodeId, phiEdgesLabels.true);
                    this.graph.addEdge(nodeId, phiNodeId, phiEdgesLabels.false);
                }
                else if (falseBranchNodeId) {
                    this.graph.addEdge(falseBranchNodeId, phiNodeId, phiEdgesLabels.false);
                    this.graph.addEdge(nodeId, phiNodeId, phiEdgesLabels.true);
                }
                else {
                    // TODO: assert (remove after testing)
                    throw new Error(`logical error`);
                }
                this.symbolTable.updateNodeId(varName, phiNodeId);
            }
        });
    }

    private processIfBlock(statements: ts.Statement) {
        let changedVars: Set<string> = new Set<string>();
        this.symbolTable.addNewScope();
        statements.forEachChild(statement => {
            switch (statement.kind) {
                case ts.SyntaxKind.VariableStatement:
                    this.processVariableStatement(statement as ts.VariableStatement);
                    break;
                case ts.SyntaxKind.ExpressionStatement:
                    let expressionResult: NodeId = this.processExpressionStatement(statement as ts.ExpressionStatement);
                    if ((statement as ts.ExpressionStatement).expression.kind === ts.SyntaxKind.BinaryExpression) {
                        changedVars.add(this.symbolTable.getNameById(expressionResult));
                    }
                    break;
                case ts.SyntaxKind.IfStatement:
                    let ifResult: Set<string> = this.processIfStatement(statement as ts.IfStatement);
                    ifResult.forEach((e : string) => { changedVars.add(e); });
                    break;
                case ts.SyntaxKind.ReturnStatement:
                    this.processReturnStatement(statement as ts.ReturnStatement);
                    break;
                default:
                    throw new Error(`not implemented`);
            }
        });
        this.symbolTable.removeCurrentScope();
        return changedVars;
    }

    private processReturnStatement(retStatement: ts.ReturnStatement): void {
        let currentFuncNodeId: NodeId = this.functionsStack[0];
        let returnNodeId: NodeId = this.graph.addVertex(VertexType.Return, {funcId: currentFuncNodeId});
        this.nextControl(returnNodeId);

        if (retStatement.expression !== undefined) {
            let expNodeId: NodeId = this.processExpression(retStatement.expression);
            this.graph.addEdge(expNodeId, returnNodeId, "value")
        }
    }

    private processVariableDeclarationList(varDeclList: ts.VariableDeclarationList): void {
        varDeclList.forEachChild(child => {
            switch (child.kind) {
                case ts.SyntaxKind.VariableDeclaration:
                    this.processVariableDeclaration(child as ts.VariableDeclaration);
                    break;
                default:
                    throw new Error(`not implemented`);
            }
        });
    }

    private processVariableDeclaration(varDecl: ts.VariableDeclaration): void {
        let varName: string = (varDecl.name as any).escapedText;

        if (varDecl.initializer !== undefined) {
            let expNodeId: NodeId = this.processExpression(varDecl.initializer as ts.Expression);
            this.symbolTable.addSymbol(varName, expNodeId, false, true);
        }
        else {
            this.symbolTable.addSymbol(varName, 0, false, false);
        }
        
    }

    private processExpression(expression: ts.Expression): NodeId {
        let expNodeId: NodeId;
        switch (expression.kind) {
            case ts.SyntaxKind.NumericLiteral:
                expNodeId = this.processNumericLiteral(expression as ts.NumericLiteral);
                break;
            case ts.SyntaxKind.StringLiteral:
                expNodeId = this.processStringLiteral(expression as ts.StringLiteral);
                break;
            case ts.SyntaxKind.TrueKeyword:
                expNodeId = this.processTrueLiteral(expression as ts.TrueLiteral);
                break;
            case ts.SyntaxKind.FalseKeyword:
                expNodeId = this.processFalseLiteral(expression as ts.FalseLiteral);
                break;
            case ts.SyntaxKind.PrefixUnaryExpression:
                expNodeId = this.processPrefixUnaryExpression(expression as ts.PrefixUnaryExpression);
                break;
            case ts.SyntaxKind.BinaryExpression:
                expNodeId = this.processBinaryExpression(expression as ts.BinaryExpression);
                break;
            case ts.SyntaxKind.ParenthesizedExpression:
                expNodeId = this.processParenthesizedExpression(expression as ts.ParenthesizedExpression);
                break;
            case ts.SyntaxKind.Identifier:
                expNodeId = this.processIdentifierExpression(expression as ts.Identifier);
                break;
            case ts.SyntaxKind.CallExpression:
                expNodeId = this.processCallExpression(expression as ts.CallExpression);
                break;
            default:
                throw new Error(`not implemented`);
        }
        return expNodeId;
    }

    private processNumericLiteral(numLiteral: ts.NumericLiteral): NodeId {
        let value: number = Number(numLiteral.text);

        return this.constTable.getNodeId(value);
    }

    private processStringLiteral(strLiteral: ts.StringLiteral): NodeId {
        return this.constTable.getNodeId(strLiteral.text);
    }

    private processTrueLiteral(trueLiteral: ts.TrueLiteral): NodeId {
        return this.constTable.getNodeId(true);
    }

    private processFalseLiteral(falseLiteral: ts.FalseLiteral): NodeId {
        return this.constTable.getNodeId(false);
    }

    private processPrefixUnaryExpression(prefixUnaryExpression: ts.PrefixUnaryExpression): NodeId {
        let expNodeId: NodeId = this.processExpression(prefixUnaryExpression.operand as ts.Expression);
        let unaryOperation: UnaryOperation;
        switch(prefixUnaryExpression.operator){
            case ts.SyntaxKind.PlusToken:
                unaryOperation = UnaryOperation.Plus
                break;
            case ts.SyntaxKind.MinusToken:
                unaryOperation = UnaryOperation.Minus;
                break;
            case ts.SyntaxKind.ExclamationToken:
                unaryOperation = UnaryOperation.Not;
                break;
            default:
                throw new Error(`not implemented`);
        }
        let operationNodeId: NodeId = this.graph.addVertex(VertexType.UnaryOperation, {operation: unaryOperation});
        this.graph.addEdge(expNodeId, operationNodeId, "prefix");
        return operationNodeId;
    }

    private processBinaryExpression(binExpression: ts.BinaryExpression): NodeId {
        let binaryOperation: BinaryOperation;
        let isAssignOperation: boolean = false;

        switch (binExpression.operatorToken.kind) {
            case ts.SyntaxKind.PlusToken:
                binaryOperation = BinaryOperation.Add;
                break;
            case ts.SyntaxKind.MinusToken:
                binaryOperation = BinaryOperation.Sub;
                break;
            case ts.SyntaxKind.AsteriskToken:
                binaryOperation = BinaryOperation.Mul;
                break;
            case ts.SyntaxKind.SlashToken:
                binaryOperation = BinaryOperation.Div;
                break;
            case ts.SyntaxKind.EqualsToken:
                binaryOperation = BinaryOperation.Assign;
                isAssignOperation = true;
                break;
            case ts.SyntaxKind.LessThanToken:
                binaryOperation = BinaryOperation.LessThan;
                break;
            case ts.SyntaxKind.GreaterThanToken:
                binaryOperation = BinaryOperation.GreaterThan;
                break;
            case ts.SyntaxKind.LessThanEqualsToken:
                binaryOperation = BinaryOperation.LessThanEqual;
                break;
            case ts.SyntaxKind.GreaterThanEqualsToken:
                binaryOperation = BinaryOperation.GreaterThanEqual;
                break;
            case ts.SyntaxKind.EqualsEqualsToken:
                binaryOperation = BinaryOperation.EqualEqual;
                break;
            case ts.SyntaxKind.ExclamationEqualsToken:
                binaryOperation = BinaryOperation.NotEqual;
                break;
            case ts.SyntaxKind.EqualsEqualsEqualsToken:
                binaryOperation = BinaryOperation.EqualEqualEqual;
                break;
            case ts.SyntaxKind.ExclamationEqualsEqualsToken:
                binaryOperation = BinaryOperation.NotEqualEqual;
                break;
            case ts.SyntaxKind.AmpersandAmpersandToken:
                binaryOperation = BinaryOperation.And;
                break;
            case ts.SyntaxKind.BarBarToken:
                binaryOperation = BinaryOperation.Or;
                break;
            default:
                throw new Error(`not implemented`);
        }

        let rightNodeId: NodeId = this.processExpression(binExpression.right);
        if (isAssignOperation) {
            // for cases a variable that is already defined is being re-assigned
            let varName: string = (binExpression.left as any).escapedText;
            this.symbolTable.updateNodeId(varName, rightNodeId);
            return rightNodeId;
        }
        else {
            let leftNodeId: NodeId = this.processExpression(binExpression.left);
            let operationNodeId: NodeId = this.graph.addVertex(VertexType.BinaryOperation, {operation: binaryOperation});
            this.graph.addEdge(rightNodeId, operationNodeId, "right");
            this.graph.addEdge(leftNodeId, operationNodeId, "left");
            return operationNodeId;
        }
    }

    private processParenthesizedExpression(parenthesizedExpression: ts.ParenthesizedExpression): NodeId {
        return this.processExpression(parenthesizedExpression.expression);
    }

    //for cases we use the identifier's value
    private processIdentifierExpression(identifierExpression: ts.Identifier): NodeId {
        let varName: string = Analyzer.getVarName(identifierExpression);
        return this.symbolTable.getIdByName(varName);
    }
}

function main() {
    const output: string = process.argv[2]
    const sourceName: string = process.argv[3];
    let analyzer: Analyzer = new Analyzer(output, sourceName);
    analyzer.run();
}

main();
