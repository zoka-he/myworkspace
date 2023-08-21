import { Tabs } from "antd";
import Security from './security';
import qs from 'querystring';
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Personalize from "./personalize";

export default function() {
    let location = useLocation();
    let [tabKey, setTabKey] = useState('1');

    // 初始化
    useEffect(() => {
        onLocationChange();
    }, []);

    // 路径变化时调用
    useEffect(() => {
        onLocationChange();
    }, [location]);

    function onLocationChange() {
        let locationSearch = location.search || '';
        if (locationSearch.startsWith('?')) {
            locationSearch = locationSearch.substring(1);
        }
        let urlQuery = qs.parse(locationSearch);

        if (urlQuery.tabKey && tabKey !== urlQuery.tabKey) {
            if (urlQuery.tabKey instanceof Array) {
                setTabKey(urlQuery.tabKey[0]);
            } else {
                setTabKey(urlQuery.tabKey);
            }
        } 
    }

    let items = [
        {
            key: '1',
            label: `账号安全`,
            children: <Security/>
        },
        {
            key: '2',
            label: `偏好设定`,
            children: <Personalize/>
        },
    ];

    function onActiveChange(e: any) {
        setTabKey(e);
    }

    return (
        <div className="f-fit-height f-flex-col">
            <Tabs activeKey={tabKey} items={items} onChange={onActiveChange}/>
        </div>
    )
}