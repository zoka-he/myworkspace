import React from "react";
import {Button, Modal, Table, Space, message} from "antd";
import moment from "moment";
import fetch from '@/src/fetch';
import { IAccount } from "@/src/types/IAccount";
import confirm from "antd/es/modal/confirm";
import { ExclamationCircleFilled } from '@ant-design/icons';

const { Column } = Table;

interface IAccountHistViewerProps {

}

interface IAccountHistViewerState {
    modalOpen: boolean,
    modalTitle: string,
    loading: boolean,
    listData: any[]
}

class AccountHistViewer extends React.Component<IAccountHistViewerProps, IAccountHistViewerState> {

    private refData?: IAccount;

    constructor(props: IAccountHistViewerProps) {
        super(props);

        this.state = {
            modalOpen: false,
            modalTitle: '沟通记录',
            loading: false,
            listData: []
        }
    }

    show(data: IAccount | any) {
        this.setState({ modalOpen: true });
        this.refData = data;
        this.onQuery();
    }


    hide() {
        this.setState({ modalOpen: false });
    }

    async onQuery() {
        let params = {
            sys_name: this.refData?.sys_name,
            username: this.refData?.username,
            page: 1, 
            limit: 100
        };
        let { data } = await fetch.get('/api/infos/account/histroy/list', { params });
        this.setState({ listData: data });
    }



    renderTitle() {
        let username = this.refData?.username;
        let title = [username, '账号历史记录'].filter(s => s).join(' - ');
        return <h3>{title}</h3>
    }

    renderTime(cell: string) {
        if (cell) {
            return moment(cell).format('YYYY-MM-DD HH:mm:ss');
        } else {
            return '/';
        }
    }

    renderAction(cell: any, row: any) {

        const deleteRow = async () => {
            await fetch.delete('/api/interact', { params: { ID: row.ID } });

            message.success('已删除');
            this.onQuery();
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
            <Button danger onClick={showDeleteConfirm}>删除</Button>
        </Space>
    }

    onCancel() {
        this.hide();
    }

    render() {
        return (
            <>
                <Modal title={this.renderTitle()} open={this.state.modalOpen} onCancel={e => this.onCancel()} footer={null} width={1000}>
                    <div>
                        <Table dataSource={this.state.listData} size={'small'}>
                            <Column title="平台" dataIndex="sys_name" key="task_name"/>
                            <Column title="账户" dataIndex="username" key="employee"/>
                            <Column title="密码" dataIndex="passwd" key="message"/>
                            <Column title="备注" dataIndex="remark" key="source"/>
                            <Column title="更新时间" dataIndex="update_time" key="update_time" render={this.renderTime}/>
                            <Column title="操作" dataIndex="action" key="action" fixed="right" width={100} render={this.renderAction}/>
                        </Table>
                    </div>
                </Modal>
            </>
        );
    }
}

export default AccountHistViewer;
