import { Graph } from "./graph";
import { NodeId, VertexType } from "./types";

export class ConstTable {
    private constTable: Map<unknown, NodeId>;
    private graph: Graph;

    public constructor(_graph: Graph) {
        this.constTable = new Map<unknown, NodeId>;
        this.graph = _graph;
    }

    public getNodeId(constVal: unknown): NodeId {
        if (!this.constTable.has(constVal)) {
            let nodeId: NodeId = this.graph.addVertex(VertexType.Const, {value: constVal});
            this.constTable.set(constVal, nodeId);
            return nodeId;
        }
        return this.constTable.get(constVal) as NodeId;
    }
}
