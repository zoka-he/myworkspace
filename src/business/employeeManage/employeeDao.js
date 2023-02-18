import {message} from "antd";

function check() {
    if (!window.mongodb) {
        message.error('此操作需要在electron中完成！');
        throw new Error('此操作需要在electron中完成！');
    }
}

async function queryEmployee(uiParams, page = 1, limit = 20) {
    check();

    let conditions = {};
    for (let [k, v] of Object.entries(uiParams)) {
        if (v !== 0 && v !== false && !v)
            continue;

        switch (k) {
            case 'name':
            case 'corp':
            case 'phone':
                conditions[k] = { $regex: `.*${v}.*` };
                break;
        }
    }

    return await window.mongodb.find('employee', conditions, [ ['name', 1] ], limit);
}


async function updateEmployee(oldObj, newObj) {
    check();

    const { _id } = oldObj;
    const cmd = {
        $set: newObj
    };
    return await window.mongodb.updateOne('employee', { _id }, cmd);
}


async function createEmployee(obj) {
    check();
    return await window.mongodb.insertOne('employee', obj);
}

async function deleteEmployee(obj) {
    check();

    const { _id } = obj;
    return await window.mongodb.deleteOne('employee', { _id });
}

export default {
    queryEmployee,
    updateEmployee,
    createEmployee,
    deleteEmployee,
}