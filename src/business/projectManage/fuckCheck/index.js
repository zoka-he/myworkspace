import React, {useEffect, useRef, useState} from "react";
import {Button, Input, Space, Spin, Table, Switch} from "antd";
import moment from "moment";
import {message} from "antd";
import _ from 'lodash';
import confirm from "antd/es/modal/confirm";
import UplineCheckEditor from './uplineCheckEditor';
import FuckCheckUtils from './fuckCheckUtils';
import TaskEditor from '../taskEditor';
import fetch from '@/src/fetch';

const { Column } = Table;

export default function () {

    let [listData, updateListData] = useState([]);
    let [spinning, updateSpinning] = useState(false);

    let [pageNum, updatePageNum] = useState(1);
    let [pageSize, updatePageSize] = useState(10);
    let [total, updateTotal] = useState(0);

    let mEditor = useRef();
    let mTaskEditor = useRef();

    async function onQuery() {
        try {
            updateSpinning(true);
            let data = await fetch.get('/api/fuckCheck/list');

            updateListData(data);

        } catch (e) {
            console.error(e);
        } finally {
            updateSpinning(false);
            console.debug(listData, total);
        }

    }


    useEffect(() => {
        console.debug('useEffect');
        onQuery();
    }, []);


    function renderTime(cell, row) {
        let timeStr = '/';
        if (cell) {
            try {
                timeStr = moment(cell).format('YYYY-MM-DD HH:mm:ss');
            } catch (e) {
                timeStr = `错误的数据类型：${typeof cell}`
            }
        }
        return <span>{timeStr}</span>;
    }

    function renderDate(cell, row) {
        let timeStr = '/';
        if (cell) {
            try {
                timeStr = moment(cell).format('YYYY-MM-DD');
            } catch (e) {
                timeStr = `错误的数据类型：${typeof cell}`
            }
        }
        return <span>{timeStr}</span>;
    }

    function renderAction(cell, row) {
        const editRow = () => {
            mEditor.current.showAndEdit(row);
        }


        return (
            <Space>
                <Button type={'primary'} onClick={editRow}>编辑</Button>
            </Space>
        )
    }

    function onPageChange({ current, pageSize }) {
        updatePageNum(current);
        updatePageSize(pageSize);
        console.debug('pageSizeChange', current, pageSize);
    }

    function renderPageTotal(n) {
        return `共 ${n} 个记录`;
    }

    function showTaskInfo(task) {
        // message.info(`打开ID为${task.ID}的任务`);
        if (mTaskEditor?.current) {
            mTaskEditor.current.showAndEdit(task);
        }
    }

    function renderTaskList(cell) {
        let tasks = cell.split('|');
        let comps = [];

        tasks.forEach(item => {
            let [ID, taskName] = item.split(':');
            comps.push(
                <tr>
                    <td>{taskName}</td>
                    <td>
                        <Button type={'link'} onClick={e => showTaskInfo({ ID })}>详情</Button>
                    </td>
                </tr>
            );
        });

        return <table>{comps}</table>
    }

    return (
        <div className="f-fit-height f-flex-col">

            <div className="f-flex-1" style={{ margin: '12px 0' }}>
                <Table dataSource={listData} size={'small'} pagination={{page: pageNum, pageSize, total, showTotal: renderPageTotal}} onChange={onPageChange}>
                    <Column title="上线日期" dataIndex="tu_fuck_date" key="tu_fuck_date" width={160} render={renderDate}/>
                    <Column title="系统" dataIndex="tu_sys_name" key="tu_sys_name" width={160}/>
                    <Column title="任务情况" dataIndex="tlist" key="tlist" width={300} render={(cell) => FuckCheckUtils.renderTaskList(cell, task => showTaskInfo(task))}/>
                    <Column title="网络关系申请" dataIndex="req_net" key="req_net" width={200}/>
                    <Column title="SA申请" dataIndex="req_sa" key="req_sa" width={200}/>
                    <Column title="root申请" dataIndex="req_root" key="req_root" width={200}/>
                    <Column title="负载均衡申请" dataIndex="req_f5" key="req_f5" width={200}/>
                    <Column title="问题" dataIndex="crash_info" key="crash_info" width={200}/>
                    <Column title="操作" dataIndex="action" key="action" render={renderAction} fixed={'right'}/>
                </Table>
            </div>

            <UplineCheckEditor ref={mEditor} onFinish={onQuery}/>
            <TaskEditor ref={mTaskEditor} onFinish={onQuery}/>
        </div>
    )
}