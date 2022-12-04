// while (true) {
//     let x: number = 5;
// }


function func(a: number) {
    return a;
}



let x: number = 0;


x = 0;

while (true) {
    x = 1;
    func(x);
}


//////////////////////////

x = 0;

while (true) {
    func(x);
    x = 1;
}


// there is a re-assigment and then a use
// for example:
//  y = 6;
//  add(y);
// and then we don't need a phi vertex

// there is a use and then re-assigment
// for example:
//  add(y);
//  y = 6;
// and then we do need a phi vertex