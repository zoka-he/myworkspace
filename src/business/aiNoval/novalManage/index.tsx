import { useState, useRef, useEffect } from 'react';
import fetch from '@/src/fetch';
import { Button, Input, Space, Table, message } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
import confirm from "antd/es/modal/confirm";
import QueryBar from '@/src/components/queryBar';
import usePagination from '@/src/utils/hooks/usePagination';
import NovalInfoEditor from './novalInfoEditor';
import { INovalData } from '@/src/types/IAiNoval';

const { Column } = Table;

export default function NovalManage() {
    let [userParams, setUserParams] = useState({});

    let [listData, updateListData] = useState<INovalData[]>([]);
    let [spinning, updateSpinning] = useState(false);

    let pagination = usePagination();

    let mEditor = useRef<NovalInfoEditor>();

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
            let {data, count} = await fetch.get('/api/aiNoval/noval/list', { params })

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

    function renderAction(cell: any, row: INovalData) {

        function onEdit() {
            mEditor.current?.showAndEdit(row);
        }

        const deleteRow = async () => {
            await fetch.delete(
                '/api/web/aiNoval/noval', 
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
                content: '警告！将删除信息，请二次确认！',
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

    function renderRemark(cell: string) {
        return <pre className="f-no-margin">{cell}</pre>
    }

    return (
        <div className="f-fit-height f-flex-col">
            <div className="f-flex-two-side">
                <QueryBar onChange={onQuery} spinning={spinning}>
                    <QueryBar.QueryItem name="title" label="标题">
                        <Input allowClear/>
                    </QueryBar.QueryItem>

                    <QueryBar.QueryItem name="description" label="备注">
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
                    <Column title="标题" dataIndex="title" key="title"/>
                    <Column title="备注" dataIndex="description" key="description"/>
                    <Column title="操作" dataIndex="action" key="action" fixed="right" width={260} render={renderAction}/>
                </Table>
            </div>

            {/* @ts-ignore */}
            <NovalInfoEditor ref={mEditor} onFinish={() => onQuery()}/>
        </div>
    )
}