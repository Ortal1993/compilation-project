import { NodeId, VertexType, BinaryOperation, UnaryOperation } from "./types";
import * as vertex from "./vertex";

export class Graph {
    private edges: Array<Edge>;
    private vertices: Map<NodeId, vertex.Vertex>;

    public constructor() {
        this.edges = new Array<Edge>();
        this.vertices = new Map<NodeId, vertex.Vertex>();
    }

    public getEdgesWithNegativeSource(): Array<Edge> {
        let edgesWithNegativeSource: Array<Edge> = new Array<Edge>();
        this.edges.forEach((edge: Edge) => {
            if (edge.srcId < 0) {
                edgesWithNegativeSource.push(edge);
            }
        });
        return edgesWithNegativeSource;
    }

    private checkVertexId(id: NodeId): void {
        if (!this.vertices.has(id) && id >= 0) {
            throw new Error(`Vertex with id ${id} does not exist`);
        }
    }

    public addEdge(srcId: NodeId, dstId: NodeId, label: string): void {
        this.checkVertexId(srcId);
        this.checkVertexId(dstId);

        let newEdge: Edge = new Edge(srcId, dstId, label);
        this.edges.push(newEdge);
    }

    public addVertex(vertexType: VertexType, properties: Object = {}): NodeId {
        let newVertex: vertex.Vertex;
        switch (vertexType) {
            case VertexType.Const:
                newVertex = new vertex.ConstVertex(properties["value"]);
                break;
            case VertexType.Parameter:
                newVertex = new vertex.ParameterVertex(properties["pos"], properties["funcId"]);
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
                newVertex = new vertex.PhiVertex(properties["mergeId"]);
                break;
            case VertexType.Start:
                newVertex = new vertex.StartVertex(properties["name"]);
                break;
            case VertexType.Call:
                newVertex = new vertex.CallVertex();
                break;
            case VertexType.New:
                newVertex = new vertex.NewVertex(properties["name"]);
                break;
            case VertexType.Dummy:
                newVertex = new vertex.DummyVertex();
                break;
            case VertexType.While:
                newVertex = new vertex.WhileVertex();
                break;
            case VertexType.Merge:
                newVertex = new vertex.MergeVertex(properties["branchOriginId"]);
                break;
            case VertexType.Return:
                newVertex = new vertex.ReturnVertex(properties["funcId"]);
                break;
            case VertexType.Continue:
                newVertex = new vertex.ContinueVertex();
                break;
            case VertexType.Break:
                newVertex = new vertex.BreakVertex();
                break;
            case VertexType.Load:
                newVertex = new vertex.LoadVertex(properties["property"]);
                break;
            case VertexType.Store:
                newVertex = new vertex.StoreVertex(properties["property"]);
                break;
            default:
                throw new Error(`Undefined vertex type`);
        }
        this.vertices.set(newVertex.id, newVertex);
        return newVertex.id;
    }

    public getVertexById(nodeId: NodeId): vertex.Vertex {
        if (!this.vertices.has(nodeId)) {
            throw new Error(`Vertex with node id ${nodeId} does not exist`);
        }
        return this.vertices.get(nodeId) as vertex.Vertex;
    }

    public print(humanFormat: boolean = false, filename: string | null = null): void {
        let content: string = "";
        if (humanFormat) {
            this.edges.forEach(edge => {content += `source: ${edge.srcId}, dest: ${edge.dstId}, label: ${edge.label}`});
            this.vertices.forEach(vertex => {content += `id: ${vertex.id}`});
        }
        else {
            content = "digraph G {\n";
            this.vertices.forEach(vertex => {
                content += `\t${vertex.id} [ label="${vertex.getLabel()}" shape="rectangle" ];\n`
            });
            this.edges.forEach(edge => {
                content += `\t${edge.srcId} -> ${edge.dstId} [ label="${edge.label}" ];\n`
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

export class Edge {
    public srcId: NodeId;
    public dstId: NodeId;
    public label: string;

    public constructor(_srcId: NodeId, _dstId: NodeId, _label: string) {
        this.srcId = _srcId;
        this.dstId = _dstId;
        this.label = _label;
    }
}
