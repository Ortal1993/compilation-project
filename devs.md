# 1. Introduction

TypeScript, which is a syntactic superset of JavaScript, is transpiled to JavaScript using a compiler. The TypeScript compiler performs type checking during compilation, but it makes permissive assumptions about the types of objects in the source code.

To ensure typing correctness during compilation, we want to run analysis over the source code. These analysis will check various issues in the code and will determine if the code is "safe", regards those issues. For example, one such issue is type conformance.

The whole analysis process consists of two main stages. First, we build a graph representing the source code, using the generated AST of the TypeScript compiler. The graph is an IR of the source code and consists of data and control vertices and edges. Then, we run the analyzer on the graph, using souffle engine.

Overall, the running flow is described by the diagram below:

![typescript-analyzer-flow](https://user-images.githubusercontent.com/91371837/225950491-e3ecdbb4-0555-4f28-aea0-5814192658b1.png)

# 2. Supported Syntax

* Literals
  * Numbers
  * Booleans
  * Strings
* Expressions
  * Arithmetical Expressions
  * Boolean Expressions
  * Recursive Expressions (Parenthesis)
* Variables
  * Declarations
  * Definitions
  * Assignments
  * Shadowing
* Branching
  * If, Else and Else-If statements
  * Loops
    * While Statements
    * Break Statements*
    * Continue Statements*
* Functions
  * Functions Calling
  * Parameters
  * Return Statements
  * Anonymous Functions
* Objects
  * Definition
  * Property Access (load and store)
  * Methods
* Lists
  * Definition
  * Property Access (load and store)
* Classes
  * Constructor
  * Methods
  * Members

**Notes:**
* Break and continue statements are not fully functional. Their processing methods in the GraphBuilder do not create any phi-edges.

# 3. GraphBuilder

The graph builder uses the generated AST of the TypeScript compiler. It traverses the AST, starting with the root node, and creates the vertices and the edges of the graph according to the type of the traversed node.

In general, the graph consists of two main types of vertices: data and control. Data vertices represent literal expressions, expression, functions parameters, operators and symbol names. Control vertices represent functions entry points, return statements, method callings, branches, loops and object property access actions.

Also, there are two main types of edges: data and control. Data edges connect between pairs of data vertices (e.g. to create complex expressions) and between data vertices and control vertices (e.g. to support functions calls with data arguments).

Association edges are a third type of edges which provide semantic 	associations between vertices in the graph. For example, association edges connect functions entry points with their parameters vertices, and merge vertices with branching vertices (like “if” and “while” vertices).

The graph builder maintains symbol table and other data members, which their purpose is to save and track as much semantic information as possible. Using this data, we can insert the semantic information into the graph (like association edges).

## Implementation Details

### Branching

The symbol table is essentially a mapping between variables names and the ID of their corresponding nodes in the graph.

‘if’ and ‘while’ block should not be processed just like any other block, and that’s because at most cases, during compile time, we can’t know if these blocks will get executed during run time (and how many times in case of ‘while’ block).

If a variable was defined before an ‘if’ statement, and was changed during the ‘if’ block, we want to save both values in the graph. For that, we use phi vertices which represent the possible values of a variable after processing the ‘if’ block.

Processing ‘while’ statements is done using backpatching. Let's consider the following code:

```
let x: number = 0;    // definition
while (...) {
    func(x);          // use
    x = 1;            // reassignment
}
```

In this block a variable is defined before a ‘while’ statement, then is used during the ‘while’ block and then reassigned during the ‘while’ block. The used value can be one of both: the value of the variable before executing the block (x = 0) and the value of the variable after reassigning it during the block (x = 1). But when processing the 'use' statement, we can't know which node should represent the value of the variable. That's because we haven't processed yet the reassignment statement, and even don't know if such exists later on in the 'while' block. The solution would be backpatching: if we don’t know which node to use, we create a phi vertex after processing the ‘while’ block and patch the nodes of the ‘use’ statements accordingly.

Branching of ‘if’ statements is implemented as follows:

1.	Before processing any of the branch blocks (that is, the block of the statement), a snapshot of the current symbol table is saved for later use.
2.	The true-branch block is processed as usual.
3.	The current symbol table is compared against the symbol table we saved before. If the nodes for any variable differ, that means the value of the variable was changed during the true-branch block. The new node ID is saved in a new mapping, which indicates which variables were changed during the true-branch block. Finally, the symbol table is retrieved from the saved snapshot.
4.	Now the symbol table looks like the true-branch block was never processed, and we can process the false-branch (if exists) as usual.
5.	Again, the current symbol table is compared against the symbol table we saved before, and the new node ID of each variable is saved in a new mapping.
6.	Phi vertices are created using the mappings we defined while comparing the symbol tables. The symbol table is updated using the ID’s of these vertices.

Branching of ‘while’ statements is implemented as follows:

1.	A snapshot of the symbol table is saved.
2.	We assign a new node ID to each variable in the current symbol table. This ID is a unique negative value. If a variable was used during the ‘while’ block and then was reassigned, we would have an edge with negative source node ID in the graph and the node ID in the symbol table would be a positive number (which is not equal to the original node ID).
3.	The true-branch block is processed as usual.
4.	The current symbol table is compared against the symbol table we saved before to check which variables were reassigned during the ‘while’ block.
5.	The symbol table must be retrieved from the saved snapshot, because there still might be negative values (indicating of variables which were not reassigned during the ‘while’ block).
6.	Phi vertices are created using the mapping we defined while comparing the symbol tables, and the symbol table is updated accordingly.
7.	Back patching: for each edge with negative source node ID, change the source node ID to be the current node ID of the corresponding variable (using the symbol table). This node ID might be an ID of a phi vertex but it also might be the ID of the original variable node.

### Functions Declaration and Definition Processing

In Typescript it is possible to call a function before it was even declared. In order to deal with it, we first went through all the statements in the current block and processed only function signatures by creating a symbol vertex (which represents the function) in the graph for each function and saving their names (and the ID of the their symbol vertex) in the symbol table. After processing the block again, every function call can be resolved using the corresponding entry in the symbol table.

Also, in TypeScript it is possible that a function definition uses variables that are declared after the function definition. In order to deal with it, we process function blocks (the definition itself) only after processing the block at which the function is defined.

# 4. Analyzer

In general, classic analysis are done by deducing properties of vertices using the properties of their parents vertices. That is, we can define rules which determine the properties of nodes by examining the properties of their parents. A logic language fits this pattern, and this is why we analyse the graph using souffle, which is a logic programming language, and is based on the Datalog language. Souffle also provides an engine to run the analysis on the defined rules.

We implemented three types of analysis as a 'proof of concept':

## 1. "Dead Code" Analysis

The analysis marks every control/data vertex which is unreachable. For example, a function call which appears after return statement would result in unreachable call vertex, or an expression which its value is never used.

**Note:** This analysis is very basic and doesn't cover all the possible cases. For example, let's consider the following code:

```
while (<cond>) {
    ...
}
func();
```

If <cond> is a simple boolean value like 'true', the analysis should mark the func() call as unreachable. But if <cond> is a function call, then we should first try to analyse the return value of this function, and then determine whether the func() call is reachable.

## 2. "Points To" Analysis

This analysis should track all the different objects and variables that point to the same object.
 
**Note:** We implemented a basic version of the analysis as this type of analysis is pretty complicated.

## 3. "Tracking Array/List Sizes" Analysis

This analysis tracks the changing of array/list size inside functions. The analysis report contains the deltas for each control node, and the final delta for each array parameter is summarized for each function. If a size of an array at some point cannot be determined (for example, it can have more than one value), its delta value is considered to be top (which is marked with 'T').

**Notes:**
1. As of now, only arrays parameters are tracked (which means local arrays variables are not tracked).
2. Also, We assume all of the parameters are all arrays. That's because we haven't saved any typing information in the graph itself, and that's why we can't distinguish between types of parameters.
