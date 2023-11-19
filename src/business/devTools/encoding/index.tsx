import { Tabs } from "antd";
import RsaTool from './rsa';

export default function() {
    let tabs = [
        {
            key: '1',
            label: `RSA`,
            children: <RsaTool></RsaTool>,
        },
    ];

    return (
        <div className="f-fit-height f-flex-col">
            <Tabs items={tabs} defaultActiveKey="1"/>
        </div>
    )
}