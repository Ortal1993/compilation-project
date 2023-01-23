function func(a:Array<number>, b:Array<number>, c:Array<number>){
    if (true) {
        c.push(5);
        return;
    }
    if(true){
        a.push(1);
        b.pop();
        c.push(1);
    }
    else{
        a.push(1);
        c.push(3);
    }
    if(true){
        a.unshift(1);
        c.unshift(5);
    }
    else{
        a.pop();
        c.unshift(5);
    }
    add();
    b.push(2);
    a.push(2);
    c.shift();
}

function add(): number{
    return 5;
}
