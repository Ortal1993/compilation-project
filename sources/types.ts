export enum BinaryOperation {
    Add,
    Sub,
    Mul,
    Div,
    Assign,
    LessThan,
    GreaterThan,
    LessThanEqual,
    GreaterThanEqual,
    EqualEqual,
    ExclamationEqual,
    EqualEqualEqual,
    ExclamationEqualEqual
}

export enum UnaryOperation {
    Plus,
    Minus
}

export enum VertexType {
    Const,
    Variable,
    BinaryOperation,
    UnaryOperation
    // TODO: add also control vertices types
}
