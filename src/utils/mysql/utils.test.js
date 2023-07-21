function convertJson(obj) {

    function convertObj(obj) {

        let _s = [], _v = [], _cnt = 0; 

        Object.entries(obj).map(([key, val], index) => {
            _cnt = index + 1;

            if (val === null || val === undefined) {
                _s.push('?', '?');
                _v.push(key, null);
            } else {
                switch(typeof val) {
                    case 'number':
                    case 'boolean':
                    case 'string':
                    case 'bigint':
                        _s.push('?', '?');
                        _v.push(key, val);
                        break;
                    case 'object':
                        let [__s, __v] = convertJson(val);
                        _s.push('?', __s);
                        _v.push(key, ...__v);
                }
            }
        });

        if (!_cnt) {
            return [`?`, [null]];
        } else {
            return [`JSON_OBJECT(${_s.join(',')})`, _v];
        }
    }

    function convertArr(arr) {
        let _s = [], _v = [], _cnt = arr.length; 

        if (!_cnt) {
            return [`?`, [null]];
        }

        arr.map((item, index) => {
            _cnt = index + 1;

            if (item === null || item === undefined) {
                _s.push('?');
                _v.push(null);
            } else {
                switch(typeof item) {
                    case 'number':
                    case 'boolean':
                    case 'string':
                    case 'bigint':
                        _s.push('?');
                        _v.push(item);
                        break;
                    case 'object':
                        let [__s, __v] = convertJson(item);
                        _s.push(__s);
                        _v.push(...__v);
                }
            }
        })

        return [`JSON_ARRAY(${_s.join(',')})`, _v];
    }

    if (obj instanceof Array) {
        return convertArr(obj);
    } else if (typeof obj === 'object') {
        return convertObj(obj);
    } else {
        return ['?', [null]];
    }
}

let [s, v] = convertJson({ 
    arr: [1, [2, 3]], 
    obj: {a: 1, b: { c: 2 }},
    b: false,
    d: 1.5,
    n: null,
    u: undefined,
    s: 'def'
});

console.debug(
    'convert result', 
    s, v
);

let s2 = '', v2 = [...v];
for (let char of s) {
    if (char !== '?') {
        s2 = s2 += char;
    } else {
        let value = v2.shift();
        s2 += value;
    }
}

console.debug(s2);