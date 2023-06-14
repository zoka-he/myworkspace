import { Tabs } from "antd";
import DayView from './dayView';
import FavList from './favList';

export default function() {
    let items = [
        {
            key: '1',
            label: `天气预报`,
            children: <FavList/>,
        },
        {
            key: '2',
            label: `日历视图`,
            children: <DayView/>,
        },
    ];

    return (
        <div className="f-fit-height f-flex-col">
            <Tabs defaultActiveKey="1" items={items}/>
        </div>
    )

}