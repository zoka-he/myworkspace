import {Button} from "antd";
import React from "react";

function renderTaskList(cell, onShowTaskInfo) {
    if (!cell) {
        return null;
    }

    let tasks = cell.split('|');
    let comps = [];

    tasks.forEach(item => {
        const onTaskClick = (task) => {
            if (!onShowTaskInfo) {
                return;
            }

            onShowTaskInfo(task);
        }

        let [ID, taskName] = item.split(':');
        comps.push(
            <tr>
                <td>{taskName}</td>
                <td>
                    <Button type={'link'} onClick={e => onTaskClick({ ID })}>详情</Button>
                </td>
            </tr>
        );
    });

    return <table>{comps}</table>
}

export default {
    renderTaskList
}