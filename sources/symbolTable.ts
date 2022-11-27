class Entry {
    private nodeId: number;
    private func: boolean;
    private init: boolean;

    public constructor(_nodeId: number, _func: boolean, _init: boolean) {
        this.nodeId = _nodeId;
        this.func = _func;
        this.init = _init;
    }

    public updateNodeId(newNodeId: number): void {
        this.nodeId = newNodeId;
    }

    public getNodeId(): number {
        return this.nodeId;
    }

    public isFunc(): boolean {
        return this.func;
    }

    public isInit(): boolean {
        return this.init;
    }
}

class Scope {
    public entries: Map<string, Entry>;

    public constructor() {
        this.entries = new Map<string, Entry>();
    }

    public getEntry(name: string): Entry {
        if (!this.isEntryExists(name)) {
            throw new Error(`Symbol '${name}' does not exist in the scope`);
        }
        return this.entries.get(name) as Entry;
    }

    public getEntryNodeId(name: string): number {
        return this.getEntry(name).getNodeId();
    }

    public getEntryFunc(name: string): boolean {
        return this.getEntry(name).isFunc();
    }

    public getEntryInit(name: string): boolean {
        return this.getEntry(name).isInit();
    }

    public isEntryExists(name: string): boolean {
        return this.entries.has(name);
    }

    public addEntry(name: string, nodeId: number, func: boolean, init: boolean): void {
        if(this.isEntryExists(name)){
            throw new Error(`Symbol '${name}' already exists in the scope`);
        }
        let newEntry: Entry = new Entry(nodeId, func, init);
        this.entries.set(name, newEntry);
    }

    public updateEntryNodeId(name: string, nodeId: number): void {
        if(!this.isEntryExists(name)){
            throw new Error(`Symbol '${name}' does not exist in the scope`);
        }
        this.getEntry(name).updateNodeId(nodeId);
    }
}

export class SymbolTable {
    private scopes: Array<Scope>

    public constructor() {
        this.scopes = new Array<Scope>();
    }

    public addNewScope(): void {
        this.scopes.push(new Scope());
    }

    public removeCurrentScope(): void {
        this.scopes.pop();
    }

    public getCurrentScope(): Scope {
        return this.scopes.at(-1) as Scope;
    }

    public updateNodeId(name: string, nodeId: number): void {
        this.getCurrentScope().updateEntryNodeId(name, nodeId);
    }

    public addSymbol(name: string, nodeId: number, func: boolean, init: boolean): void {       
        this.getCurrentScope().addEntry(name, nodeId, func, init);
    }
}
// export class SymbolTable {
//     private symbolTable: Map<string, number>;

//     public constructor() {
//         this.symbolTable = new Map<string, number>();
//     }

//     public getCopy(varNames: Set<string> | null = null): Map<string, number> {
//         let symbolTableCopy: Map<string, number> = new Map<string, number>();

//         this.symbolTable.forEach((nodeId: number, varName: string) => {
//             if (varNames === null || varNames.has(varName)) {
//                 symbolTableCopy.set(varName, nodeId);
//             }
//         });

//         return symbolTableCopy;
//     }

//     public set(name: string, id: number): void {
//         this.symbolTable.set(name, id);
//     }

//     public getIdByName(name: string): number {
//         if (!this.symbolTable.has(name)) {
//             throw new Error(`Symbol '${name}' does not exist in the symbol table`);
//         }
//         return this.symbolTable.get(name) as number;
//     }

//     public getNameById(id: number): string {

//         let varName: string = "";

//         this.symbolTable.forEach((currNodeId: number, currVarName: string) => {
//             if (currNodeId === id) {
//                 varName = currVarName;
//             }
//         });

//         if (!varName) {
//             throw new Error(`Symbol with id ${id} does not exist in the symbol table`);
//         }

//         return varName;

//     }
// }
