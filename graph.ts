class Graph {
	private static instance: Graph;
	private edges: Edge[];
    private vertices: Vertex[]; // TODO: maybe we should convert it to map of id->vertexObj

	private constructor() {
		this.edges = [];
        this.vertices = [];
	}

	public static getInstance(): Graph {
        if (!Graph.instance) {
            Graph.instance = new Graph();
        }
        return Graph.instance;
    }

    private checkVertexExists(id: number): void {
        let exists: boolean = false;
        for (vertex of this.vertices) {
            if (vertex.id === id) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            throw new Error(`Vertex with id ${id} does not exist`);
        }
    }

    public addEdge(srcId: number, dstId: number, type: string) {
        this.checkVertexExists(srcId);
        this.checkVertexExists(dstId);

        edge: Edge = new Edge(srcId, dstId, type);
        this.edges.push(edge);
    }

    public addVertex(vertexType: VertexType) {
        // TODO
    }
}


enum VertexType {
    Const,
    Variable,
    BinaryOperation
    // TODO: add also control vertices types
}


class Edge {
	private srcId: number;
	private dstId: number;
	private type: string;

	public constructor(_srcId: number, _dstId: number, _type: string) {
		this.srcId = _srcId;
		this.dstId = _dstId;
		this.type = _type;
	}
}


class Vertex {
    private static next_id: number = 0;
    public id: number;

    constructor() {
        this.id = Vertex.next_id++;
    }

    public static getCount(): number {
        return Vertex.next_id;
    }
}


class DataVertex extends Vertex {
    constructor() {
        super();
    }
}


class ControlVertex extends Vertex {
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
}


class VariableVertex extends DataVertex {
    public name: string;

    constructor(_value: string) {
        super();
        this.name = _name;
    }
}


enum BinaryOperation {
    Add,
    Sub,
    Mul,
    Div
}


class BinaryOperationVertex extends DataVertex {
    public operation: BinaryOperation;

    constructor(_operation: BinaryOperation) {
        super();
        this.operation = _operation;
    }
}


class SymbolTable {
    // mapping from symbols names to vertices IDs
	private symbolTable: Map;

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
        return this.symbolTable.get(name);
    }
}
