import { IMysqlActions } from '@/src/types/IMysqlActions';
import { novalPool } from './pool';
import {ISqlCondMap} from "@/src/utils/mysql/types";

// 转义列名，避免 MySQL 保留关键字问题
function escapeColumnName(name: string): string {
    return `\`${name}\``;
}

async function insertOne(table: string, obj: ISqlCondMap) {
    let names = [];
    let placeholders = [];
    let values = [];

    for (let [k, v] of Object.entries(obj)) {
        names.push(escapeColumnName(k));
        placeholders.push('?');

        if (typeof v === 'object') {
            // values.push(convertJson(v));
            values.push(v);
        } 
        
        else {
            values.push(v);
        }
        
    }

    if (names.length === 0) {
        return;
    }

    let conn = await novalPool.getConnection();
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
        sets.push(`${escapeColumnName(k)}=?`);
        if (typeof v === 'object') {
            // values.push(convertJson(v));
            values.push(v);
        } 
        
        else {
            values.push(v);
        }
    }

    let conStr = '';
    if (typeof conditions === 'string') {
        conStr = conditions;
    } else {
        for (let [k, v] of Object.entries(conditions)) {
            conNames.push(`${escapeColumnName(k)}=?`);
            values.push(v);
        }
        conStr = conNames.join(' AND ');
    }

    let conn = await novalPool.getConnection();
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
            conNames.push(`${escapeColumnName(k)}=?`);
            values.push(v);
        }
        conStr = conNames.join(' AND ');
    }

    let conn = await novalPool.getConnection();
    await conn.execute(`delete from ${table} where ${conStr}`, values);
    conn.release();
}

async function selectBySql(sql: string, ...options: any[]) {
    console.debug('selectBySql', sql);
    let conn = await novalPool.getConnection();
    // @ts-ignore
    let [rows] = await conn.query(sql, ...options);
    conn.release();
    return rows;
}

async function execute(...params: any[]) {
    let conn = await novalPool.getConnection();
    // @ts-ignore
    let ret = await conn.execute(...params);
    conn.release();
    return ret;
}

const actions: IMysqlActions = {
    insertOne,
    insertMany,
    updateOne,
    updateMany,
    deleteFrom,
    selectBySql,
    execute
}


export default actions;