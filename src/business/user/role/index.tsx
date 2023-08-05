import { Button, Checkbox, Col, Input, Modal, Row, Space, Table, message } from "antd"
import fetch from '@/src/fetch';
import { Key, useEffect, useState } from "react"
import AppendRoleModal from "./appendRoleModal";
import getPermissionTree from "../permission/getPermissionTree";
import { IPermission } from "../permission/IPermission";
import { ExclamationCircleFilled } from '@ant-design/icons';
import PermSwitch from "./PermSwitch";


export default function() {

    // ------------------- start role values ---------------------------
    let [ queryRoleName, setQueryRoleName ] = useState<string>('');
    let [ roleList, setRoleList ] = useState<any[]>([]);
    let [ rolePage, setRolePage ] = useState<number>(1);
    let [ roleLimit, setRoleLimit ] = useState<number>(20);
    let [ checkedRole, setCheckedRole ] = useState<any>(null);
    let appendRoleModalHelper = AppendRoleModal.useModalHelper();
    // ------------------- end role values ---------------------------

    // ------------------- start permission values ---------------------------
    let [ queryPermName, setQueryPermName ] = useState<string>('');
    let [ permList, setPermList ] = useState<any[]>([]);
    let [ expendPermKeys, setExpendPermKeys ] = useState<any[]>([]);
    let [ relationData, setRelationData ] = useState<any>();
    // ------------------- end permission values ---------------------------

    // ------------------- start effects ---------------------------
    useEffect(() => {
        onQueryRole();
        onQueryPerm();
    }, []);

    useEffect(() => {
        onQueryRelationData();
    }, [checkedRole]);

    // ------------------- end effects ---------------------------

    // ------------------- start roles ---------------------------
    async function onQueryRole() {
        let params = {
            page: rolePage, 
            limit: roleLimit
        };
        let { data } = await fetch.get('/api/user/role/list', { params });
        setRoleList(data);
        setCheckedRole(null)
    }

    function onAppendRole() {
        appendRoleModalHelper.showAndEdit(null);
    }

    function onEditRole(role: any) {
        appendRoleModalHelper.showAndEdit(role);
    }

    function onDeleteRole(role: any) {
        Modal.confirm({
            title: '删除确认',
            icon: <ExclamationCircleFilled />,
            content: `警告！将删除角色 ${role.rolename}，请二次确认！`,
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            async onOk() {
                try {
                    let { ID } = role;
                    await fetch.delete('/api/user/role', { params: { ID } });
                    message.success('已删除“' + role.rolename + '”');
                } catch(e:any) {
                    console.error(e);
                    message.error(e.message);
                } finally {
                    onQueryRole();
                }
            },
            onCancel() {
                message.warning('已取消操作！');
            },
        });
    }

    function onSelectRoleChange(keys: Key[], roles: any[]) {
        if (!roles.length) {
            setCheckedRole(null);
        } else {
            setCheckedRole(roles[0]);
        }
    }

    function renderRoleAction(cell: any, row: any) {
        return (
            <Space>
                <Button onClick={() => onEditRole(row)}>编辑</Button>
                <Button danger onClick={() => onDeleteRole(row)}>删除</Button>
            </Space>
        );
    }
    // ------------------- end roles ---------------------------

    // ------------------- start permissions ---------------------------
    async function onQueryPerm() {
        let { tree, data } = await getPermissionTree.fromRemote();
        setPermList(tree);

        let expands = [];
        for (let item of data) {
            if (item.children?.length) {
                expands.push(item.ID);
            }
        }
        setExpendPermKeys(expands);
    }

    function onPermExpand(willExpend: boolean, row: IPermission) {
        if (!row.ID) {
            return;
        }

        if (willExpend) {
            setExpendPermKeys([row.ID, ...expendPermKeys]);
        } else {
            setExpendPermKeys(expendPermKeys.filter(v => v !== row.ID));
        }
    }

    async function onModifyRolePermission(rpData: any) {
        try {
            await fetch.post('/api/user/role/relation', rpData);
            message.success('已更新权限');
        } catch(e: any) {
            console.error(e);
            message.error(e.mssage);
        }
    }

    function renderPermAction(cell: any, row: IPermission) {
        return (
            <PermSwitch 
                RID={checkedRole ? checkedRole.ID : null}
                PID={row.ID}
                type={row.type}
                srcData={relationData}
                onChange={onModifyRolePermission}
            ></PermSwitch>
        );
    }

    async function onQueryRelationData() {
        if (typeof checkedRole?.ID !== 'number') {
            setRelationData(null);
            return;
        } 

        let params = {
            RID: checkedRole.ID
        }
        let { data } = await fetch.get('/api/user/role/relation', { params });

        let rpMap = new Map();
        for (let item of data) {
            rpMap.set(item.PID, item);
        }
        setRelationData(rpMap);
    }
    // ------------------- end permissions ---------------------------

    let permActionColName = checkedRole?.rolename ? `角色“${checkedRole?.rolename}”的权限` : '权限';

    return (
        <div className="f-fit-content">
            <Row gutter={20}>
                <Col span={10}>
                    <div className="f-flex-two-side">
                        <Space>
                            <label>角色：</label>
                            <Input value={queryRoleName} onInput={(e) => { setQueryRoleName((e.target as HTMLInputElement).value) }}/>
                            <Button type="primary" onClick={onQueryRole}>刷新</Button>
                            <Button onClick={() => onAppendRole()}>新增角色</Button>
                        </Space>
                    </div>
                    <Table dataSource={roleList} size="small" 
                        scroll={{y: 'calc(100vh - 215px)'}} 
                        rowKey={'ID'}
                        rowSelection={{
                            type: 'radio',
                            onChange: onSelectRoleChange,
                            selectedRowKeys: checkedRole ? [checkedRole.ID] : []
                        }}
                    >
                        <Table.Column title="角色" dataIndex="rolename"></Table.Column>
                        <Table.Column title="操作" render={renderRoleAction}></Table.Column>
                    </Table>
                </Col>

                <Col span={14}>
                    <Space>
                        <label>权限名称：</label>
                        <Input value={queryPermName} onInput={(e) => { setQueryPermName((e.target as HTMLInputElement).value) }}/>
                        <Button onClick={onQueryPerm}>刷新资源</Button>
                        <Button type="primary" onClick={onQueryRelationData}>刷新权限</Button>
                    </Space>
                    <Table dataSource={permList} size="small" scroll={{y: 'calc(100vh - 215px)'}} 
                        rowKey={'ID'}
                        expandable={{ expandedRowKeys: expendPermKeys, onExpand: onPermExpand }}
                    >
                        <Table.Column title="资源" dataIndex="label"></Table.Column>
                        <Table.Column title={permActionColName} render={renderPermAction}></Table.Column>
                    </Table>
                </Col>
            </Row>
            
            <AppendRoleModal helper={appendRoleModalHelper} onFinish={onQueryRole}/>
        </div>
    )
}