import React, {useEffect, useRef, useState} from "react";
import {Tabs} from "antd";
import WheelDev from './WheelDev';
import Hubs from './Hubs';
import Rims from './Rims';
import Structures from "./Structures";
import AppendStructureDlg, { useDlg } from "./AppendStructureDlg";

export default function () {

    let dlgCtl = useDlg();

    let litems = [
        {
            key: '1',
            label: `组件`,
            children: <Structures dlgCtl={dlgCtl}/>,
        },
    ]

    let ritems = [
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
        <div className="m-wheel-dev f-fit-height f-flex-row">
            <Tabs style={{ width: '350px' }} defaultActiveKey="1" items={litems} type="card" className="f-fit-height"/>
            <Tabs style={{ flex: '1', marginLeft: '6px' }} defaultActiveKey="1" items={ritems} type="card" className="f-fit-height"/>
            <AppendStructureDlg dlgCtl={dlgCtl}/>
        </div>
    )
}