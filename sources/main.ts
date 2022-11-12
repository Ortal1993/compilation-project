import * as ts from "typescript";
import { Graph } from "./graph";
import { SymbolTable } from "./symbolTable";
import { VertexType, BinaryOperation, UnaryOperation } from "./types";


function processSourceFile(sourceFile: ts.SourceFile): void {
	sourceFile.statements.forEach(statement => {
		switch (statement.kind) {
			case ts.SyntaxKind.VariableStatement:
				processVariableStatement(statement as ts.VariableStatement);
				break;
			default:
				throw new Error(`not implemented`);
		}
	});
}

function processVariableStatement(varStatement: ts.VariableStatement): void {
	varStatement.forEachChild(child => {
		switch (child.kind) {
			case ts.SyntaxKind.VariableDeclarationList:
				processVariableDeclarationList(child as ts.VariableDeclarationList);
				break;
			default:
				throw new Error(`not implemented`);
		}
	});
}


function processVariableDeclarationList(varDeclList: ts.VariableDeclarationList): void {
	varDeclList.forEachChild(child => {
		switch (child.kind) {
			case ts.SyntaxKind.VariableDeclaration:
				processVariableDeclaration(child as ts.VariableDeclaration);
				break;
			default:
				throw new Error(`not implemented`);
		}
	});
}


function processVariableDeclaration(varDecl: ts.VariableDeclaration): void {
	let graph: Graph = Graph.getInstance();
	let symbolTable: SymbolTable = SymbolTable.getInstance();

	let varName: string = (varDecl.name as any).escapedText;
	let varNodeId: number = graph.addVertex(VertexType.Variable, {name: varName});
	let expNodeId: number = processExpression(varDecl.initializer as ts.Expression);
	
	graph.addEdge(expNodeId, varNodeId, "assign");
	symbolTable.add(varName, varNodeId);
}


function processExpression(expression: ts.Expression): number {
	let expNodeId: number;
	switch (expression.kind) {
		case ts.SyntaxKind.NumericLiteral:
			expNodeId = processNumericLiteral(expression as ts.NumericLiteral);
			break;
		case ts.SyntaxKind.BinaryExpression:
			expNodeId = processBinaryExpression(expression as ts.BinaryExpression);
			break;
		case ts.SyntaxKind.ParenthesizedExpression:
			expNodeId = processParenthesizedExpression(expression as ts.ParenthesizedExpression);
			break;
		case ts.SyntaxKind.PrefixUnaryExpression:
			expNodeId = processPrefixUnaryExpression(expression as ts.PrefixUnaryExpression);
			break;
		case ts.SyntaxKind.Identifier:
			expNodeId = processIdentifierExpression(expression as ts.Identifier);
			break;
		default:
			throw new Error(`not implemented`);
	}
	return expNodeId;
}

function processIdentifierExpression(identifierExpression: ts.Identifier): number {
	let symbolTable: SymbolTable = SymbolTable.getInstance();

	let varName: string = (identifierExpression as any).escapedText;
	return symbolTable.getIdByName(varName);
}

function processParenthesizedExpression(parenthesizedExpression: ts.ParenthesizedExpression): number {
	return processExpression(parenthesizedExpression.expression);
}

function processPrefixUnaryExpression(prefixUnaryExpression: ts.PrefixUnaryExpression): number {
	let graph: Graph = Graph.getInstance();

	let expNodeId: number = processExpression(prefixUnaryExpression.operand as ts.Expression);
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
	let operationNodeId: number = graph.addVertex(VertexType.UnaryOperation, {operation: unaryOperation});
	graph.addEdge(expNodeId, operationNodeId, "prefix");
	return operationNodeId;
}

function processBinaryExpression(binExpression: ts.BinaryExpression): number {
	let graph: Graph = Graph.getInstance();

	let rightNodeId: number = processExpression(binExpression.right);
	let leftNodeId: number = processExpression(binExpression.left);

	let binaryOperation: BinaryOperation;
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
		default:
			throw new Error(`not implemented`);
	}
	let operationNodeId: number = graph.addVertex(VertexType.BinaryOperation, {operation: binaryOperation});
	graph.addEdge(rightNodeId, operationNodeId, "right");
	graph.addEdge(leftNodeId, operationNodeId, "left");
	return operationNodeId;
}


function processNumericLiteral(numLiteral: ts.NumericLiteral): number {
	let graph: Graph = Graph.getInstance();

	let value: number = parseInt(numLiteral.text);//float??

	return graph.addVertex(VertexType.Const, {value: value});
}


function main(): void {
	const fileNames: string[] = process.argv.slice(2);
	const program = ts.createProgram(fileNames, {});
	let sourceFiles = program.getSourceFiles().filter(sf => !sf.isDeclarationFile);
	sourceFiles.forEach(sf => processSourceFile(sf));

	let graph: Graph = Graph.getInstance();
	graph.print(false, "output/graphData.txt");
}

main();
