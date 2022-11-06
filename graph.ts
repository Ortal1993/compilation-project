export class Graph {
	private static instance: Graph;
	private edges: Edge[];
    private vertices: Map<number, Vertex>;

	private constructor() {
		this.edges = [];
        this.vertices = new Map<number, Vertex>();
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
        let newVertex: Vertex;
        switch (vertexType) {
            case VertexType.Const:
                newVertex = new ConstVertex(properties["value"]);
                break;
            case VertexType.Variable:
                newVertex = new VariableVertex(properties["name"]);
                break;
            case VertexType.BinaryOperation:
                newVertex = new BinaryOperationVertex(properties["operation"]);
                break;
            default:
                throw new Error(`Undefined vertex type`);
        }
        this.vertices.set(newVertex.id, newVertex);
        return newVertex.id;
    }

    public print(humanFormat = false, filename = null): void {
		let content: string = "";
		if (humanFormat) {
			this.edges.forEach(edge => {content += `source: ${edge.srcId}, dest: ${edge.dstId}, type: ${edge.type}`});
	        this.vertices.forEach(vertex => {content += `id: ${vertex.id}`});
		}
		else {
			content = "digraph G {\n";
			this.vertices.forEach(vertex => { content += `\t${vertex.id} [ label="${vertex.getLabel()}" shape="rectangle" ];\n`});
	        this.edges.forEach(edge => { content += `\t${edge.srcId} -> ${edge.dstId} [ label="${edge.type}" ];\n`});
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


export enum VertexType {
    Const,
    Variable,
    BinaryOperation
    // TODO: add also control vertices types
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


abstract class Vertex {
    private static next_id: number = 0;
    public id: number;

    constructor() {
        this.id = Vertex.next_id++;
    }

    public static getCount(): number {
        return Vertex.next_id;
    }

	abstract getLabel(): string;
}


abstract class DataVertex extends Vertex {
    constructor() {
        super();
    }
}


abstract class ControlVertex extends Vertex {
    constructor() {
        super();
    }
}


class ConstVertex extends DataVertex {
    public value: unknown;

    constructor(_value: unknown) {
        super();
        this.value = _value;
    }

    public getLabel(): string {
        return this.value as string;
    }
}


class VariableVertex extends DataVertex {
    public name: string;

    constructor(_name: string) {
        super();
        this.name = _name;
    }

    public getLabel(): string {
        return this.name;
    }
}


enum BinaryOperation {
    Add,
    Sub,
    Mul,
    Div
}


export class BinaryOperationVertex extends DataVertex {
    public operation: BinaryOperation;

    constructor(_operation: BinaryOperation) {
        super();
        this.operation = _operation;
    }

    public getLabel(): string {
        switch(this.operation) {
            case BinaryOperation.Add:
                return "+";
            case BinaryOperation.Div:
                return "/";
            case BinaryOperation.Mul:
                return "*";
            case BinaryOperation.Sub:
                return "-";
            default:
                throw new Error(`Undefined vertex lable`);
        }
    }
}


class SymbolTable {
    // mapping from symbols names to vertices IDs
	private symbolTable: Map<string, number>;

    public constructor() {
        this.symbolTable = new Map();
    }

    public add(name: string, id: number): void {
        if (this.symbolTable.has(name)) {
            throw new Error(`Symbol '${name}' already exists in the symbol table`);
        }
        this.symbolTable.set(name, id);
    }

    public getIdByName(name: string): number {
        if (!this.symbolTable.has(name)) {
            throw new Error(`Symbol '${name}' does not exist in the symbol table`);
        }
        return this.symbolTable.get(name) as number;
    }
}
