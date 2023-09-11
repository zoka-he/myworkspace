import React, {useEffect, useRef, useState} from "react";
import {Button, Input, Space, Spin, Table} from "antd";
import {ExclamationCircleFilled} from "@ant-design/icons";
import moment from "moment";
import EmployeeEditor from "./employeeEditor";
import {message} from "antd";
import _ from 'lodash';
import confirm from "antd/es/modal/confirm";
import fetch from '@/src/fetch';
import QueryBar from "@/src/components/queryBar";
import usePagination from "@/src/utils/hooks/usePagination";

const { Column } = Table;

export default function () {

    let [listData, updateListData] = useState([]);
    let [spinning, updateSpinning] = useState(false);

    let [queryParams, setQueryParams] = useState({});
    let pagination = usePagination();

    let mEditor = useRef();

    async function onQuery() {
        try {
            updateSpinning(true);

            let options = {
                ...queryParams,
                page: pagination.page,
                limit: pagination.pageSize
            };

            let { data, count } = await fetch.get('/api/employee/list', { params: options });

            updateListData(data);
            pagination.setTotal(count);
        } catch (e) {
            console.error(e);
        } finally {
            updateSpinning(false);
            console.debug(listData);
        }

    }


    useEffect(() => {
        onQuery();
    }, []);

    useEffect(() => {
        onQuery();
    }, [queryParams, pagination.pageSize, pagination.page]);


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

    return (
        <div className="f-fit-height f-flex-col">
            <div className="f-flex-two-side">
                <QueryBar onChange={setQueryParams} spinning={spinning}>
                    <QueryBar.QueryItem label="姓名" name="name">
                        <Input allowClear/>
                    </QueryBar.QueryItem>
                </QueryBar>

                <Spin spinning={spinning}>
                    <Space>
                        <Button onClick={onCreateTask} type={'primary'}>添加</Button>
                    </Space>
                </Spin>
            </div>


            <div className="f-flex-1" style={{ margin: '12px 0' }}>
                <Table dataSource={listData} size={'small'} pagination={pagination}>
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