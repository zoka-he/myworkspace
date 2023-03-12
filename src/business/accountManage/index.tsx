import { useState, useRef, useEffect } from 'react';
import fetch from '@/src/fetch';
import { Button, Input, Space, Table, message } from 'antd';
import { SearchOutlined, ExclamationCircleFilled } from '@ant-design/icons';
import confirm from "antd/es/modal/confirm";
import _ from 'lodash';
import AccountEditor from './accountEditor';
import HistroyViewer from './historyViewer';
import { IAccount } from '@/src/types/IAccount';

const { Column } = Table;

export default function AccountManage() {
    let [querySysName, updateQuerySysName] = useState('');
    let [queryUsername, updateQueryUsername] = useState('');
    let [listData, updateListData] = useState<[]>([]);
    let [spinning, updateSpinning] = useState(false);
    let [pageNum, updatePageNum] = useState(1);
    let [pageSize, updatePageSize] = useState(20);
    let [total, updateTotal] = useState(0);

    let mEditor = useRef<AccountEditor>();
    let mHistViewer = useRef<HistroyViewer>();

    useEffect(() => {
        onQuery();
    }, []);

    useEffect(() => {
        _.debounce(onQuery, 300)();
    }, [querySysName, pageNum, pageSize]);

    async function onQuery() {
        try {
            updateSpinning(true);

            let params: any = {
                page: pageNum,
                limit: pageSize
            };

            if (querySysName) {
                params.sys_name = querySysName;
            }

            if (queryUsername) {
                params.username = queryUsername;
            }

            // @ts-ignore
            let {data, count} = await fetch.get('/api/infos/account/list', { params })

            updateListData(data);
            updateTotal(count);
        } catch (e:any) {
            console.error(e);
            message.error(e.message);
        } finally {
            updateSpinning(false);
        }
    }

    function onCreateAccount() {
        mEditor.current?.show();
    }

    function onPageChange({ page, pageSize }: { page: number, pageSize: number }) {
        updatePageNum(page);
        updatePageSize(pageSize);
    }

    function renderSource(cell: string) {
        return {
            email: '邮件',
            oa: 'OA',
            bb: '口头',
        }[cell];
    }

    function renderAction(cell: any, row: IAccount) {

        function onEdit() {
            mEditor.current?.showAndEdit(row);
        }

        const deleteRow = async () => {
            await fetch.delete(
                '/api/infos/account', 
                { 
                    params: { 
                        sys_name: row.sys_name,
                        username: row.username 
                    } 
                }
            );

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

        const showHistroy = () => {
            let handler = mHistViewer?.current;
            if (handler) {
                handler.show(row)
            }
        }

        return <Space>
            <Button type={'primary'} onClick={onEdit}>编辑</Button>
            <Button onClick={showHistroy}>历史记录</Button>
            <Button danger onClick={showDeleteConfirm}>删除</Button>
        </Space>
    }

    function renderTotal(total: number) {
        return `共 ${total} 个记录`;
    }

    function renderRemark(cell: string) {
        return <pre className="f-no-margin">{cell}</pre>
    }

    return (
        <div className="f-fit-height f-flex-col">
            <div className="f-flex-two-side">
                <Space>
                    <label>平台：</label>
                    <Input value={querySysName} onInput={e => updateQuerySysName(e.target.value)}/>

                    <label>账户：</label>
                    <Input value={queryUsername} onInput={e => updateQueryUsername(e.target.value)}/>

                    <Button icon={<SearchOutlined/>} type="primary" onClick={onQuery} loading={spinning}>查询</Button>
                </Space>

                <Space>
                    <Button type={'primary'} onClick={onCreateAccount}>新增</Button>
                </Space>
            </div>


            <div className="f-flex-1" style={{ margin: '12px 0' }}>
                <Table dataSource={listData} size={'small'}
                        pagination={{ pageSize, total, onChange: onPageChange, showTotal: renderTotal }}>
                    <Column title="平台" dataIndex="sys_name" key="task_name"/>
                    <Column title="账户" dataIndex="username" key="employee"/>
                    <Column title="密码" dataIndex="passwd" key="message"/>
                    <Column title="备注" dataIndex="remark" key="source" render={renderRemark}/>
                    <Column title="操作" dataIndex="action" key="action" fixed="right" width={260} render={renderAction}/>
                </Table>
            </div>

            {/* @ts-ignore */}
            <AccountEditor ref={mEditor} onFinish={() => onQuery()}/>

            {/* @ts-ignore */}
            <HistroyViewer ref={mHistViewer}/>
        </div>
    )
}