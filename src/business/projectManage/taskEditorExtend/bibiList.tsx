import { useEffect, useRef, useState } from "react";
import { Button, message, Space, Tag } from 'antd';
import fetch from '@/src/fetch';
import DayJS from 'dayjs';
import ProjectValueMapper from '../projectCommon/projectValueMapper';
import InteractEditor from "../catfightLog/interactEditor";
import confirm from "antd/es/modal/confirm";
import {ExclamationCircleFilled, SearchOutlined} from "@ant-design/icons";

// --------------------- 沟通明细 -----------------------

interface IBibiListItemProps {
    data: any,
    onEdit: Function,
    onDelete: Function
}

function BibiListItem(props: IBibiListItemProps) {
    let data = props.data || {};

    const messageStyle = {
        display: 'inline-block', 
        backgroundColor: '#fff', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        padding: '2px 5px',
        borderRadius: '4px'
    };

    const replyStyle = {
        display: 'inline-block', 
        backgroundColor: '#dfb', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        padding: '2px 5px',
        borderRadius: '4px'
    };

    // 沟通时间，因为沟通具有时效性，选择 create_time
    let dateStr = DayJS(data.create_time).format('YYYY-MM-DD HH:mm:ss');

    // 沟通来源
    let srcStr = ProjectValueMapper.contactSrcMapper.mapValueToString(data.source);

    function onEdit(data: any) {
        if (!!props.onEdit) {
            props.onEdit(data);
        }
    }

    function onDelete(data: any) {
        if (!!props.onDelete) {
            props.onDelete(data);
        }
    }

    let they_part = null;
    if (!!data.message) {
        let title = null;
        if (data.dir === 0) { // 对方发起，对方显示详细标头
            title = <div>
                <Space>
                    <span style={{color: 'gray'}}>{data.employee}</span>
                    <span style={{color: 'gray', fontSize: '12px'}}>{dateStr}</span>
                    <Tag>{srcStr}</Tag>
                </Space>
                <Button type="link" size="small" onClick={() => onEdit(data)}>编辑</Button>
                <Button type="link" danger size="small" onClick={() => onDelete(data)}>删除</Button>
            </div>
        } else { // 我方发起，对方显示简约标头
            title = <div>
                <Space>
                    <span style={{color: 'gray'}}>{data.employee}</span>
                </Space>
            </div>
        }

        they_part = [
            title,
            <div style={{ marginTop: '5px' }}>
                <Space>
                    <span style={messageStyle}>{data.message}</span>
                </Space>
            </div>
        ]
    }

    let me_part = null;
    if (!!data.re_message) {
        let title = null;
        if (data.dir === 1) { // 我方发起，我方显示标头
            title = <div style={{ textAlign: 'right', marginTop: '5px' }}>
                <Space>
                    <Tag>{srcStr}</Tag>
                    <span style={{color: 'gray', fontSize: '12px'}}>{dateStr}</span>
                </Space>
                <Button type="link" size="small" onClick={() => onEdit(data)}>编辑</Button>
                <Button type="link" danger size="small" onClick={() => onDelete(data)}>删除</Button>
            </div>
        }

        me_part = [
            title,
            <div style={{ textAlign: 'right', marginTop: '5px' }}>
                <Space align="end">
                    <span style={replyStyle}>{data.re_message}</span>
                </Space>
            </div>
        ]
    }

    let context = [they_part, me_part];
    if (data.dir === 1) { // dir为 1 时，我方发起
        context.reverse();
    }

    return (
        <div style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
            {context}
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
    let mEditor = useRef<null | InteractEditor>(null);

    async function onQueryList() {
        if (!props.taskId) {
            return [];
        }

        try {
            let params = {
                page: pageNum,
                limit: pageSize,
                task_id: props.taskId
            };

            let {data} = await fetch.get('/api/interact/list', { params })

            updateListData(data);
        } catch (e: any) {
            console.error(e);
            message.error(e.message);
        } 
    }

    function onEditItem(data: any) {
        if (!mEditor.current) {
            return;
        }

        mEditor.current.showAndEdit(data);
    }

    const deleteRow = async (data: any) => {
        await fetch.delete('/api/interact', { params: { ID: data.ID } });

        message.success('已删除');
        onQueryList();
    }

    function onDeleteItem(data: any) {
        if (!data?.ID) {
            message.error('沟通数据缺少 ID，请检查数据库');
            return;
        }

        confirm({
            title: '删除确认',
            icon: <ExclamationCircleFilled />,
            content: '警告！将删除消息，请二次确认！',
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk() {
                deleteRow(data);
            },
            onCancel() {
                console.log('Cancel');
            },
        });
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
                <BibiListItem 
                    data={item} 
                    onEdit={(data: any) => onEditItem(data)}
                    onDelete={(data: any) => onDeleteItem(data)}
                ></BibiListItem>
            </div>
        )
    });

    return (
        <div className="f-fit-height f-flex-col">
            <Space>
                <Button style={{ width: '20em' }} onClick={() => onEditItem({ task_id: props.taskId })}>添加</Button>
            </Space>
            <div style={{ paddingRight: '20px', overflow: 'auto' }} className="f-flex-1">
                {bibiItems}
            </div>
            <InteractEditor ref={mEditor} onFinish={() => onQueryList()}/>
        </div>
    )    
}