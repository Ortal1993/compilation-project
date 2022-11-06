import * as ts from "typescript";
import { Graph, VertexType } from "./graph";


function processSourceFile(sourceFile: ts.SourceFile) {
	sourceFile.statements.forEach(statement => {
		switch (statement.kind) {
			case ts.SyntaxKind.FirstStatement:
				processFirstStatement(statement);
				// statement.forEachChild(child => { console.log(ts.SyntaxKind[child.kind]) });
				break;
			default:
				break;
		}
	});
}


function processFirstStatement(statement: ts.Statement) {
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


function processVariableDeclarationList(varDeclList: ts.VariableDeclarationList) {
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


function processVariableDeclaration(varDecl: ts.VariableDeclaration) {
	// let varName = varDecl.name as ts.Identifier;
	// console.log(varName.escapedText);

	let varName: string = (varDecl.name as any).escapedText;
	let value: number = (varDecl.initializer as any).text as number;

	let graph: Graph = Graph.getInstance();
	let varNodeId: number = graph.addVertex(VertexType.Variable, {name: varName});
	let numberNodeId: number = processNumber(value)
	graph.addEdge(numberNodeId, varNodeId, "assign");
}


function processNumber(num: number) {
	let graph: Graph = Graph.getInstance();
	return graph.addVertex(VertexType.Const, {value: num});
}


function main(): void {
	const fileNames: string[] = process.argv.slice(2);
	const program = ts.createProgram(fileNames, {});
	let sourceFiles = program.getSourceFiles().filter(sf => !sf.isDeclarationFile);
	sourceFiles.forEach(sf => processSourceFile(sf));

	let graph: Graph = Graph.getInstance();
	graph.print(false, "output/graphData.txt");

    // let id_1 = graph.addVertex(VertexType.Const, {value: 9});
    // let id_2 = graph.addVertex(VertexType.Variable, {name: "x"});
    // graph.addEdge(id_1, id_2, "test");
}

main();
