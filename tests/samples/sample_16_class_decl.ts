class B {
    public c: number;
    public constructor() {
        this.c = 1;
    }
}

class A {
    public b: B;

    public constructor() {
        this.b = new B();
    }
}

let a: A = new A();

a.b.c = 4;