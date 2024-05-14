import React from "react";
import {Button, Modal, Radio, Table} from "antd";
// import BugService from "./bugService";
import moment from "moment";
import BugEditor from './bugEditor';
import fetch from '@/src/fetch';

const { Column } = Table;

class TaskEditor extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            modalOpen: false,
            modalTitle: '沟通记录',
            loading: false,
            listData: []
        }

        this.refTask = null;
        this.mBugEditor = null;
    }

    show(task) {
        this.setState({ modalOpen: true });
        this.refTask = task;
        this.onQuery();
    }


    hide() {
        this.setState({ modalOpen: false });
    }

    async onQuery() {
        // let { data } = await new BugService().query({ task_id: this.refTask.ID }, [], ['create_time desc'], 1, 100);
        let { data } = await fetch.get('/api/bug/list', { params: { task_id: this.refTask.ID, page: 1, limit: 100 } });
        this.setState({ listData: data });
    }

    onAppendBug() {
        if (!this.mBugEditor) {
            return;
        }

        this.mBugEditor.showWithTask(this.refTask);
    }

    renderTitle() {
        let task_name = this.refTask?.task_name;
        let title = [task_name, '问题记录'].filter(s => s).join(' - ');
        return <h3>{title}<Button type={'link'} onClick={() => this.onAppendBug()}>添加</Button></h3>
    }

    renderTime(cell) {
        if (cell) {
            return moment(cell).format('YYYY-MM-DD HH:mm:ss');
        } else {
            return '/';
        }
    }

    renderStatus(cell) {
        return [
            '未复现',
            '已复现',
            '修复中',
            '待复验',
            '已关闭',
        ][cell];
    }

    onCancel() {
        this.hide();
    }

    render() {
        return (
            <>
                <Modal title={this.renderTitle()} open={this.state.modalOpen} onCancel={e => this.onCancel(e)} footer={null} width={1000}>
                    <div>
                        <Table dataSource={this.state.listData} size={'small'}>
                            <Column title="上报渠道" dataIndex="source" key="source"/>
                            <Column title="责任人" dataIndex="employee" key="employee"/>
                            <Column title="问题描述" dataIndex="detail" key="detail"/>
                            <Column title="解决状态" dataIndex="status" key="status" render={this.renderStatus}/>
                            <Column title="解决方案" dataIndex="solution" key="solution"/>
                            <Column title="复核人" dataIndex="tester" key="tester"/>
                            <Column title="创建时间" dataIndex="create_time" key="create_time" render={this.renderTime}/>
                            <Column title="更新时间" dataIndex="update_time" key="update_time" render={this.renderTime}/>
                        </Table>
                    </div>
                    <BugEditor ref={comp => this.mBugEditor = comp} onFinish={() => this.onQuery()}/>
                </Modal>
            </>
        );
    }
}

export default TaskEditor;
