function func(a:Array<number>, b:Array<number>){
    if(true){
        a.push(1);
        b.pop()
    }
    else{
        a.push(1);
    }
    if(true){
        a.unshift(1);
    }
    else{
        a.pop();
    }
    add();
    b.push(2);
    a.push(2);
}

function add(): number{
    return 5;
}
