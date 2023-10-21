const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

function resolveMyPromise(promise2, val, fulfilled2, reject2) {
    if (promise2 === val) {
        return reject2(new Error('入参错误，不允许将新的promise作为then的值！'));
    }

    // 确保每个resolveMyPromise对每个MyPromise只执行1次
    let called = false;

    // 单独处理一下传入为Promise的情况，这里val就是Promise3
    if ((typeof val === 'object' && val !== null) || typeof val === 'function') {

        let then3 = val.then;
        if (typeof then3 === 'function') {

            // 启动Promise3
            then3.call(
                val, 

                // promise3的resolve
                val3 => {

                    if (called) {
                        return;
                    }
                    called = true;

                    // val3可能也是个promise，继续套用promise2进行解析
                    resolveMyPromise(promise2, val3, fulfilled2, reject2);

                },

                // promise3的reject
                err3 => {
                    if (called) {
                        return;
                    }

                    called = true;

                    // 异常返回，结束promise2
                    reject2(err3);
                }
            )


        } else {
            // 正常返回，结束promise2
            fulfilled2(val);
        }
        

    } else {
        // 正常返回，结束promise2
        fulfilled2(val);
    }
}

function MyPromise(fn) {

    this.state = PENDING;
    this.result = undefined;
    this.err = undefined;
    this.fulfilledCallbacks = [];
    this.rejectedCallbacks = [];

    let fulfilled = (ret) => {

        if (this.state === PENDING) {

            this.state = FULFILLED;
            this.result = ret;

            this.fulfilledCallbacks.forEach(cb => cb());
        }
    }

    let reject = (err) => {

        if (this.state === PENDING) {

            this.state = REJECTED;
            this.err = err;

            this.rejectedCallbacks.forEach(cb => cb());
        }
    }

    this.then = (thenFulfilled, thenReject) => {

        if (typeof thenFulfilled !== 'function') {
            thenFulfilled = val => val;
        }

        if (typeof thenReject !== 'function') {
            thenReject = err => { throw err };
        }

        let promise2 = new MyPromise((fulfilled2, reject2) => {

            const processFulfilled2 = () => {
                setTimeout(() => {
                    try {
                        let val = thenFulfilled(this.result);
                        resolveMyPromise(promise2, val, fulfilled2, reject2)
                    } catch(e) {
                        reject2(e);
                    }
                }, 0)
            };

            const processReject2 = () => {
                setTimeout(() => {
                    try {
                        let err = thenReject(this.err);
                        resolveMyPromise(promise2, err, fulfilled2, reject2)
                    } catch(e) {
                        reject2(e);
                    }
                }, 0)
            }

            if (this.state === FULFILLED) {
                processFulfilled2();
            } else if (this.state === REJECTED) {
                processReject2();
            } else if (this.state === PENDING) {
                this.fulfilledCallbacks.push(processFulfilled2);
                this.rejectedCallbacks.push(processReject2);
            }
    
        });

        return promise2;
    }

    this.catch = (thenReject) => {
        return this.then(undefined, thenReject);
    }

    try {
        fn(fulfilled, reject);
    } catch(e) {
        reject(e);
    }

}

module.exports = MyPromise;