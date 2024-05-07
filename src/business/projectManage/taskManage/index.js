import React, {useEffect, useRef, useState} from "react";
import {Tabs} from "antd";
import TaskList from './taskList'
import TaskCount from './taskCount';

export default function () {

    let items = [
        {
            key: '1',
            label: `任务列表`,
            children: <TaskList/>,
        },
        {
            key: '2',
            label: `任务统计`,
            children: <TaskCount/>,
        }
    ];

    return (
        <div className="f-fit-height f-flex-col">
            <Tabs defaultActiveKey="1" items={items}/>
        </div>
    )
}