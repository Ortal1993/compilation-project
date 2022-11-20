import { VertexType, BinaryOperation, UnaryOperation } from "./types";
import * as vertex from "./vertex";

export class Graph {
	private edges: Edge[];
	private vertices: Map<number, vertex.Vertex>;

	public constructor() {
		this.edges = [];
		this.vertices = new Map<number, vertex.Vertex>();
	}

	private checkVertexExists(id: number): void {
		if (!this.vertices.has(id)) {
			throw new Error(`Vertex with id ${id} does not exist`);
		}
	}

	public addEdge(srcId: number, dstId: number, type: string): void {
		this.checkVertexExists(srcId);
		this.checkVertexExists(dstId);

		let newEdge: Edge = new Edge(srcId, dstId, type);
		this.edges.push(newEdge);
	}

	public addVertex(vertexType: VertexType, properties: Object = {}): number {
		let newVertex: vertex.Vertex;
		switch (vertexType) {
			case VertexType.Const:
				newVertex = new vertex.ConstVertex(properties["value"]);
				break;
			case VertexType.Variable:
				newVertex = new vertex.VariableVertex(properties["name"]);
				break;
			case VertexType.Parameter:
				newVertex = new vertex.ParameterVertex(properties["name"], properties["pos"], properties["funcId"]);
				break;
			case VertexType.BinaryOperation:
				newVertex = new vertex.BinaryOperationVertex(properties["operation"]);
				break;
			case VertexType.UnaryOperation:
				newVertex = new vertex.UnaryOperationVertex(properties["operation"]);
				break;
			case VertexType.If:
				newVertex = new vertex.IfVertex();
				break;
			case VertexType.Phi:
				newVertex = new vertex.PhiVertex(properties["name"], properties["ifId"]);
				break;
			case VertexType.Start:
				newVertex = new vertex.StartVertex(properties["name"]);
				break;
			case VertexType.Call:
				newVertex = new vertex.CallVertex();
				break;
			case VertexType.Branch:
				newVertex = new vertex.BranchVertex(properties["type"]);
				break;
			case VertexType.Merge:
				newVertex = new vertex.MergeVertex(properties["ifId"]);
				break;
			case VertexType.Return:
				newVertex = new vertex.ReturnVertex();
				break;
			default:
				throw new Error(`Undefined vertex type`);
		}
		this.vertices.set(newVertex.id, newVertex);
		return newVertex.id;
	}

	public print(humanFormat: boolean = false, filename: string | null = null): void {
		let content: string = "";
		if (humanFormat) {
			this.edges.forEach(edge => {content += `source: ${edge.srcId}, dest: ${edge.dstId}, type: ${edge.type}`});
			this.vertices.forEach(vertex => {content += `id: ${vertex.id}`});
		}
		else {
			content = "digraph G {\n";
			this.vertices.forEach(vertex => {
				content += `\t${vertex.id} [ label="${vertex.getLabel()}" shape="rectangle" ];\n`
			});
			this.edges.forEach(edge => {
				content += `\t${edge.srcId} -> ${edge.dstId} [ label="${edge.type}" ];\n`
			});
			content += "}\n";
		}
		if (filename) {
			const fs = require('fs');
			fs.writeFile(filename, content, err => {
				if (err) {
					console.error(err);
				}
			});
		}
		else {
			console.log(content);
		}
	}
}

class Edge {
	public srcId: number;
	public dstId: number;
	public type: string;

	public constructor(_srcId: number, _dstId: number, _type: string) {
		this.srcId = _srcId;
		this.dstId = _dstId;
		this.type = _type;
	}
}
