import { Tabs } from "antd";
import Security from './security';

export default function() {
    let items = [
        {
            key: '1',
            label: `账号安全`,
            children: <Security/>
        },
        {
            key: '2',
            label: `偏好设定`,
        },
    ];

    return (
        <div className="f-fit-height f-flex-col">
            <Tabs defaultActiveKey="1" items={items}/>
        </div>
    )
}