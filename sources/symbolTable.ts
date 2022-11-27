export class SymbolTable {
    private symbolTable: Map<string, number>;

    public constructor() {
        this.symbolTable = new Map<string, number>();
    }

    public getCopy(varNames: Set<string> | null = null): Map<string, number> {
        let symbolTableCopy: Map<string, number> = new Map<string, number>();

        this.symbolTable.forEach((nodeId: number, varName: string) => {
            if (varNames === null || varNames.has(varName)) {
                symbolTableCopy.set(varName, nodeId);
            }
        });

        return symbolTableCopy;
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

    public getNameById(id: number): string {

        let varName: string = "";

        this.symbolTable.forEach((currNodeId: number, currVarName: string) => {
            if (currNodeId === id) {
                varName = currVarName;
            }
        });

        if (!varName) {
            throw new Error(`Symbol with id ${id} does not exist in the symbol table`);
        }

        return varName;

    }
}
