export default {
    convertJson(obj: any): [string, any[]] {

        function convertObj(obj: { [key: string]: any }): [string, any[]] {
    
            let _s: string[] = [], _v: any[] = [], _cnt: number = 0; 
    
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
    
        function convertArr(arr: any[]): [string, any[]] {
            let _s: string[] = [], _v: any[] = [], _cnt: number = arr.length; 
    
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
        } else if (typeof obj === 'object' && obj !== null) {
            return convertObj(obj);
        } else {
            return ['?', [null]];
        }
    }
}