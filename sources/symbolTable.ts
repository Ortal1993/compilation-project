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
        this.init = true;
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

    public isEntryExists(name: string): boolean {
        return this.entries.has(name);
    }

    public getEntry(name: string): Entry | undefined {
        return this.entries.get(name);
    }

    public getEntryNameByNodeId(nodeId: number): string | undefined {
        let symbolName: string | undefined = undefined;
        let found: boolean = false;

        this.entries.forEach((entry: Entry, name: string) => {
            if (entry.getNodeId() === nodeId && !found) {
                symbolName = name;
                found = true;
            }
        });

        return symbolName;
    }

    public getEntryNodeId(name: string): number | undefined {
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

    public addEntry(name: string, nodeId: number, func: boolean, init: boolean): void {
        let newEntry: Entry = new Entry(nodeId, func, init);
        this.entries.set(name, newEntry);
    }

    public updateEntryNodeId(name: string, nodeId: number): void {
        let entry: Entry | undefined = this.getEntry(name);
        if (entry !== undefined) {
            entry.updateNodeId(nodeId);
        }
    }

    public getCopy(varNames: Set<string> | null, symbolTableCopy: Map<string, number>) {
        this.entries.forEach((entry: Entry, name: string) => {
            if ((varNames === null || varNames.has(name)) && !symbolTableCopy.has(name) && !entry.isFunc()) {
                symbolTableCopy.set(name, entry.getNodeId());
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

    public updateNodeId(name: string, nodeId: number): void {
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

    public addSymbol(name: string, nodeId: number, func: boolean = false, init: boolean = false): void {
        let currentScope: Scope = this.getCurrentScope();
        if (currentScope.isEntryExists(name)) {
            throw new Error(`Symbol '${name}' already exists in the symbol table`);
        }
        currentScope.addEntry(name, nodeId, func, init);
    }

    public getIdByName(name: string): number {
        for (let scope of this.scopes) {
            if (scope.isEntryExists(name)) {
                return scope.getEntryNodeId(name) as number;
            }
        }

        throw new Error(`Symbol '${name}' does not exist in the symbol table`);
    }

    public getNameById(id: number): string {
        for (let scope of this.scopes) {
            let name: string | undefined = scope.getEntryNameByNodeId(id);
            if (name !== undefined) {
                return name;
            }
        }

        throw new Error(`Symbol with id '${id}' does not exist in the symbol table`);
    }

    public getCopy(varNames: Set<string> | null = null): Map<string, number> {
        let symbolTableCopy: Map<string, number> = new Map<string, number>();

        this.scopes.forEach((scope: Scope) => {
            scope.getCopy(varNames, symbolTableCopy);
        });

        return symbolTableCopy;
    }
}
