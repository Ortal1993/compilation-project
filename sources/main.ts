import * as ts from "typescript";
import { Graph } from "./graph";
import { SymbolTable } from "./symbolTable";
import { VertexType, BinaryOperation, UnaryOperation } from "./types";

class Analyzer {
	private output: string;
	private fileNames: string[];
	private graph: Graph;
	private symbolTable: SymbolTable;

	public constructor( _output: string, _filesNames: string[]) {
		this.output = _output;
		this.fileNames = _filesNames;
		this.graph = new Graph();
		this.symbolTable = new SymbolTable();
	}

	public run() {
		this.createGraph()
	}

	private createGraph() {
		const program = ts.createProgram(this.fileNames, {});
		let sourceFiles = program.getSourceFiles().filter(sf => !sf.isDeclarationFile);
		sourceFiles.forEach(sf => this.processSourceFile(sf));
		this.graph.print(false, this.output);
	}

	private processSourceFile(sourceFile: ts.SourceFile): void {
		sourceFile.statements.forEach(statement => {
			switch (statement.kind) {
				case ts.SyntaxKind.VariableStatement:
					this.processVariableStatement(statement as ts.VariableStatement);
					break;
				case ts.SyntaxKind.ExpressionStatement:
					this.processExpressionStatement(statement as ts.ExpressionStatement);
					break;
				default:
					throw new Error(`not implemented`);
			}
		});
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

	private processExpressionStatement(expStatement: ts.ExpressionStatement) {
		expStatement.forEachChild(child => {
			switch (child.kind) {
				case ts.SyntaxKind.BinaryExpression:
					this.processBinaryExpression(child as ts.BinaryExpression);
					break;
				default:
					throw new Error(`not implemented`);
			}
		});
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
		let varNodeId: number = this.graph.addVertex(VertexType.Variable, {name: varName});

		if (varDecl.initializer !== undefined) {
			let expNodeId: number = this.processExpression(varDecl.initializer as ts.Expression);
			this.graph.addEdge(expNodeId, varNodeId, "assign");
		}

		this.symbolTable.set(varName, varNodeId);
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
			default:
				throw new Error(`not implemented`);
		}
		return expNodeId;
	}

	private processNumericLiteral(numLiteral: ts.NumericLiteral): number {
		let value: number = Number(numLiteral.text);

		return this.graph.addVertex(VertexType.Const, {value: value});
	}

	private processStringLiteral(strLiteral: ts.StringLiteral): number {
		return this.graph.addVertex(VertexType.Const, {value: strLiteral.text});
	}

	private processTrueLiteral(trueLiteral: ts.TrueLiteral): number {
		return this.graph.addVertex(VertexType.Const, {value: true});
	}

	private processFalseLiteral(falseLiteral: ts.FalseLiteral): number {
		return this.graph.addVertex(VertexType.Const, {value: false});
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
				binaryOperation = BinaryOperation.ExclamationEqual;
				break;
			case ts.SyntaxKind.EqualsEqualsEqualsToken:
				binaryOperation = BinaryOperation.EqualEqualEqual;
				break;
			case ts.SyntaxKind.ExclamationEqualsEqualsToken:
				binaryOperation = BinaryOperation.ExclamationEqualEqual;
				break;
			default:
				throw new Error(`not implemented`);
		}

		let rightNodeId: number = this.processExpression(binExpression.right);
		if (isAssignOperation) {
			console.log("isAssignOperation")
			let leftNodeId: number = this.processIdentifierExpression(binExpression.left as ts.Identifier, true);
			this.graph.addEdge(rightNodeId, leftNodeId, "assign");
			return leftNodeId;
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

	private processIdentifierExpression(identifierExpression: ts.Identifier, createNewNode: boolean = false): number {
		console.log("processIdentifierExpression")
		let varName: string = (identifierExpression as any).escapedText;
		this.symbolTable.checkExists(varName);

		if (createNewNode) {
			let newNodeId: number = this.graph.addVertex(VertexType.Variable, {name: varName});
			this.symbolTable.set(varName, newNodeId);
			return newNodeId;
		}
		return this.symbolTable.getIdByName(varName);
	}
}

function main() {
	const output: string = process.argv[2]
	const fileNames: string[] = process.argv.slice(3);
	let analyzer: Analyzer = new Analyzer(output, fileNames);
	analyzer.run();
}

main();
