import { Tabs } from 'antd';
import Cumulative from './cumulative';

export default function() {

    const tabs = [
        {
            key: '1',
            label: `累积流图`,
            children: <Cumulative></Cumulative>,
        },
        {
            key: '2',
            label: `燃尽图`,
            children: <div>燃尽图</div>,
        },
    ];

    return (
        <div className='l-with-tabs-on-top'>
            <Tabs items={tabs} defaultActiveKey="1"></Tabs>
        </div>
    )
}