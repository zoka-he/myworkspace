import { Tabs } from "antd";
import DayView from './dayView';
import FavList from './favList';
import LuggageChecklist from "./luggage";

export default function() {
    let items = [
        {
            key: '1',
            label: `天气预报`,
            children: <FavList/>,
        },
        {
            key: '2',
            label: `物品单`,
            children: <LuggageChecklist/>,
        },
    ];

    return (
        <div className="f-fit-height f-flex-col">
            <Tabs defaultActiveKey="1" items={items}/>
        </div>
    )

}