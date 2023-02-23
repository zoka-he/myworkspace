import connPool from './pool';
import {ISqlCondMap} from "@/src/utils/mysql/types";

async function insertOne(table: string, obj: ISqlCondMap) {
    let names = [];
    let placeholders = [];
    let values = [];

    for (let [k, v] of Object.entries(obj)) {
        names.push(k);
        placeholders.push('?');
        values.push(v);
    }

    if (names.length === 0) {
        return;
    }

    let conn = await connPool.getConnection();
    await conn.execute(`insert into ${table}(${names.join(',')}) values(${placeholders.join(',')})`, values);
    conn.release();
}

async function insertMany(table: string, obj: ISqlCondMap) {

}

/**
 * 插入一行
 * @param {string} table
 * @param {string | Object} conditions
 * @param {Object} obj
 * @returns {Promise<void>}
 */
async function updateOne(table: string, conditions: ISqlCondMap, obj: any) {
    let sets = [];
    let conNames = [];
    let values = [];

    for (let [k, v] of Object.entries(obj)) {
        sets.push(`${k}=?`);
        values.push(v);
    }

    let conStr = '';
    if (typeof conditions === 'string') {
        conStr = conditions;
    } else {
        for (let [k, v] of Object.entries(conditions)) {
            conNames.push(`${k}=?`);
            values.push(v);
        }
        conStr = conNames.join(' AND ');
    }

    let conn = await connPool.getConnection();
    await conn.execute(`update ${table} set ${sets.join(',')} where ${conStr}`, values);
    conn.release();
}

async function updateMany(table: string, conditions: ISqlCondMap, obj: any) {

}

async function deleteFrom(table: string, conditions: ISqlCondMap, values: any[] = []) {
    let conStr = '';
    if (typeof conditions === 'string') {
        conStr = conditions;
    } else {
        let conNames = [];
        values = [];

        for (let [k, v] of Object.entries(conditions)) {
            conNames.push(`${k}=?`);
            values.push(v);
        }
        conStr = conNames.join(' AND ');
    }

    let conn = await connPool.getConnection();
    await conn.execute(`delete from ${table} where ${conStr}`, values);
    conn.release();
}

async function selectBySql(sql: string, ...options: any[]) {
    console.debug('selectBySql', sql);
    let conn = await connPool.getConnection();
    // @ts-ignore
    let [rows] = await conn.query(sql, ...options);
    conn.release();
    return rows;
}

export default {
    insertOne,
    insertMany,
    updateOne,
    updateMany,
    deleteFrom,
    selectBySql
}