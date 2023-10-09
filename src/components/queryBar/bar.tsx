import { ReactNode, useEffect, useRef, useState } from "react";
import ParamsContext from './paramsContext';
import { Button, Space } from "antd";
import { SearchOutlined } from '@ant-design/icons';
import _ from 'lodash';
import useDebounce from "@/src/utils/hooks/useDebounce";

interface IQueryBarProps {
    refreshBtn?: boolean
    children?: ReactNode | ReactNode[]
    onChange?: Function
    spinning?: boolean,
    initValue?: any
}

export default function(props: IQueryBarProps) {
    let [params, setParams] = useState<any>(props?.initValue || {});

    let debounceQuery = useDebounce(proxyOnChange, 300);
    useEffect(() => debounceQuery(), [params]);


    let { children, refreshBtn, onChange, spinning } = props;

    if (typeof refreshBtn !== 'boolean') {
        refreshBtn = true;
    }

    if (typeof spinning !== 'boolean') {
        spinning = false;
    }

    function proxyOnChange() {
        if (typeof onChange !== 'function') {
            return;
        }

        onChange(params);
    }

    function renderRefreshBtn() {
        if (!refreshBtn) {
            return null;
        }
        return <Button icon={<SearchOutlined/>} type="primary" onClick={proxyOnChange} loading={spinning}>查询</Button>;
    }
    

    return (
        <div className="comp-query-bar">
            <ParamsContext.Provider value={{ params, setParams, spinning }}>
                { children }
            </ParamsContext.Provider>
            {renderRefreshBtn()}
        </div>
    )
}