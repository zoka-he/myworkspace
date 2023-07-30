import { Tabs } from 'antd';
import RoadbookGraph from './roadbookGraph';
import FavPosManage from './favPosManage';

export default function WishBoard() {

    let items = [
        {
            key: '1',
            label: `收藏地点管理`,
            children: <FavPosManage/>
        },
        {
            key: '2',
            label: `路书分布`,
            children: <RoadbookGraph/>
        },
    ];

    return (
        <div className="m-wishboard f-fit-height f-flex-row">
            <Tabs style={{ flex: '1', marginLeft: '6px' }} defaultActiveKey="1" items={items} className="f-fit-height"/>
        </div>
    )
}