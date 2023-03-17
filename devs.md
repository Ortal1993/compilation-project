# 1. Introduction

TypeScript, which is a syntactic superset of JavaScript, is transpiled to JavaScript using a compiler. The TypeScript compiler performs type checking during compilation, but it makes permissive assumptions about the types of objects in the source code.

To ensure typing correctness during compilation, we want to run analysis over the source code. These analysis would check **TODO**.

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
* Branching
  * If, Else and Else-If statements
  * Loops
    * While statements
    * Break statements*
    * Continue statements*
* Functions
  * Functions Calling
  * Parameters
  * Return statements
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

# 3. GraphBuilder Class

The graph builder uses the generated AST of the TypeScript compiler. It traverses the AST, starting with the root node, and creates the vertices and the edges of the graph according to the type of the traversed node.

In general, the graph consists of two main types of vertices: data and control. Data vertices represent literal expressions, expression, functions parameters, operators and symbol names. Control vertices represent functions entry points, return statements, method callings, branches, loops and object property access actions.

Also, there are two main types of edges: data and control. Data edges connect between pairs of data vertices (e.g. to create complex expressions) and between data vertices and control vertices (e.g. to support functions calls with data arguments).

Association edges are a third type of edges which provide semantic 	associations between vertices in the graph. For example, association edges connect functions entry points with their parameters vertices, and merge vertices with branching vertices (like “if” and “while” vertices).

The graph builder maintains symbol table and other data members that **TODO**.

## Implementation Details

### Branching

**TODO**

# 4. Analyzer

**TODO**
