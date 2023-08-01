import { Button, Input, Space, Table, message, Modal } from "antd";
import { useEffect, useRef, useState } from "react";
import AppendNodeModal from "./appendNodeModal";
import fetch from '@/src/fetch';
import type { IPermission } from "./IPermission";
import getPermissionTree from "./getPermissionTree";
import { ExclamationCircleFilled } from '@ant-design/icons';
import _ from 'lodash';

export default function() {
    let [queryName, setQueryName] = useState<string>('');
    let [queryUrl, setQueryUrl] = useState<string>('');
    let [tableData, setTableData] = useState<(IPermission & any)[]>([]);
    let permissionMap = useRef<Map<number, IPermission> | null>(null);
    let appendNodeModalHelper = AppendNodeModal.useModalHelper();

    useEffect(() => {
        onQuery();
    }, []);

    async function onQuery() {
        let { tree, map } = await getPermissionTree();
        setTableData(tree);
        permissionMap.current = map;
    }

    async function onAppendNode(parent?: IPermission) {
        if (!parent) {
            appendNodeModalHelper.showAndEdit(null);
        } else {
            let PID = parent.ID;
            appendNodeModalHelper.showAndEdit({ PID });
        }
    }

    async function onEditNode(node: IPermission) {
        appendNodeModalHelper.showAndEdit(node);
    }

    function onDeleteNode(node: IPermission) {
        Modal.confirm({
            title: '删除确认',
            icon: <ExclamationCircleFilled />,
            content: '警告！将删除节点，请二次确认！',
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            async onOk() {
                try {
                    let { ID } = node;
                    await fetch.delete('/api/user/permission', { params: { ID } });
                    message.success('已删除“' + node.label + '”');
                } catch(e:any) {
                    console.error(e);
                    message.error(e.message);
                } finally {
                    onQuery();
                }
            },
            onCancel() {
                message.warning('已取消操作！');
            },
        });
    }

    async function onMoveUpNode(node: IPermission) {
        let { ID, PID } = node;
        let nodeList;
        if (typeof PID !== 'number' || PID === 0) {
            nodeList = [...tableData];
        } else if (permissionMap.current) {
            let children = permissionMap.current.get(PID)?.children;
            if (!children?.length) {
                message.error('找不到正确的父节点，无法调整顺序(0)');
                return;
            }
            nodeList = [...children];
        } else {
            message.error('找不到正确的父节点，无法调整顺序(1)');
            return;
        }

        let _thisPos = _.findIndex(nodeList, { ID });
        if (_thisPos === -1) {
            message.error('找不到正确的父节点，无法调整顺序(2)');
            return;
        }

        if (_thisPos === 0) {
            message.warning('到达边界，无法执行命令');
            return;
        }

        let updateData: IPermission[] = [];

        nodeList.forEach((item, index) => {
            if (index === _thisPos) {
                updateData.push({ ID: item.ID, dispOrder: _thisPos - 1 });
            } else if (index === _thisPos - 1) {
                updateData.push({ ID: item.ID, dispOrder: _thisPos });
            } else if (item.dispOrder !== index) {
                updateData.push({ ID: item.ID, dispOrder: index });
            } 
        });

        
        try {
            await Promise.all(updateData.map(item => {
                return fetch.post(
                    '/api/user/permission', 
                    { dispOrder: item.dispOrder }, 
                    { params: { ID: item.ID } }
                );
            }));
            message.success('执行成功');
        } catch(e: any) {
            console.error(e);
            message.error(e.message);
        } finally {
            onQuery();
        }
    }

    async function onMoveDownNode(node: IPermission) {
        let { ID, PID } = node;
        let nodeList;
        if (typeof PID !== 'number' || PID === 0) {
            nodeList = [...tableData];
        } else if (permissionMap.current) {
            let children = permissionMap.current.get(PID)?.children;
            if (!children?.length) {
                message.error('找不到正确的父节点，无法调整顺序(0)');
                return;
            }
            nodeList = [...children];
        } else {
            message.error('找不到正确的父节点，无法调整顺序(1)');
            return;
        }

        let _thisPos = _.findIndex(nodeList, { ID });
        if (_thisPos === -1) {
            message.error('找不到正确的父节点，无法调整顺序(2)');
            return;
        }

        if (_thisPos === nodeList.length - 1) {
            message.warning('到达边界，无法执行命令');
            return;
        }

        let updateData: IPermission[] = [];

        nodeList.forEach((item, index) => {
            if (index === _thisPos) {
                updateData.push({ ID: item.ID, dispOrder: _thisPos + 1 });
            } else if (index === _thisPos + 1) {
                updateData.push({ ID: item.ID, dispOrder: _thisPos });
            } else if (item.dispOrder !== index) {
                updateData.push({ ID: item.ID, dispOrder: index });
            }
        });

        
        try {
            await Promise.all(updateData.map(item => {
                return fetch.post(
                    '/api/user/permission', 
                    { dispOrder: item.dispOrder }, 
                    { params: { ID: item.ID } }
                );
            }));
            message.success('执行成功');
        } catch(e: any) {
            console.error(e);
            message.error(e.message);
        } finally {
            onQuery();
        }
    }

    function renderAction(cell: any, row: any) {
        return (
            <Space>
                <Button size="small" onClick={() => onAppendNode(row)}>添加</Button>
                <Button size="small" onClick={() => onEditNode(row)}>编辑</Button>
                <Button size="small" onClick={() => onMoveUpNode(row)}>上移</Button>
                <Button size="small" onClick={() => onMoveDownNode(row)}>下移</Button>
                <Button size="small" danger onClick={() => onDeleteNode(row)}>删除</Button>
            </Space>
        )
    }

    return (
        <div className="f-fit-content">
            <div className="f-flex-two-side">
                <Space>
                    <label>名称：</label>
                    <Input value={queryName} onInput={(e) => { setQueryName((e.target as HTMLInputElement).value) }}/>
                    <label>URL：</label>
                    <Input value={queryUrl} onInput={(e) => { setQueryUrl((e.target as HTMLInputElement).value) }}/>
                    <Button type="primary" onClick={onQuery}>刷新</Button>
                </Space>
                <Space>
                    <Button onClick={() => onAppendNode()}>新增</Button>
                </Space>
            </div>
            <Table dataSource={tableData} size="small" scroll={{y: 'calc(100vh - 215px)'}} rowKey={'ID'}>
                <Table.Column title="名称" dataIndex="label"></Table.Column>
                <Table.Column title="类型" dataIndex="type"></Table.Column>
                <Table.Column title="URI" dataIndex="uri"></Table.Column>
                <Table.Column title="URL" dataIndex="url"></Table.Column>
                <Table.Column title="操作" render={renderAction}></Table.Column>
            </Table>
            <AppendNodeModal helper={appendNodeModalHelper} onFinish={onQuery}/>
        </div>
    )
}