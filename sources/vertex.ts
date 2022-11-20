import { BinaryOperation, UnaryOperation } from "./types";

export abstract class Vertex {
    private static next_id: number = 0;
    public id: number;

    constructor() {
        this.id = Vertex.next_id++;
    }

    public static getCount(): number {
        return Vertex.next_id;
    }

    abstract getLabel(): string;

    public getLabelPrefix(): string {
        return String(this.id) + " | ";
    }
}

abstract class DataVertex extends Vertex {
    constructor() {
        super();
    }
}

abstract class ControlVertex extends Vertex {
    constructor() {
        super();
    }
}

export class ConstVertex extends DataVertex {
    public value: unknown;

    constructor(_value: unknown) {
        super();
        this.value = _value;
    }

    public getLabel(): string {
        return this.getLabelPrefix() + (this.value as string);
    }
}

export class VariableVertex extends DataVertex {
    public name: string;

    constructor(_name: string) {
        super();
        this.name = _name;
    }

    public getLabel(): string {
        return this.getLabelPrefix() + this.name;
    }
}

export class ParameterVertex extends VariableVertex {
    public name: string;
    public pos: number;
    public funcId: number;

    constructor(_name: string, _pos: number, _funcId: number) {
        super(_name);
        this.pos = _pos;
        this.funcId = _funcId;
    }

    public getLabel(): string {
        return this.getLabelPrefix() + "param (" + String(this.pos) + ") : " + this.name + " : (function: " + String(this.funcId) + ")";
    }
}

export class BinaryOperationVertex extends DataVertex {
    public operation: BinaryOperation;

    constructor(_operation: BinaryOperation) {
        super();
        this.operation = _operation;
    }

    public getLabel(): string {
        let operation: string;

        switch(this.operation) {
            case BinaryOperation.Add:
                operation = "+";
                break;
            case BinaryOperation.Div:
                operation = "/";
                break;
            case BinaryOperation.Mul:
                operation = "*";
                break;
            case BinaryOperation.Sub:
                operation = "-";
                break;
            case BinaryOperation.Assign:
                operation = "=";
                break;
            case BinaryOperation.LessThan:
                operation = "<";
                break;
            case BinaryOperation.GreaterThan:
                operation = ">";
                break;
            case BinaryOperation.LessThanEqual:
                operation = "<=";
                break;
            case BinaryOperation.GreaterThanEqual:
                operation = ">=";
                break;
            case BinaryOperation.EqualEqual:
                operation = "==";
                break;
            case BinaryOperation.NotEqual:
                operation = "!=";
                break;
            case BinaryOperation.EqualEqualEqual:
                operation = "===";
                break;
            case BinaryOperation.NotEqualEqual:
                operation = "!==";
                break;
            case BinaryOperation.And:
                operation = "&&";
                break;
            case BinaryOperation.Or:
                operation = "||";
                break;
            default:
                throw new Error(`Undefined vertex label`);
        }

        return this.getLabelPrefix() + operation;
    }
}

export class UnaryOperationVertex extends DataVertex {
    public operation: UnaryOperation;

    constructor(_operation: UnaryOperation) {
        super();
        this.operation = _operation;
    }

    public getLabel(): string {
        let operation: string;

        switch(this.operation) {
            case UnaryOperation.Plus:
                operation = "+";
                break;
            case UnaryOperation.Minus:
                operation = "-";
                break;
            case UnaryOperation.Not:
                operation = "!";
                break;
            default:
                throw new Error(`Undefined vertex label`);
        }

        return this.getLabelPrefix() + operation;
    }
}

export class IfVertex extends ControlVertex {
    constructor() {
        super();
    }

    public getLabel(): string {
        return this.getLabelPrefix() + "if";
    }
}

export class PhiVertex extends VariableVertex {
    public ifId: number;

    constructor(_name: string, _ifId: number) {
        super(_name);
        this.ifId = _ifId;
    }

    public getLabel(): string {
        return this.getLabelPrefix() + "phi: " + this.name + " (if: " + String(this.ifId) + ")";
    }
}

export class StartVertex extends ControlVertex {
    public name: string;

    constructor(_name: string) {
        super();
        this.name = _name;
    }

    public getLabel(): string {
        return this.getLabelPrefix() + "start (function: " + this.name + ")";
    }
}

export class CallVertex extends ControlVertex {
    constructor() {
        super();
    }

    public getLabel(): string {
        return this.getLabelPrefix() + "call";
    }
}

export class BranchVertex extends ControlVertex {
    private type: boolean;

    constructor(_type: boolean) {
        super();
        this.type = _type;
    }

    public getLabel(): string {
        return this.getLabelPrefix() + String(this.type);
    }
}

export class MergeVertex extends ControlVertex {
    public ifId: number;

    constructor(_ifId: number) {
        super();
        this.ifId = _ifId;
    }

    public getLabel(): string {
        return this.getLabelPrefix() + "merge (if: " + String(this.ifId) + ")";
    }
}

export class ReturnVertex extends ControlVertex {
    constructor() {
        super();
    }

    public getLabel(): string {
        return this.getLabelPrefix() + "return";
    }
}