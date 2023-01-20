function func1() {
    let x = 5;
    let y = -x;
    let z = x + y;
    return;
}

function func2() {
    if (true) {
        func1();
    }
    else {
        func1();
    }
    return;
    func1();
    func1();
}