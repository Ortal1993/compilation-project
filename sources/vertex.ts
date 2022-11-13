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
        return this.value as string;
    }
}

export class VariableVertex extends DataVertex {
    public name: string;

    constructor(_name: string) {
        super();
        this.name = _name;
    }

    public getLabel(): string {
        return this.name;
    }
}

export class BinaryOperationVertex extends DataVertex {
    public operation: BinaryOperation;

    constructor(_operation: BinaryOperation) {
        super();
        this.operation = _operation;
    }

    public getLabel(): string {
        switch(this.operation) {
            case BinaryOperation.Add:
                return "+";
            case BinaryOperation.Div:
                return "/";
            case BinaryOperation.Mul:
                return "*";
            case BinaryOperation.Sub:
                return "-";
            case BinaryOperation.Assign:
                return "=";
            case BinaryOperation.LessThan:
                return "<";
            case BinaryOperation.GreaterThan:
                return ">";
            case BinaryOperation.LessThanEqual:
                return "<=";
            case BinaryOperation.GreaterThanEqual:
                return ">=";
            case BinaryOperation.EqualEqual:
                return "==";
            case BinaryOperation.ExclamationEqual:
                return "!=";
            case BinaryOperation.EqualEqualEqual:
                return "===";
            case BinaryOperation.ExclamationEqualEqual:
                return "!==";
            default:
                throw new Error(`Undefined vertex label`);
        }
    }
}

export class UnaryOperationVertex extends DataVertex {
    public operation: UnaryOperation;

    constructor(_operation: UnaryOperation) {
        super();
        this.operation = _operation;
    }

    public getLabel(): string {
        switch(this.operation) {
            case UnaryOperation.Plus:
                return "+";
            case UnaryOperation.Minus:
                return "-";
            default:
                throw new Error(`Undefined vertex label`);
        }
    }
}
