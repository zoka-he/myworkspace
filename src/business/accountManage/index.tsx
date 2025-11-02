import { useState, useRef, useEffect } from 'react';
import fetch from '@/src/fetch';
import { Button, Input, Space, Table, message } from 'antd';
import { ExclamationCircleFilled, CopyOutlined } from '@ant-design/icons';
import confirm from "antd/es/modal/confirm";
import AccountEditor from './accountEditor';
import HistroyViewer from './historyViewer';
import { IAccount } from '@/src/types/IAccount';
import QueryBar from '@/src/components/queryBar';
import usePagination from '@/src/utils/hooks/usePagination';
import copyToClip from '@/src/utils/common/copy';

const { Column } = Table;

export default function AccountManage() {
    let [userParams, setUserParams] = useState({});

    let [listData, updateListData] = useState<[]>([]);
    let [spinning, updateSpinning] = useState(false);

    let pagination = usePagination();

    let mEditor = useRef<AccountEditor>();
    let mHistViewer = useRef<HistroyViewer>();

    useEffect(() => {
        onQuery();
    }, []);

    useEffect(() => {
        onQuery();
    }, [userParams, pagination.page, pagination.pageSize]);

    async function onQuery() {
        try {
            updateSpinning(true);

            let params: any = {
                ...userParams,
                page: pagination.page,
                limit: pagination.pageSize
            }

            // @ts-ignore
            let {data, count} = await fetch.get('/api/infos/account/list', { params })

            updateListData(data);
            pagination.setTotal(count);
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

    function renderCopyableCell(cell: string) {
        return (
            <Space>
                <span>{cell}</span>
                <Button
                    size="small"
                    type="link"
                    icon={<CopyOutlined />}
                    onClick={() => {
                        copyToClip(cell);
                        message.success('已复制');
                    }}
                >复制</Button>
            </Space>
        );
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
                <QueryBar onChange={setUserParams} spinning={spinning}>
                    <QueryBar.QueryItem name="sys_name" label="平台">
                        <Input allowClear/>
                    </QueryBar.QueryItem>

                    <QueryBar.QueryItem name="username" label="账户">
                        <Input allowClear/>
                    </QueryBar.QueryItem>
                </QueryBar>

                <Space>
                    <Button type={'primary'} onClick={onCreateAccount}>新增</Button>
                </Space>
            </div>


            <div className="f-flex-1" style={{ margin: '12px 0' }}>
                { /** @ts-ignore */ }
                <Table dataSource={listData} size={'small'} pagination={pagination}>
                    <Column title="平台" dataIndex="sys_name" key="task_name"/>
                    <Column title="账户" dataIndex="username" key="employee" render={renderCopyableCell}/>
                    <Column title="密码" dataIndex="passwd" key="message" render={renderCopyableCell}/>
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