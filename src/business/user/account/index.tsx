import { Button, Input, Space, Table, message, Modal } from "antd";
import { useEffect, useRef, useState } from "react";
import AppendUserModal from "./appendUserModal";
import fetch from '@/src/fetch';
import { ExclamationCircleFilled } from '@ant-design/icons';
import DayJS from 'dayjs';

export default function() {
    let [queryUsername, setQueryUsername] = useState('');
    let [queryNickname, setQueryNickname] = useState('');
    let [page, setPage] = useState(1);
    let [limit, setLimit] = useState(20);
    let [listData, setListData] = useState<any[]>([]);
    let modalHelper = AppendUserModal.useModalHelper();

    useEffect(() => {
        onQuery();
    }, []);

    async function onQuery() {
        let params = {
            page, 
            limit
        };
        let { data } = await fetch.get('/api/user/account/list', { params });
        setListData(data);
    }

    function onAppendUser() {
        let payload = null;
        if (listData.length === 0 && page === 1 && limit !== 0) {
            payload = { 
                username: 'admin',
                nickname: '管理员',
                main_url: '/taskManage/dashboard',
                type: 'admin' 
            }
        }
        modalHelper.showAndEdit(payload);
    }

    function onEditUser(user: any) {
        modalHelper.showAndEdit(user);
    }

    function onDeleteUser(user: any) {
        Modal.confirm({
            title: '删除确认',
            icon: <ExclamationCircleFilled />,
            content: '警告！将删除节点，请二次确认！',
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            async onOk() {
                try {
                    let { ID } = user;
                    await fetch.delete('/api/user/account', { params: { ID } });
                    message.success('已删除“' + user.username + '”');
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

    function renderAction(cell: any, row: any) {
        let noDelete = false;

        return (
            <Space>
                <Button size="small" onClick={() => onEditUser(row)}>编辑</Button>
                <Button size="small" danger onClick={() => onDeleteUser(row)} disabled={noDelete}>删除</Button>
            </Space>
        )
    }

    function renderDatetime(cell: string) {
        if (!cell) {
            return '';
        }
        return DayJS(cell).format('YYYY-MM-DD HH:mm:ss');
    }

    return (
        <div className="f-fit-content">
            <div className="f-flex-two-side">
                <Space>
                    <label>账号：</label>
                    <Input value={queryUsername} onInput={(e) => { setQueryUsername((e.target as HTMLInputElement).value) }}/>
                    <label>昵称：</label>
                    <Input value={queryNickname} onInput={(e) => { setQueryNickname((e.target as HTMLInputElement).value) }}/>
                    <Button type="primary" onClick={onQuery}>刷新</Button>
                </Space>
                <Space>
                    <Button onClick={() => onAppendUser()}>新增</Button>
                </Space>
            </div>
            <Table dataSource={listData} size="small" scroll={{y: 'calc(100vh - 215px)'}} rowKey={'ID'}>
                <Table.Column title="账号" dataIndex="username"></Table.Column>
                <Table.Column title="昵称" dataIndex="nickname"></Table.Column>
                <Table.Column title="密码" dataIndex="password"></Table.Column>
                <Table.Column title="主页" dataIndex="main_url"></Table.Column>
                <Table.Column title="权限" dataIndex="roles"></Table.Column>
                <Table.Column title="类型" dataIndex="type"></Table.Column>
                <Table.Column title="创建日期" dataIndex="create_time" render={renderDatetime}></Table.Column>
                <Table.Column title="修改日期" dataIndex="update_time" render={renderDatetime}></Table.Column>
                <Table.Column title="操作" render={renderAction}></Table.Column>
            </Table>
            <AppendUserModal helper={modalHelper} onFinish={onQuery}/>
        </div>
    )
}