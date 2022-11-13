export class SymbolTable {
    // mapping from symbols names to vertices IDs
    private symbolTable: Map<string, number>;

    public constructor() {
        this.symbolTable = new Map<string, number>();
    }

    public add(name: string, id: number): void {
        if (this.symbolTable.has(name)) {
            throw new Error(`Symbol '${name}' already exists in the symbol table`);
        }
        this.symbolTable.set(name, id);
    }

    public getIdByName(name: string): number {
        if (!this.symbolTable.has(name)) {
            throw new Error(`Symbol '${name}' does not exist in the symbol table`);
        }
        return this.symbolTable.get(name) as number;
    }
}
