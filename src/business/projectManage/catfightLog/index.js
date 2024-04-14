import React, {useEffect, useRef, useState} from "react";
import {Input, Button, Table, Space, message} from "antd";
import {ExclamationCircleFilled, SearchOutlined} from "@ant-design/icons";
import InteractEditor from './interactEditor';
import moment from "moment";
import _ from 'lodash';
import confirm from "antd/es/modal/confirm";
import fetch from '@/src/fetch';

const { Column } = Table;


export default function CatfightLog() {
    let [queryEmployee, updateQueryEmployee] = useState('');
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
    }, [queryEmployee, pageNum, pageSize]);

    async function onQuery() {
        try {
            updateSpinning(true);

            let params = {
                page: pageNum,
                limit: pageSize
            };
            if (queryEmployee) {
                params.employee = employee;
            }

            let {data, count} = await fetch.get('/api/interact/list', { params })

            updateListData(data);
            updateTotal(count);
        } catch (e) {
            console.error(e);
            message.error(e.message);
        } finally {
            updateSpinning(false);
        }
    }

    function onCreateLog() {
        mEditor.current.show();
    }

    function onPageChange({ page, pageSize }) {
        updatePageNum(page);
        updatePageSize(pageSize);
    }

    function renderTime(cell) {
        if (cell) {
            return moment(cell).format('YYYY-MM-DD HH:mm:ss');
        } else {
            return '/';
        }
    }

    function renderSource(cell) {
        return {
            email: '邮件',
            oa: 'OA',
            bb: '口头',
        }[cell];
    }

    function renderAction(cell, row) {

        function onEdit() {
            mEditor.current.showAndEdit(row);
        }

        const deleteRow = async () => {
            await fetch.delete('/api/interact', { params: { ID: row.ID } });

            message.success('已删除');
            onQuery();
        }

        const showDeleteConfirm = () => {
            confirm({
                title: '删除确认',
                icon: <ExclamationCircleFilled />,
                content: '警告！将删除消息，请二次确认！',
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
                    <Input value={queryEmployee} onInput={e => updateQueryEmployee(e.currentTarget.value)}/>

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
                    <Column title="提议人" dataIndex="employee" key="employee"/>
                    <Column title="提议内容" dataIndex="message" key="message"/>
                    <Column title="来源" dataIndex="source" key="source" render={renderSource}/>
                    <Column title="答复内容" dataIndex="re_message" key="re_message"/>
                    <Column title="创建时间" dataIndex="create_time" key="create_time" render={renderTime}/>
                    <Column title="更新时间" dataIndex="update_time" key="update_time" render={renderTime}/>
                    <Column title="操作" dataIndex="action" key="action" fixed="right" render={renderAction}/>
                </Table>
            </div>

            <InteractEditor ref={mEditor} onFinish={() => onQuery()}/>
        </div>
    )
}