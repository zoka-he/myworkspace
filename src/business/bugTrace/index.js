import React, {useEffect, useRef, useState} from "react";
import {Input, Button, Table, Space, message} from "antd";
import {ExclamationCircleFilled, SearchOutlined} from "@ant-design/icons";
import BugEditor from './bugEditor';
// import BugService from "./bugService";
import moment from "moment";
import _ from 'lodash';
import confirm from "antd/es/modal/confirm";
import BugStatusSelect from './bugStatusSelect';
import fetch from '@/src/fetch';

const { Column } = Table;


export default function BugTrace() {
    let [queryEmployee, updateQueryEmployee] = useState('');
    let [queryStatus, updateQueryStatus] = useState([0, 1, 2, 3]);
    let [listData, updateListData] = useState('');
    let [spinning, updateSpinning] = useState(false);
    let [pageNum, updatePageNum] = useState(1);
    let [pageSize, updatePageSize] = useState(10);
    let [total, updateTotal] = useState(0);
    let mEditor = useRef();

    useEffect(() => {
        onQuery();
    }, []);

    useEffect(() => {
        _.debounce(onQuery, 300)();
    }, [queryEmployee, queryStatus, pageSize, pageNum]);

    async function onQuery() {
        try {
            updateSpinning(true);

            let params = {
                page: pageNum,
                limit: pageSize
            };

            if (queryEmployee) {
                params.employee = queryEmployee;
            }

            if (queryStatus && queryStatus.length) {
                params.status = queryStatus;
            }

            // let {data, count} = await new BugService().queryWithTaskName(conditions, 1, 20);
            let {data, count} = await fetch.get('/api/bug/list', { params });
            updateListData(data);
            updateTotal(count);
        } catch (e) {
            console.error(e);
            message.error(e.message);
        } finally {
            updateSpinning(false);
        }
    }

    function onPageChange({ page, pageSize }) {
        updatePageNum(page);
        updatePageSize(pageSize);
    }

    function onCreateLog() {
        mEditor.current.show();
    }

    function renderTime(cell) {
        if (cell) {
            return moment(cell).format('YYYY-MM-DD HH:mm:ss');
        } else {
            return '/';
        }
    }

    function renderStatus(cell) {
        return [
            '未复现',
            '已复现',
            '修复中',
            '待复验',
            '已关闭',
        ][cell];
    }

    function renderAction(cell, row) {

        function onEdit() {
            mEditor.current.showAndEdit(row);
        }

        const deleteRow = async () => {
            // let service = new BugService();
            // await service.deleteOne(row);
            await fetch.delete('/api/bug', { params: { ID: row.ID } });
            message.success('已删除');
            onQuery();
        }

        const showDeleteConfirm = () => {
            confirm({
                title: '删除确认',
                icon: <ExclamationCircleFilled />,
                content: '警告！将删除BUG信息，请二次确认！',
                okText: '删除',
                okType: 'danger',
                cancelText: '取消',
                onOk() {
                    deleteRow();
                },
                onCancel() {
                    console.log('Cancel');
                },
            });
        };

        return <Space>
            <Button type={'primary'} onClick={onEdit}>编辑</Button>
            <Button danger onClick={showDeleteConfirm}>删除</Button>
        </Space>
    }

    function renderTotal(total) {
        return `共 ${total} 个记录`;
    }

    return (
        <div className="f-fit-height f-flex-col">
            <div className="f-flex-two-side">
                <Space>
                    <label>承接人：</label>
                    <Input value={queryEmployee} onInput={e => updateQueryEmployee(e.target.value)}/>

                    <label>状态：</label>
                    <BugStatusSelect value={queryStatus} onChange={e => updateQueryStatus(e)}/>

                    <Button icon={<SearchOutlined/>} type="primary" onClick={onQuery} loading={spinning}>查询</Button>
                </Space>

                <Space>
                    <Button type={'primary'} onClick={onCreateLog}>新增</Button>
                </Space>
            </div>


            <div className="f-flex-1" style={{ margin: '12px 0' }}>
                <Table dataSource={listData} size={'small'}
                       pagination={{ pageSize, total, onChange: onPageChange, showTotal: renderTotal }}>
                    <Column title="关联任务" dataIndex="task_name" key="task_name"/>
                    <Column title="上报渠道" dataIndex="source" key="source"/>
                    <Column title="责任人" dataIndex="employee" key="employee"/>
                    <Column title="BUG描述" dataIndex="detail" key="detail"/>
                    <Column title="解决状态" dataIndex="status" key="status" render={renderStatus}/>
                    <Column title="解决方案" dataIndex="solution" key="solution"/>
                    <Column title="复核人" dataIndex="tester" key="tester"/>
                    <Column title="创建时间" dataIndex="create_time" key="create_time" render={renderTime}/>
                    <Column title="更新时间" dataIndex="update_time" key="update_time" render={renderTime}/>
                    <Column title="操作" dataIndex="action" key="action" fixed="right" render={renderAction}/>
                </Table>
            </div>

            <BugEditor ref={mEditor} onFinish={() => onQuery()}/>
        </div>
    )
}