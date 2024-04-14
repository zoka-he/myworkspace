import QueryBar from '@/src/components/queryBar';
import { Select } from 'antd';
import { useEffect, useState } from 'react';
import Fig from './fig';
import fetch from '@/src/fetch';

export default function() {
    let [queryParams, setQueryParams] = useState({
        limit: 30
    });
    let [figData, setFigData] = useState<any[]>([]);

    useEffect(() => {
        onRefresh();
    }, []);

    useEffect(() => {
        onRefresh();
    }, [queryParams]);

    async function onRefresh() {
        let data = await fetch.get('/api/task/figure/cumulative', { params: queryParams });
        if (data instanceof Array) {
            setFigData(data);
        }
    }

    let limitOptions = Array.from({ length: 30 }, (v, i) => ({ value: i + 1 }));

    return (
        <div className='l-with-querybar f-fit-content'>
            <QueryBar onChange={setQueryParams} initValue={queryParams}>
                <QueryBar.QueryItem label="统计天数" name="limit">
                    <Select options={limitOptions} style={{ width: '6em' }}></Select>
                </QueryBar.QueryItem>
            </QueryBar>
            <div className="l-content">
                <Fig data={figData}></Fig>
            </div>
        </div>
    )
}