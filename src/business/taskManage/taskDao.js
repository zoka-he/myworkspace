import {message} from "antd";

function check() {
    if (!window.mongodb) {
        message.error('此操作需要在electron中完成！');
        throw new Error('此操作需要在electron中完成！');
    }
}

async function queryTask(uiParams, page = 1, limit = 20) {
    check();

    let conditions = {};
    for (let [k, v] of Object.entries(uiParams)) {
        if (v !== 0 && v !== false && !v)
            continue;

        switch (k) {
            case 'taskName':
            case 'employee':
                conditions[k] = { $regex: `.*${v}.*` };
                break;

            case 'status':
            case 'priority':
                conditions[k] = v;
                break;
        }
    }

    return await window.mongodb.find('tasks', conditions, [ ['priority', -1], ['createTime', 1] ], limit);
}

async function queryDashboardTask(uiParams, page = 1, limit = 100) {
    check();

    let conditions = {};
    for (let [k, v] of Object.entries(uiParams)) {
        if (v !== 0 && v !== false && !v)
            continue;

        switch (k) {
            case 'taskName':
            case 'employee':
                conditions[k] = { $regex: `.*${v}.*` };
                break;

            case 'status':
            case 'priority':
                conditions[k] = v;
                break;
        }
    }

    conditions.status = { $ne: 5 };
    return await window.mongodb.find('tasks', conditions, [ ['priority', -1], ['dispOrder', 1] ], limit);
}

async function updateTask(oldObj, newObj) {
    check();

    const { _id } = oldObj;
    const cmd = {
        $set: newObj
    };
    return await window.mongodb.updateOne('tasks', { _id }, cmd);
}

async function updateTaskOrder( task, order ) {
    check();

    const { _id } = task;
    const cmd = {
        $set: {
            dispOrder: order
        }
    };

    return await window.mongodb.updateOne('tasks', { _id }, cmd);
}

async function createTask(obj) {
    check();
    return await window.mongodb.insertOne('tasks', obj);
}

async function deleteTask(obj) {
    check();

    const { _id } = obj;
    return await window.mongodb.deleteOne('tasks', { _id });
}

export default {
    queryTask,
    queryDashboardTask,
    updateTask,
    updateTaskOrder,
    createTask,
    deleteTask,
}