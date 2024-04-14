import QueryBar from '@/src/components/queryBar';
import { Select } from 'antd';
import { useState } from 'react';


export default function() {
    let [queryParams, setQueryParams] = useState({});

    return (
        <div>
            <QueryBar onChange={setQueryParams} initValue={queryParams}>
                <QueryBar.QueryItem label="统计天数" name="limit">
                    <Select></Select>
                </QueryBar.QueryItem>
            </QueryBar>
        </div>
    )
}