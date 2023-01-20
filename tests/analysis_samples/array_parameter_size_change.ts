function func(a:Array<number>){
    if(true){
        a.push(1);
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
    a.push(2);
}

function add(): number{
    return 5;
}