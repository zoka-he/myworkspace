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

async function getFavPosProvinces() {
    let { data } = await fetch.get('/api/roadPlan/favGeoLocation/list');

    if (!data.length) {
        return {};
    }

    let counter: { [key: string]: number } = {};
    for (let item of data) {
        if (!item?.province_code) {
            continue;
        }

        let province_id = item.province_code;

        if (typeof counter[province_id] === 'number') {
            counter[province_id] += 1;
        } else {
            counter[province_id] = 1;
        }
    }

    return counter;
}

export default function() {

    let [dataSrc, setDataSrc] = useState(EDataSource.ROADPLAN);
    let [graphData, setGraphData] = useState<any>(null);

    async function onFetch() {
        let queryFn: Function | null = null;

        switch(dataSrc) {
            case EDataSource.ROADPLAN:
                queryFn = getRoadPlanProvinces;
                break;
            case EDataSource.FAVPOS:
                queryFn = getFavPosProvinces;
                break;
        }

        if (!queryFn) {
            return;
        }

        let data = await queryFn();
        setGraphData(data);
    }
    
    useEffect(() => {
        onFetch();
    }, []);

    useEffect(() => {
        onFetch();
    }, [dataSrc]);

    let graphColor = undefined;
    let title = undefined;

    switch(dataSrc) {
        case EDataSource.ROADPLAN:
            title = '路书分布';
            graphColor = ['#e0f3f8', '#313695'];
            break;
        case EDataSource.FAVPOS:
            title = '收藏地点分布';
            graphColor = ['#d8ffaa', '#305900'];
            break;
    }

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
                <Graph data={graphData} title={title} color={graphColor}></Graph>
            </div>
        </div>
    )
}