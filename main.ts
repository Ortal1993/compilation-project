import * as ts from "typescript";
import { Graph, VertexType, BinaryOperation } from "./graph";


function processSourceFile(sourceFile: ts.SourceFile): void {
	sourceFile.statements.forEach(statement => {
		switch (statement.kind) {
			case ts.SyntaxKind.FirstStatement:
				processFirstStatement(statement);
				break;
			default:
				break;
		}
	});
}


function processFirstStatement(statement: ts.Statement): void {
	statement.forEachChild(child => {
		switch (child.kind) {
			case ts.SyntaxKind.VariableDeclarationList:
				processVariableDeclarationList(child as ts.VariableDeclarationList);
				break;
			default:
				break;
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
				break;
		}
	});
}


function processVariableDeclaration(varDecl: ts.VariableDeclaration): void {
	let graph: Graph = Graph.getInstance();

	let varName: string = (varDecl.name as any).escapedText;
	let varNodeId: number = graph.addVertex(VertexType.Variable, {name: varName});
	let expNodeId: number = processExpression(varDecl.initializer);

	graph.addEdge(expNodeId, varNodeId, "assign");
}


function processExpression(expression: ts.Expression): number {
	let expNodeId: number;
	switch (expression.kind) {
		case ts.SyntaxKind.FirstLiteralToken:
			expNodeId = processConst(expression);
			break;
		case ts.SyntaxKind.BinaryExpression:
			expNodeId = processBinaryExpression(expression);
			break;
		default:
			break;
	}
	return expNodeId;
}


function processBinaryExpression(expression: ts.Expression): number {
	let graph: Graph = Graph.getInstance();

	let rightNodeId: number = processExpression((expression as ts.BinaryExpression).right);
	let leftNodeId: number = processExpression((expression as ts.BinaryExpression).left);

	let operation = (expression as ts.BinaryExpression).operatorToken;
	let binaryOperation: BinaryOperation;
	switch (operation.kind) {
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
			break;
	}
	let operationNodeId: number = graph.addVertex(VertexType.BinaryOperation, {operation: binaryOperation});
	graph.addEdge(rightNodeId, operationNodeId, "right");
	graph.addEdge(leftNodeId, operationNodeId, "left");
	return operationNodeId;
}


function processConst(expression: ts.Expression): number {
	let graph: Graph = Graph.getInstance();

	let value: number = (expression as any).text as number;

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
