import mysql from './server';
import {ISqlCondMap, ISqlCondMapParsed} from "@/src/utils/mysql/types";
import sqlUtils from './utils';

class MysqlService {

    private readonly tableName: string;
    private readonly priKey: string | string[];
    private validColumns: Array<string>;

    constructor(tableName: string, priKey: string | string[] = 'ID') {
        this.tableName = tableName;
        this.priKey = priKey;
        this.validColumns = [];
    }

    setValidColumns(cols: Array<string>) {
        this.validColumns = cols;
    }

    verifyInsertOrUpdate(obj: ISqlCondMap) {
        // console.debug('valid columns', this.validColumns);
        if (this.validColumns?.length) {
            let obj2: ISqlCondMap = {};
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

    parseConditionObject(obj: ISqlCondMap): ISqlCondMapParsed | null {

        let keys = Object.keys(obj), values = [], condStrs = [];

        for (let [k, v] of Object.entries(obj)) {
            keys.push(k);

            switch (typeof v) {
                case "undefined":
                case "function":
                case "symbol":
                    break;

                case 'object':
                    if (v === null) {
                        condStrs.push(`${k} is null`);
                    } else if (v instanceof Date) {
                        condStrs.push(`${k}=?`);
                        values.push(v);
                    } else if (v instanceof Array) {
                        let arrLen = v.length;
                        condStrs.push(`${k} in (${ Array.from({ length: arrLen }, () => '?').toString() })`);
                        values.push(...v);
                    } else if (v.hasOwnProperty('$like')) {
                        condStrs.push(`${k} like ?`);
                        values.push(v.$like);
                    } else if (v.hasOwnProperty('$ne')) {
                        let value = v.$ne;
                        if (value === null) {
                            condStrs.push(`${k} is not null`);
                        } else {
                            condStrs.push(`${k}!=?`);
                            values.push(v.$ne);
                        }
                    } else if (v.hasOwnProperty('$in')) {
                        let array = v.$in;
                        if (typeof array === 'object' && array instanceof Array) {
                            let arrLen = array.length;
                            condStrs.push(`${k} in (${ Array.from({ length: arrLen }, () => '?').toString() })`);
                            values.push(...array);
                        }
                    } else if (v.hasOwnProperty('$lt')) {
                        condStrs.push(`${k}<?`);
                        values.push(v.$lt);
                    } else if (v.hasOwnProperty('$gt')) {
                        condStrs.push(`${k}>?`);
                        values.push(v.$gt);
                    } else if (v?.$btw instanceof Array) {
                        condStrs.push(`${k} between ? and ?`);
                        values.push(...v.$btw);
                    } else if (v?.$json_contains instanceof Array) {
                        let [_s, _v] = sqlUtils.convertJson(v.$json_contains);
                        condStrs.push(`JSON_CONTAINS(${k},${_s})`);
                        values.push(..._v);
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

    private getDefaultPrikey(): string[] {
        if (typeof this.priKey === 'string') {
            return [`${this.priKey} asc`]
        } else {
            return this.priKey.map(item => {
                return `${item} asc`
            })
        }
    }

    async query(
        conditionOrSql: string | ISqlCondMap = '',
        values: Array<any> = [],
        order: Array<string> = this.getDefaultPrikey(),
        page: number = 1,
        limit: number = 20,
        noCount: boolean = false
    ) {
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
        let pageData = await mysql.selectBySql(pageSql, values);

        let count = 0;
        if (noCount) {
            // @ts-ignore
            count = pageData?.length || 0;
        } else {
            let countSql = `select count(0) as count from (${baseSql}) t`;
            console.debug('query count -> ', countSql, values);
            let countRs = await mysql.selectBySql(countSql, values);
            // @ts-ignore
            count = countRs[0]?.count || 0;
        }

        return {
            data: pageData,
            count
        }
    }

    async insertOne(obj: ISqlCondMap, ...args: any[]) {
        let obj2 = this.verifyInsertOrUpdate(obj);

        console.debug('insert', this.tableName, obj2);
        // @ts-ignore
        return await mysql.insertOne(this.tableName, obj2, ...args);
    }

    async updateOne(oldObj: ISqlCondMap, obj: ISqlCondMap, ...args: any[]) {
        let queryObj = {};
        let updateObj = {};
        for (let [k, v] of Object.entries(oldObj)) {
            if (typeof this.priKey === 'string') {
                if (k === this.priKey) {
                    // @ts-ignore
                    queryObj[k] = v;
                } 
            } else {
                if (this.priKey.includes(k)) {
                    // @ts-ignore
                    queryObj[k] = v;
                } 
            }
        }

        for (let [k, v] of Object.entries(obj)) {
            if (typeof this.priKey === 'string') {
                if (k !== this.priKey) {
                    // @ts-ignore
                    updateObj[k] = v;
                }
            } else {
                if (!this.priKey.includes(k)) {
                    // @ts-ignore
                    updateObj[k] = v;
                }
            }
        }

        let obj3 = this.verifyInsertOrUpdate(updateObj);
        // @ts-ignore
        return await mysql.updateOne(this.tableName, queryObj, obj3, ...args);
    }

    async deleteOne(obj: ISqlCondMap) {
        let queryObj = {};
        for (let [k, v] of Object.entries(obj)) {
            if (typeof this.priKey === 'string') {
                if (k === this.priKey) {
                    // @ts-ignore
                    queryObj[k] = v;
                } 
            } else {
                if (this.priKey.includes(k)) {
                    // @ts-ignore
                    queryObj[k] = v;
                } 
            }
        }

        if (Object.keys(obj).length === 0) {
            throw new Error('deleteOne必须包含主键！');
        };

        // let prikeyValue = obj[this.priKey];
        return await mysql.deleteFrom(this.tableName, queryObj);
    }

    async deleteMany(obj: ISqlCondMap) {
        if (Object.keys(obj).length === 0) {
            throw new Error('deleteMany必须包含条件！');
        };
        return await mysql.deleteFrom(this.tableName, obj);
    }

    queryBySql(sql: string, values: any[]) {
        return mysql.selectBySql(sql, values);
    }

    async queryOne(conditionOrSql: string | ISqlCondMap = '', values = [], order = [`${this.priKey} asc`]) {
        let { data } = await this.query(conditionOrSql, values, order, 1, 1, true);
        // @ts-ignore
        if (data[0]) {
            // @ts-ignore
            return data[0];
        } else {
            return null;
        }
    }
}

export default MysqlService;
