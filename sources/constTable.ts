import { Graph } from "./graph";
import { NodeId, VertexType } from "./types";

export class ConstTable {
    private constTable: Map<unknown, NodeId>;
    private graph: Graph;

    public constructor(_graph: Graph) {
        this.constTable = new Map<unknown, NodeId>;
        this.graph = _graph;
    }

    public getNodeId(constVal: unknown, isSymbol: boolean = false): NodeId {
        if (isSymbol) {
            constVal = '#' + (constVal as string);
        }
        if (!this.constTable.has(constVal)) {
            let nodeId: NodeId;
            if (isSymbol) {
                nodeId = this.graph.addVertex(VertexType.Symbol, {name: constVal as string});
            }
            else {
                nodeId = this.graph.addVertex(VertexType.Const, {value: constVal});
            }
            this.constTable.set(constVal, nodeId);
            return nodeId;
        }
        return this.constTable.get(constVal) as NodeId;
    }
}
