function add(a: number): number {
    return a + 10;
}

function sub(a: number): number {
    return a - 11;
}

let x: number = 0;

while (true) {
    add(x);
    x = 5;
}

sub(9);