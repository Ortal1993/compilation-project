import { NodeId } from "./types";

class Entry {
    private name: string;
    private nodeId: NodeId;
    private func: boolean;
    private init: boolean;

    public constructor(_name: string, _nodeId: NodeId, _func: boolean, _init: boolean) {
        this.name = _name;
        this.nodeId = _nodeId;
        this.func = _func;
        this.init = _init;
    }

    public getName(): string {
        return this.name;
    }

    public getNodeId(): NodeId {
        return this.nodeId;
    }

    public isFunc(): boolean {
        return this.func;
    }

    public isInit(): boolean {
        return this.init;
    }

    public updateNodeId(newNodeId: NodeId): void {
        this.nodeId = newNodeId;
        this.init = true;
    }    
}

class Scope {
    public entries: Array<Entry>;

    public constructor() {
        this.entries = new Array<Entry>();
    }

    public isEntryExists(name: string): boolean {
        for (let entry of this.entries) {
            if(entry.getName() === name) {
                return true;
            }
        }
        return false;
    }

    public getEntry(name: string): Entry | undefined {
        for (let entry of this.entries) {
            if(entry.getName() === name) {
                return entry;
            }
        }
        return undefined;
    }

    public getEntryNameByNodeId(nodeId: NodeId): string | undefined {
        for (let entry of this.entries) {
            if(entry.getNodeId() === nodeId) {
                return entry.getName();
            }
        }
        return undefined;
    }

    public getEntryNodeId(name: string): NodeId | undefined {
        let entry: Entry | undefined = this.getEntry(name);
        if (entry === undefined) {
            return undefined;
        }
        return entry.getNodeId();
    }

    public getEntryFunc(name: string): boolean | undefined {
        let entry: Entry | undefined = this.getEntry(name);
        if (entry === undefined) {
            return undefined;
        }
        return entry.isFunc();
    }

    public getEntryInit(name: string): boolean | undefined {
        let entry: Entry | undefined = this.getEntry(name);
        if (entry === undefined) {
            return undefined;
        }
        return entry.isInit();
    }

    public addEntry(name: string, nodeId: NodeId, func: boolean, init: boolean): void {
        let newEntry: Entry = new Entry(name, nodeId, func, init);
        this.entries.unshift(newEntry);
    }

    public updateEntryNodeId(name: string, nodeId: NodeId): void {
        let entry: Entry | undefined = this.getEntry(name);
        if (entry !== undefined) {
            entry.updateNodeId(nodeId);
        }
    }

    //varNames - all the variables that can change in if blocks
    public getCopy(varNames: Set<string> | null, symbolTableCopy: Map<string, NodeId>) {
        this.entries.forEach((entry: Entry) => {
            if ((varNames === null || varNames.has(entry.getName())) && !symbolTableCopy.has(entry.getName()) && !entry.isFunc()) {
                symbolTableCopy.set(entry.getName(), entry.getNodeId());
            }
        });
    }

}

export class SymbolTable {
    private scopes: Array<Scope>

    public constructor() {
        this.scopes = new Array<Scope>();
    }

    public addNewScope(): void {
        this.scopes.unshift(new Scope());
    }

    public removeCurrentScope(): void {
        this.scopes.shift();
    }

    public getCurrentScope(): Scope {
        return this.scopes.at(0) as Scope;
    }

    public updateNodeId(name: string, nodeId: NodeId): void {
        let updated: boolean = false;

        for (let scope of this.scopes) {
            if (scope.isEntryExists(name)) {
                scope.updateEntryNodeId(name, nodeId);
                updated = true;
                break;
            }
        }

        if (!updated) {
            throw new Error(`Symbol '${name}' does not exist in the symbol table`);
        }
    }

    public addSymbol(name: string, nodeId: NodeId, func: boolean = false, init: boolean = false): void {
        let currentScope: Scope = this.getCurrentScope();
        if (currentScope.isEntryExists(name)) {
            throw new Error(`Symbol '${name}' already exists in the symbol table`);
        }
        currentScope.addEntry(name, nodeId, func, init);
    }

    public getIdByName(name: string): NodeId {
        for (let scope of this.scopes) {
            if (scope.isEntryExists(name)) {
                return scope.getEntryNodeId(name) as NodeId;
            }
        }

        throw new Error(`Symbol '${name}' does not exist in the symbol table`);
    }

    public getNameById(nodeId: NodeId): string {
        for (let scope of this.scopes) {
            let name: string | undefined = scope.getEntryNameByNodeId(nodeId);
            if (name !== undefined) {
                return name;
            }
        }

        throw new Error(`Symbol with nodeId '${nodeId}' does not exist in the symbol table`);
    }

    public getCopy(varNames: Set<string> | null = null): Map<string, NodeId> {
        let symbolTableCopy: Map<string, NodeId> = new Map<string, NodeId>();

        this.scopes.forEach((scope: Scope) => {
            scope.getCopy(varNames, symbolTableCopy);
        });

        return symbolTableCopy;
    }

}
