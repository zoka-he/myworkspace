import React, {useEffect, useRef, useState} from "react";
import {Tabs} from "antd";
import WheelDev from './WheelDev';
import Hubs from './Hubs';
import Rims from './Rims';

export default function () {

    let items = [
        {
            key: '1',
            label: `轮组设定`,
            children: <WheelDev/>,
        },
        {
            key: '2',
            label: `花鼓设定`,
            children: <Hubs/>,
        },
        {
            key: '3',
            label: `车圈设定`,
            children: <Rims/>,
        },
    ];

    return (
        <div className="m-wheel-dev f-fit-height f-flex-col">
            <Tabs defaultActiveKey="1" items={items} type="card" className="f-fit-height"/>
        </div>
    )
}