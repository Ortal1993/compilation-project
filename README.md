# Typescript Analyzer

## Install

```
npm install
```

## Build & Run

Build the project into the *build* directory.

If a sample argument is given, build the graph for this sample.

A graph file corresponding to the sample is written to the *output* directory.

If the analysis argument was given, run the analysis on the graph.

```
Usage: npm run start -- [options]

options:
    -h, --help
        Show this help message and exit
    -n, --no-build
        Skip build project stage
    -s SAMPLE [SAMPLE ...], --sample SAMPLE [SAMPLE ...]
        Build the graph for the sample with index <SAMPLE> (default: do not build the graph)
    -i INPUT [INPUT ...], --input INPUT [INPUT ...]
        Build the graph for the input file named <INPUT> (default: do not build the graph)
    -g GRAPH_NAME, --graph-output GRAPH_NAME
        Save the graph inside file named <GRAPH_NAME> (default: graph.txt)
    -a {array_size}, --analyze {array_size}
        Run analysis on the graph
    -v, --verbose
        Print logs and output results
    -c, --clean
        Before building the project, remove the build and output directories

```

* Samples can be found in *tests/samples* and *tests/analysis_samples* directory.
* In order to see the visual graph, insert the output graph file into this site: [Graph Visualizer](https://dreampuf.github.io/GraphvizOnline/)

For example, running:

```
npm run start -- --sample 2 --verbose
```

will build the project, build the graph for the second sample in the samples directory and eventually print the output directory path.

## Test

Build the project and build a graph for each of the samples in the *tests/samples* directory. Then compare each of the output graphs to its matching golden graph, which are located in the *tests/goldens* directory.

```
npm run test
```
