import { useEffect, useState } from "react";
import { Button, message, Space, Tag } from 'antd';
import fetch from '@/src/fetch';

// --------------------- 沟通明细 -----------------------

interface IBibiListItemProps {
    data: any
}

function BibiListItem(props: IBibiListItemProps) {
    let data = props.data || {};

    const messageStyle = {
        display: 'inline-block', 
        backgroundColor: '#fff', 
        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
        padding: '2px 5px',
        borderRadius: '4px'
    };

    const replyStyle = {
        display: 'inline-block', 
        backgroundColor: '#dfd', 
        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
        padding: '2px 5px',
        borderRadius: '4px'
    };

    let re_part = null;
    if (!!data.re_message) {
        re_part = <div style={{ textAlign: 'right', marginTop: '5px' }}>
            <Space align="end">
                <span style={replyStyle}>{data.re_message}</span>
                <span>&lt;&lt;--</span>
            </Space>
        </div>
    }

    

    return (
        <div style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
            <div>
                <Space>
                    <span style={{color: 'gray'}}>{data.employee}</span>
                    <Tag>{data.source}</Tag>
                    <Tag>{data.create_time}</Tag>
                </Space>
            </div>
            <div style={{ marginTop: '5px' }}>
                <Space>
                    <span>--&gt;&gt;</span>
                    <span style={messageStyle}>{data.message}</span>
                </Space>
            </div>
            {re_part}
        </div>
    );
}


// --------------------- 沟通列表 -----------------------

interface IBibiListProps {
    taskId?: number
}

export default function(props: IBibiListProps) {

    let [listData, updateListData] = useState<any[]>([]);
    let [pageNum, updatePageNum] = useState(1);
    let [pageSize, updatePageSize] = useState(20);
    let [total, updateTotal] = useState(0);

    async function onQueryList() {
        try {
            let params = {
                page: pageNum,
                limit: pageSize,
                // task_id: props.taskId
            };

            let {data, count} = await fetch.get('/api/interact/list', { params })

            updateListData(data);
            updateTotal(count);
        } catch (e: any) {
            console.error(e);
            message.error(e.message);
        } 
    }

    useEffect(() => {
        onQueryList();
    }, []);

    useEffect(() => {
        onQueryList();
    }, [props.taskId]);

    let bibiItems = listData.map(item => {
        return (
            <div>
                <BibiListItem data={item}></BibiListItem>
            </div>
        )
    });

    return (
        <div className="f-fit-height f-flex-col">
            <Space>
                <Button style={{ width: '20em' }}>添加</Button>
            </Space>
            <div style={{ paddingRight: '20px', overflow: 'auto' }} className="f-flex-1">
                {bibiItems}
            </div>
        </div>
    )    
}