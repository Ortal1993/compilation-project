import { Graph } from "./graph";
import { VertexType } from "./types";

export class ConstTable {
    private constTable: Map<unknown, number>;
    private graph: Graph;

    public constructor(_graph: Graph) {
        this.constTable = new Map<unknown, number>;
        this.graph = _graph;
    }

    public getId(constVal: unknown): number {
        if (!this.constTable.has(constVal)) {
            let nodeId: number = this.graph.addVertex(VertexType.Const, {value: constVal});
            this.constTable.set(constVal, nodeId);
            return nodeId;
        }
        return this.constTable.get(constVal) as number;
    }
}
