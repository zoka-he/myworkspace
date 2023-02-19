import React, {useEffect, useRef, useState} from "react";
import {Button, Input, Space, Spin, Table, Switch} from "antd";
import {SearchOutlined, ExclamationCircleFilled} from "@ant-design/icons";
import TaskStatusSelect from './taskStatusSelect';
import moment from "moment";
import TaskEditor from "../taskEditor";
import {message} from "antd";
import _ from 'lodash';
import confirm from "antd/es/modal/confirm";
// import TaskService from './taskService';
import fetch from '@/src/fetch';

const { Column } = Table;

export default function () {

    let [listData, updateListData] = useState([]);
    let [spinning, updateSpinning] = useState(false);

    let [queryTaskName, updateQueryTaskName] = useState('');
    let [queryEmployee, updateQueryEmployee] = useState('');
    let [queryStatus, updateQueryStatus] = useState([0, 1, 2, 3, 4]);

    let [pageNum, updatePageNum] = useState(1);
    let [pageSize, updatePageSize] = useState(10);
    let [total, updateTotal] = useState(0);

    let mEditor = useRef();

    async function onQuery() {
        try {
            updateSpinning(true);

            let params = {
                page: pageNum,
                limit: pageSize
            };
            if (queryTaskName) {
              params.task_name = queryTaskName;
            }
            if (queryEmployee) {
              params.employee = queryEmployee;
            }
            if (queryStatus) {
              params.status = queryStatus;
            }

            // let service = new TaskService();
            // let { data, count } = await service.query(queryObject, [], ['priority desc', 'create_time asc'], pageNum, pageSize);
            let { data, count } = await fetch.get('/api/task/list', { params });


            updateListData(data);
            updateTotal(count);

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

    useEffect(() => {
        _.debounce(onQuery, 300)();
    }, [queryTaskName, queryEmployee, queryStatus, pageNum, pageSize]);

    async function onExport() {

    }

    function onCreateTask() {
        mEditor.current.show();
    }

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

        const deleteRow = async () => {
            // await new TaskService().deleteOne(row);
            await fetch.delete('/api/task', { params: { ID: row.ID } });

            message.success('已删除');
            onQuery();
        }

        const showDeleteConfirm = () => {
            confirm({
                title: '删除确认',
                icon: <ExclamationCircleFilled />,
                content: '警告！将删除任务：' + row.task_name + '！',
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



        return (
            <Space>
                <Button type={'primary'} onClick={editRow}>编辑</Button>
                <Button type={'primary'} danger onClick={showDeleteConfirm}>删除</Button>
            </Space>
        )
    }

    function renderState(cell, row) {
        return [
            <span>未开始</span>,
            <span>开发中</span>,
            <span>测试中</span>,
            <span>待上线</span>,
            <span>已完成</span>,
            <span>已关闭</span>,
        ][cell];
    }

    function renderPriority(cell, row) {
        return [
            <span>普通</span>,
            <span className={'f-red'}>紧急</span>,
        ][cell];
    }

    function renderIndex(cell, row, index) {
        return <span>{index+1}</span>
    }

    function onPageChange({ current, pageSize }) {
        updatePageNum(current);
        updatePageSize(pageSize);
        console.debug('pageSizeChange', current, pageSize);
    }

    function renderPageTotal(n) {
        return `共 ${n} 个记录`;
    }

    function renderWeekReportSwitch(cell, row) {
        let val = cell === 1;

        const onChange = async (v) => {
            let is_week_report = v ? 1 : 0;
            // await new TaskService().updateOne(row, { is_week_report });
            await fetch.post('/api/task', { is_week_report }, { params: { ID: row.ID } });

            onQuery();
        }

        return <Switch checkedChildren="开" unCheckedChildren="关" checked={val} onChange={onChange}/>
    }

    return (
        <div className="f-fit-height f-flex-col">
            <div className="f-flex-two-side">
                <Space>
                    <label>任务名称：</label>
                    <Input value={queryTaskName} onInput={e => updateQueryTaskName(e.target.value)}/>

                    <label>承接人：</label>
                    <Input value={queryEmployee} onInput={e => updateQueryEmployee(e.target.value)}/>

                    <label>任务状态：</label>
                    <TaskStatusSelect value={queryStatus} onChange={e => updateQueryStatus(e)}/>

                    <Button icon={<SearchOutlined/>} type="primary" onClick={onQuery} loading={spinning}>查询</Button>
                </Space>

                <Spin spinning={spinning}>
                    <Space>
                        <Button onClick={onCreateTask} type={'primary'}>添加</Button>
                        <Button onClick={onExport}>导出</Button>
                    </Space>
                </Spin>
            </div>


            <div className="f-flex-1" style={{ margin: '12px 0' }}>
                <Table dataSource={listData} size={'small'} pagination={{page: pageNum, pageSize, total, showTotal: renderPageTotal}} onChange={onPageChange}>
                    <Column title="序号" dataIndex="index" key="index" render={renderIndex} align={'center'}/>
                    <Column title="任务名称" dataIndex="task_name" key="task_name" width={260}/>
                    <Column title="归属系统" dataIndex="sys_name" key="sys_name" width={200}/>
                    <Column title="承接人" dataIndex="employee" key="employee"/>
                    <Column title="优先级" dataIndex="priority" key="priority" render={renderPriority} align={'center'}/>
                    <Column title="任务描述" dataIndex="detail" key="detail" width={400}/>
                    <Column title="状态" dataIndex="status" key="status" render={renderState} width={90}/>
                    <Column title="上线日期" dataIndex="fuck_date" key="fuck_date" render={renderDate} width={160}/>
                    <Column title="截止日期" dataIndex="deadline_time" key="deadline_time" render={renderDate} width={160}/>
                    <Column title="创建时间" dataIndex="create_time" key="create_time" render={renderDate} width={160}/>
                    {/*<Column title="修改时间" dataIndex="update_time" key="update_time" render={renderTime}/>*/}
                    <Column title="周报" dataIndex="is_week_report" key="is_week_report" render={renderWeekReportSwitch} fixed={'right'}/>
                    <Column title="操作" dataIndex="action" key="action" render={renderAction} fixed={'right'}/>
                </Table>
            </div>

            <TaskEditor ref={mEditor} onFinish={onQuery}/>
        </div>
    )
}