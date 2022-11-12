import { VertexType, BinaryOperation, UnaryOperation } from "./types";
import * as vertex from "./vertex";

export class Graph {
	private static instance: Graph;
	private edges: Edge[];
    private vertices: Map<number, vertex.Vertex>;

	private constructor() {
		this.edges = [];
        this.vertices = new Map<number, vertex.Vertex>();
	}

	public static getInstance(): Graph {
        if (!Graph.instance) {
            Graph.instance = new Graph();
        }
        return Graph.instance;
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

    public addVertex(vertexType: VertexType, properties: Object): number {
        let newVertex: vertex.Vertex;
        switch (vertexType) {
            case VertexType.Const:
                newVertex = new vertex.ConstVertex(properties["value"]);
                break;
            case VertexType.Variable:
                newVertex = new vertex.VariableVertex(properties["name"]);
                break;
            case VertexType.BinaryOperation:
                newVertex = new vertex.BinaryOperationVertex(properties["operation"]);
                break;
            case VertexType.UnaryOperation:
                newVertex = new vertex.UnaryOperationVertex(properties["operation"]);
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




