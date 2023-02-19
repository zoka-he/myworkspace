import React, {useEffect, useRef, useState} from "react";
import {Button, Input, Space, Spin, Table} from "antd";
import {SearchOutlined, ExclamationCircleFilled} from "@ant-design/icons";
import moment from "moment";
import EmployeeEditor from "./employeeEditor";
import {message} from "antd";
import _ from 'lodash';
import confirm from "antd/es/modal/confirm";
import fetch from '@/src/fetch';

const { Column } = Table;

export default function () {

    let [listData, updateListData] = useState([]);
    let [spinning, updateSpinning] = useState(false);
    let [pageSize, updatePageSize] = useState(10);
    let [pageNum, updatePageNum] = useState(1);
    let [dataCount, updateDataCount] = useState(0);

    let [queryEmployee, updateQueryEmployee] = useState('');

    let mEditor = useRef();

    async function onQuery() {
        try {
            updateSpinning(true);

            let options = {
                page: pageNum,
                limit: pageSize
            };

            if (queryEmployee) {
                options.name = queryEmployee;
            }

            let { data, count } = await fetch.get('/api/employee/list', { params: options });

            updateListData(data);
            updateDataCount(count);
        } catch (e) {
            console.error(e);
        } finally {
            updateSpinning(false);
            console.debug(listData);
        }

    }


    useEffect(() => {
        console.debug('useEffect');
        onQuery();
    }, []);

    useEffect(() => {
        _.debounce(onQuery, 300)();
    }, [queryEmployee, pageSize, pageNum]);


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

    function renderAction(cell, row) {
        const editRow = () => {
            mEditor.current.showAndEdit(row);
        }

        const deleteRow = async () => {
            await fetch.delete('/api/employee', { params: { ID: row.ID } });

            message.success('已删除');
            onQuery();
        }

        const showDeleteConfirm = () => {
            confirm({
                title: '删除确认',
                icon: <ExclamationCircleFilled />,
                content: '警告！将删除组员：' + row.name + '！',
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

    function onPageChange({ page, pageSize }) {
        updatePageNum(page);
        updatePageSize(pageSize);
    }

    function renderTotal(total) {
        return `共 ${total} 个记录`;
    }

    return (
        <div className="f-fit-height f-flex-col">
            <div className="f-flex-two-side">
                <Space>
                    <label>姓名：</label>
                    <Input value={queryEmployee} onInput={e => updateQueryEmployee(e.target.value)}/>

                    <Button icon={<SearchOutlined/>} type="primary" onClick={onQuery} loading={spinning}>查询</Button>
                </Space>

                <Spin spinning={spinning}>
                    <Space>
                        <Button onClick={onCreateTask} type={'primary'}>添加</Button>
                    </Space>
                </Spin>
            </div>


            <div className="f-flex-1" style={{ margin: '12px 0' }}>
                <Table dataSource={listData} size={'small'}
                       pagination={{ pageSize, total: dataCount, onChange: onPageChange, showTotal: renderTotal }}>
                    <Column title="姓名" dataIndex="name" key="name"/>
                    <Column title="手机" dataIndex="phone" key="phone"/>
                    <Column title="邮箱" dataIndex="email" key="email"/>
                    <Column title="公司" dataIndex="corp" key="corp"/>
                    <Column title="修改时间" dataIndex="update_time" key="update_time" render={renderTime}/>
                    <Column title="操作" dataIndex="action" key="action" render={renderAction} fixed={'right'}/>
                </Table>
            </div>

            <EmployeeEditor ref={mEditor} onFinish={onQuery}/>
        </div>
    )
}