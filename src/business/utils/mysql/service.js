class MysqlService {

    constructor(tableName) {
        this.tableName = tableName;
        this.priKey = 'ID';
        this.validColumns = [];
    }

    check(fnName) {
        if (!window?.mysql[fnName]) {
            throw new Error('此接口需要在electron环境下使用！');
        }
    }

    setValidColumns(cols) {
        this.validColumns = cols;
    }

    verifyInsertOrUpdate(obj) {
        // console.debug('valid columns', this.validColumns);
        if (this.validColumns?.length) {
            let obj2 = {};
            for (let item of this.validColumns) {
                if (obj.hasOwnProperty(item)) {
                    // console.debug(`${obj} has prop ${item}`);
                    obj2[item] = obj[item];
                }
            }
            return obj2;
        } else {
            return obj;
        }
    }

    parseConditionObject(obj) {
        // 入参校验
        if (typeof obj !== 'object') {
            return null;
        }

        let keys = Object.keys(obj), values = [], condStrs = [];

        for (let [k, v] of Object.entries(obj)) {
            keys.push(k);
            switch (typeof v) {
                case "undefined":
                case "function":
                case "symbol":
                    break;

                case 'object':
                    if (v.hasOwnProperty('$like')) {
                        condStrs.push(`${k} like ?`);
                        values.push(v.$like);
                    } else if (v.hasOwnProperty('$ne')) {
                        condStrs.push(`${k}!=?`);
                        values.push(v.$ne);
                    } else if (v.hasOwnProperty('$in')) {
                        let array = v.$in;
                        if (typeof array === 'object' && array instanceof Array) {
                            condStrs.push(`${k} in (${ Array.from(array, () => '?').toString() })`);
                            values.push(...array);
                        }
                    } else if (v.hasOwnProperty('$lt')) {
                        condStrs.push(`${k}<?`);
                        values.push(v.$lt);
                    } else if (v.hasOwnProperty('$gt')) {
                        condStrs.push(`${k}>?`);
                        values.push(v.$gt);
                    } else if (v.hasOwnProperty('$btw')) {
                        condStrs.push(`${k} between ? and ?`);
                        values.push(...v.$btw);
                    }
                    break;

                default:
                    condStrs.push(`${k}=?`);
                    values.push(v);
            }

        }

        // 出参校验
        if (condStrs.length === 0) {
            return null;
        }

        return {
            sql: condStrs.join(' AND '),
            values
        }
    }

    async query(conditionOrSql = '', values = [], order = [`${this.priKey} asc`], page = 1, limit = 20, noCount = false) {
        this.check('selectBySql');

        let baseSql = '';
        if (typeof conditionOrSql === 'string' && conditionOrSql) {
            baseSql = conditionOrSql;
        } else if (typeof conditionOrSql === 'object') {

            let parseResult = this.parseConditionObject(conditionOrSql);

            let conditionsSql = '';
            if (parseResult) {
                conditionsSql = ' where ' + parseResult.sql;
                values = parseResult.values;
            }

            baseSql = `select * from ${this.tableName}${conditionsSql}`;
        } else {
            baseSql = `select * from ${this.tableName}`;
        }



        let pageSql = baseSql;
        if (pageSql.indexOf('order by') === -1) {
            pageSql = pageSql + ' order by ' + order.join(',');
        }

        if (pageSql.indexOf('limit') === -1) {
            pageSql = pageSql + ` limit ?,?`;
            values.push((page - 1) * limit, limit);
        }

        console.debug('query page -> ', pageSql, values);
        let pageData = await window.mysql.selectBySql(pageSql, values);

        let count = 0;
        if (noCount) {
            count = pageData.length;
        } else {
            let countSql = `select count(0) as count from (${baseSql}) t`;
            console.debug('query count -> ', countSql, values);
            let countRs = await window.mysql.selectBySql(countSql, values);
            count = countRs[0]?.count || 0;
        }

        return {
            data: pageData,
            count
        }
    }

    async insertOne(obj, ...args) {
        let obj2 = this.verifyInsertOrUpdate(obj);

        console.debug('insert', this.tableName, obj2);
        return await window.mysql.insertOne(this.tableName, obj2, ...args);
    }

    async updateOne(oldObj, obj, ...args) {
        let prikeyValue = oldObj[this.priKey];
        let obj2 = { ...obj };
        delete obj2[this.priKey];

        let obj3 = this.verifyInsertOrUpdate(obj2);
        return await window.mysql.updateOne(this.tableName, {[this.priKey]: prikeyValue}, obj3, ...args);
    }

    async deleteOne(obj) {
        let prikeyValue = obj[this.priKey];
        return await window.mysql.deleteFrom(this.tableName, {[this.priKey]: prikeyValue});
    }

    queryBySql(sql, values) {
        return window.mysql.selectBySql(sql, values);
    }

    async queryOne(conditionOrSql = '', values = [], order = [`${this.priKey} asc`]) {
        let { data } = await this.query(conditionOrSql, values, order, 1, 1, true);
        if (data[0]) {
            return data[0];
        } else {
            return null;
        }
    }
}

export default MysqlService;
