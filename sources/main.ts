import { exportGraph } from "./outputManager";
import { GraphBuilder } from "./graphBuilder";

function main() {
    const output: string = process.argv[2]
    const sourceName: string = process.argv[3];
    let graphBuilder: GraphBuilder = new GraphBuilder(output, sourceName);
    graphBuilder.run();
    exportGraph(graphBuilder.getGraph());
}

main();
