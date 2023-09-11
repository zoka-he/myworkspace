const { resolve } = require("path");
const MyPromise = require("./MyPromise");


new MyPromise(resolve => resolve(1)).then(console.debug);


new MyPromise(resolve => {
    setTimeout(() => {
        resolve(2)
    }, 100);
}).then(console.debug);


new MyPromise(() => {
    throw new Error('3');
}).catch(e => console.debug('errmsg:', e.message));

new MyPromise(resolve => {
    resolve(4);
})
.then()
.then(console.debug);

new MyPromise(resolve => {
    resolve(5);
})
.then(val => {
    console.debug(val);
    return val + 1;
})
.then(console.debug);

new MyPromise(resolve => {
    resolve(7);
})
.then(val => new MyPromise(resolve => {
    console.debug(val);
    resolve(val + 1);
}))
.then(console.debug);

new MyPromise(resolve => {
    console.debug(9);
    resolve(9);
})
.then(10)
.then(console.debug);


new MyPromise(resolve => {
    resolve(12);
    resolve(13);
})
.then(console.debug);

(async function p14() {
    let value = await new MyPromise(resolve => {
        setTimeout(() => {
            resolve(14)
        }, 100);
    });
    console.debug(value);
})();
