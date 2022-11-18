export class SymbolTable {
    // mapping from symbols names to vertices IDs
    private symbolTable: Map<string, number>;

    public constructor() {
        this.symbolTable = new Map<string, number>();
    }

    public checkExists(name: string): void {
        if (!this.symbolTable.has(name)) {
            throw new Error(`Symbol '${name}' does not exist in the symbol table`);
        }
    }

    public set(name: string, id: number): void {
        this.symbolTable.set(name, id);
    }

    public getIdByName(name: string): number {
        if (!this.symbolTable.has(name)) {
            throw new Error(`Symbol '${name}' does not exist in the symbol table`);
        }
        return this.symbolTable.get(name) as number;
    }
}
