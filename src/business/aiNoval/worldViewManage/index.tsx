import { useState, useRef, useEffect } from 'react';
import fetch from '@/src/fetch';
import { Button, Input, Space, Table, message } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
import confirm from "antd/es/modal/confirm";
import QueryBar from '@/src/components/queryBar';
import usePagination from '@/src/utils/hooks/usePagination';
import WorldViewInfoEditor from './worldViewInfoEditor';
import { IWorldViewData } from '@/src/types/IAiNoval';

const { Column } = Table;

export default function WorldViewManage() {
    let [userParams, setUserParams] = useState({});

    let [listData, updateListData] = useState<IWorldViewData[]>([]);
    let [spinning, updateSpinning] = useState(false);

    let pagination = usePagination();

    let mEditor = useRef<WorldViewInfoEditor>();

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
            let {data, count} = await fetch.get('/api/aiNoval/worldView/list', { params })

            updateListData(data);
            pagination.setTotal(count);

            if (data.length === 0) {
                message.info('数据库中未存在记录！');
            }

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

    function renderAction(cell: any, row: IWorldViewData) {

        function onEdit() {
            mEditor.current?.showAndEdit(row);
        }

        const deleteRow = async () => {
            await fetch.delete(
                '/api/web/aiNoval/worldView', 
                { 
                    params: { 
                        id: row.id,
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
                content: '警告！将删除对象，请二次确认！',
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

    function renderTotal(total: number) {
        return `共 ${total} 个记录`;
    }

    function renderYesNo(cell: string) {
        if ('' + cell != '0') {
            return <span style={{ color: 'green' }}>是</span>
        } else {
            return <span style={{ color: 'red' }}>否</span>
        }
    }

    return (
        <div className="f-fit-height f-flex-col">
            <div className="f-flex-two-side">
                <QueryBar onChange={onQuery} spinning={spinning}>
                    <QueryBar.QueryItem name="title" label="世界观">
                        <Input allowClear/>
                    </QueryBar.QueryItem>

                    <QueryBar.QueryItem name="content" label="摘要">
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
                    <Column title="世界观" dataIndex="title" key="title"/>
                    <Column title="摘要" dataIndex="content" key="content"/>
                    <Column title="是否在知识库" dataIndex="is_dify_knowledge_base" key="is_dify_knowledge_base" render={renderYesNo}/>
                    <Column title="操作" dataIndex="action" key="action" fixed="right" width={260} render={renderAction}/>
                </Table>
            </div>

            {/* @ts-ignore */}
            <WorldViewInfoEditor ref={mEditor} onFinish={() => onQuery()}/>
        </div>
    )
}