import deviceDetailUnit from './deviceDetailUnit';

let testUnits = [
    // ...deviceDetailUnit
];

function getTestCase(...args) {
    console.debug('getTestCase env:', process.env);
    if (process.env.NODE_ENV === 'development') {
        console.warn('fetch模块处于测试状态');

        for (let unit of testUnits) {
            if (unit.match(args)) {
                console.warn('fetch模块测试用例命中');
                return unit;
            }
        }
    }

    return undefined;
}

export default {
    getTestCase
};