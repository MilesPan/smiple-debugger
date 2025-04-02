function main () {
    const a = 1;
    var b = 2;
    let c = 3;
    test(a, b, c);
    console.log(a, b, c);
}
main();


function test(a, b, c) {
    a = 4;
    b = 5;
    c = 6;
    console.log(a, b, c);
}

