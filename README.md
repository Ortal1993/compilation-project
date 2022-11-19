# Typescript Analyzer

## Install

```bash
npm install
```

## Build & Run

Build the project into the *build* directory.

If a sample argument is given, run it on this sample.

A graph file corresponding to the sample is written to the *output* directory.

```
npm run start -- [options]

options:
    -n | --no-build
        Skip build stage
    -s | --sample SAMPLE
        Run the analyzer on sample with index <SAMPLE> (default: do not run anything)
    -g | --graph-output GRAPH_OUTPUT
        Save the graph inside file named <GRAPH_OUTPUT> (default: graph.txt)
    -v | --verbose
        Print logs and output results
    -c | --clean
        Before building, remove build and output directories
    -h | --help
        Shows usage command 
```

* Samples can be found in *tests/samples* directory.
* In order to see the visual graph, insert the output graph file into this site: [Graph Visualizer](https://dreampuf.github.io/GraphvizOnline/)

For example, running:

```bash
npm run start -- --sample 2 --verbose
```

will build the project, run it on the second sample in the samples directory and eventually print the graph.

## TODO

* [ ] Create a constant table
* [ ] Support recursive and complex if statements
* [ ] Support while statements
* [ ] Support function declarations
* [ ] Support function calls