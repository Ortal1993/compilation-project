import * as ts from "typescript";
import { Graph } from "./graph";
import { SymbolTable } from "./symbolTable";
import { ConstTable } from "./constTable";
import { VertexType, BinaryOperation, UnaryOperation } from "./types";
import * as vertex from "./vertex";

class Analyzer {
    private output: string;
    private sourceName: string;
    private graph: Graph;
    private symbolTable: SymbolTable;
    private constTable: ConstTable;
    private controlVertex: number;
    private functionsStack: Array<number>; //number - nodeId of start vertex

    public constructor( _output: string, _sourceName: string) {
        this.output = _output;
        this.sourceName = _sourceName;
        this.graph = new Graph();
        this.symbolTable = new SymbolTable();
        this.constTable = new ConstTable(this.graph);
        this.controlVertex = 0;
        this.functionsStack = new Array<number>();
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

    private nextControl(nextControlId: number) {
        let currentControlVertex: vertex.Vertex = this.graph.getVertexById(this.controlVertex);
        if (!(currentControlVertex instanceof vertex.ReturnVertex)) {
            this.graph.addEdge(this.controlVertex, nextControlId, "control");
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
                default:
                    throw new Error(`not implemented`);
            }
        });

        this.processPostponedFunctionStatements(postponedFunctionStatements);
    }

    private processPostponedFunctionStatements(postponedFunctionStatements: Array<ts.FunctionDeclaration>): void {
        let prevControlVertex: number = this.controlVertex;

        postponedFunctionStatements.forEach((funcDeclaration: ts.FunctionDeclaration) => {
            let funcName: string = (funcDeclaration.name as any).escapedText;
            let funcStartNodeId: number = this.symbolTable.getIdByName(funcName);
            this.controlVertex = funcStartNodeId;

            this.symbolTable.addNewScope();
            this.functionsStack.unshift(funcStartNodeId);

            funcDeclaration.parameters.forEach((parameter: ts.ParameterDeclaration, position: number) => {
                let parameterName: string = (parameter.name as any).escapedText;
                let parameterNodeId: number = this.graph.addVertex(VertexType.Parameter,
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
        let funcStartNodeId: number = this.graph.addVertex(VertexType.Start, {name: funcName});
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

    private processExpressionStatement(expStatement: ts.ExpressionStatement): number {
        switch (expStatement.expression.kind) {
            case ts.SyntaxKind.BinaryExpression:
                return this.processBinaryExpression(expStatement.expression as ts.BinaryExpression);
            case ts.SyntaxKind.CallExpression:
                return this.processCallExpression(expStatement.expression as ts.CallExpression);
            default:
                throw new Error(`not implemented`);
        }
    }

    private processCallExpression(callExpression: ts.CallExpression): number {
        let callNodeId: number = this.graph.addVertex(VertexType.Call);

        this.nextControl(callNodeId);

        callExpression.arguments.forEach((argument, pos) => {
            let argumentNodeId: number = this.processExpression(argument);
            this.graph.addEdge(argumentNodeId, callNodeId, "pos: " + String(pos + 1));
        });

        let startNodeId: number = this.processExpression(callExpression.expression);//callExpression.expression - name of function
        this.graph.addEdge(callNodeId, startNodeId, "call");

        return callNodeId;
    }

    private processIfStatement(ifStatement: ts.IfStatement): Set<string> {
        let ifNodeId: number = this.graph.addVertex(VertexType.If);

        this.nextControl(ifNodeId);

        let expNodeId: number = this.processExpression(ifStatement.expression);
        this.graph.addEdge(expNodeId, ifNodeId, "cond");

        let symbolTableCopy: Map<string, number> = this.symbolTable.getCopy();

        let allChangedVars: Set<string> = new Set<string>();
        let changedVars: Set<string>;
        let trueBranchSymbolTable: Map<string, number>;
        let falseBranchSymbolTable: Map<string, number>;

        let trueBranchNodeId: number = this.graph.addVertex(VertexType.Branch, {type: true});
        let falseBranchNodeId: number = this.graph.addVertex(VertexType.Branch, {type: false});
        let mergeNodeId: number = this.graph.addVertex(VertexType.Merge, {ifId: ifNodeId});

        this.nextControl(trueBranchNodeId);
        changedVars = this.processIfBlock(ifStatement.thenStatement);
        changedVars.forEach((e : string) => { allChangedVars.add(e); });
        trueBranchSymbolTable = this.symbolTable.getCopy(changedVars);
        this.nextControl(mergeNodeId);

        this.controlVertex = ifNodeId;
        this.nextControl(falseBranchNodeId);

        if (ifStatement.elseStatement === undefined) {
            falseBranchSymbolTable = new Map<string, number>();
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

        this.nextControl(mergeNodeId);

        this.createPhiVertices(symbolTableCopy, trueBranchSymbolTable, falseBranchSymbolTable, ifNodeId);

        return allChangedVars;
    }

    private createPhiVertices(symbolTableCopy: Map<string, number>,
                              trueBranchSymbolTable: Map<string, number>,
                              falseBranchSymbolTable: Map<string, number>,
                              ifNodeId: number): void {
        symbolTableCopy.forEach((nodeId: number, varName: string) => {
            let trueBranchNodeId = trueBranchSymbolTable.get(varName);
            let falseBranchNodeId = falseBranchSymbolTable.get(varName);

            if (!(trueBranchNodeId) && !(falseBranchNodeId)) {
                // TODO: assert (remove after testing)
                if (nodeId !== this.symbolTable.getIdByName(varName)) {
                    throw new Error(`unexpected node id ${nodeId} in symbol table`);
                }
            }
            else {
                let phiNodeId: number = this.graph.addVertex(VertexType.Phi, {ifId: ifNodeId});
                if (trueBranchNodeId && falseBranchNodeId) {
                    this.graph.addEdge(trueBranchNodeId, phiNodeId, "true-assign");
                    this.graph.addEdge(falseBranchNodeId, phiNodeId, "false-assign");
                }
                else if (trueBranchNodeId) {
                    this.graph.addEdge(trueBranchNodeId, phiNodeId, "true-assign");
                    this.graph.addEdge(nodeId, phiNodeId, "false-assign");
                }
                else if (falseBranchNodeId) {
                    this.graph.addEdge(falseBranchNodeId, phiNodeId, "false-assign");
                    this.graph.addEdge(nodeId, phiNodeId, "true-assign");
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
                    let expressionResult: number = this.processExpressionStatement(statement as ts.ExpressionStatement);
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
        let currentFuncNodeId: number = this.functionsStack[0];
        let returnNodeId: number = this.graph.addVertex(VertexType.Return, {funcId: currentFuncNodeId});
        this.nextControl(returnNodeId);

        if (retStatement.expression !== undefined) {
            let expNodeId: number = this.processExpression(retStatement.expression);
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
            let expNodeId: number = this.processExpression(varDecl.initializer as ts.Expression);
            this.symbolTable.addSymbol(varName, expNodeId, false, true);
        }
        else {
            this.symbolTable.addSymbol(varName, 0, false, false);
        }
        
    }

    private processExpression(expression: ts.Expression): number {
        let expNodeId: number;
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

    private processNumericLiteral(numLiteral: ts.NumericLiteral): number {
        let value: number = Number(numLiteral.text);

        return this.constTable.getId(value);
    }

    private processStringLiteral(strLiteral: ts.StringLiteral): number {
        return this.constTable.getId(strLiteral.text);
    }

    private processTrueLiteral(trueLiteral: ts.TrueLiteral): number {
        return this.constTable.getId(true);
    }

    private processFalseLiteral(falseLiteral: ts.FalseLiteral): number {
        return this.constTable.getId(false);
    }

    private processPrefixUnaryExpression(prefixUnaryExpression: ts.PrefixUnaryExpression): number {
        let expNodeId: number = this.processExpression(prefixUnaryExpression.operand as ts.Expression);
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
        let operationNodeId: number = this.graph.addVertex(VertexType.UnaryOperation, {operation: unaryOperation});
        this.graph.addEdge(expNodeId, operationNodeId, "prefix");
        return operationNodeId;
    }

    private processBinaryExpression(binExpression: ts.BinaryExpression): number {
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

        let rightNodeId: number = this.processExpression(binExpression.right);
        if (isAssignOperation) {
            // for cases a variable that is already defined is being re-assigned
            let varName: string = (binExpression.left as any).escapedText;
            this.symbolTable.updateNodeId(varName, rightNodeId);
            return rightNodeId;
        }
        else {
            let leftNodeId: number = this.processExpression(binExpression.left);
            let operationNodeId: number = this.graph.addVertex(VertexType.BinaryOperation, {operation: binaryOperation});
            this.graph.addEdge(rightNodeId, operationNodeId, "right");
            this.graph.addEdge(leftNodeId, operationNodeId, "left");
            return operationNodeId;
        }
    }

    private processParenthesizedExpression(parenthesizedExpression: ts.ParenthesizedExpression): number {
        return this.processExpression(parenthesizedExpression.expression);
    }

    //for cases we use the identifier's value
    private processIdentifierExpression(identifierExpression: ts.Identifier): number {
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
