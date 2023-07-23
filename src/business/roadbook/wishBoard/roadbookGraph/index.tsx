import { Select, Space, Button } from "antd";
import { useEffect, useState } from "react";
import Graph from "./graph";
import fetch from '@/src/fetch';
import GeoCoder from "@/src/utils/geo/GeoCoder";

enum EDataSource {
    ROADPLAN = 'roadplan',
    FAVPOS = 'favpos'
}

async function getRoadPlanProvinces() {
    let { data } = await fetch.get('/api/roadPlan/list');

    if (!data.length) {
        return {};
    }

    let counter: { [key: string]: number } = {};
    for (let item of data) {
        if (!item?.provinces?.length) {
            continue;
        }

        for (let province_id of item.provinces) {
            if (typeof counter[province_id] === 'number') {
                counter[province_id] += 1;
            } else {
                counter[province_id] = 1;
            }
        }
    }

    return counter;
}

export default function() {

    let [dataSrc, setDataSrc] = useState(EDataSource.ROADPLAN);

    let [graphData, setGraphData] = useState<any>(null);

    async function onFetch() {
        let data = await getRoadPlanProvinces();
        setGraphData(data);
    }
    
    useEffect(() => {
        onFetch();
    }, []);

    useEffect(() => {
        onFetch();
    }, [dataSrc]);

    return (
        <div className="m-wishboard-roadbookgraph">
            <Space>
                <label>数据源：</label>
                <Select value={dataSrc} onChange={setDataSrc} style={{ width: '140px' }}>
                    <Select.Option value={EDataSource.ROADPLAN}>路书</Select.Option>
                    <Select.Option value={EDataSource.FAVPOS}>收藏地点</Select.Option>
                </Select>
                <Button onClick={onFetch}>刷新</Button>
            </Space>
            <div>
                <Graph data={graphData}></Graph>
            </div>
        </div>
    )
}