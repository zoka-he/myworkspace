import React, {useEffect, useRef, useState} from "react";
import {Tabs} from "antd";
import WheelDev from './wheelDev';

export default function () {

    let items = [
        {
            key: '1',
            label: `轮组设定`,
            children: <WheelDev/>,
        },
    ];

    return (
        <div className="m-wheel-dev f-fit-height f-flex-col">
            <Tabs defaultActiveKey="1" items={items} type="card" className="f-fit-height"/>
        </div>
    )
}