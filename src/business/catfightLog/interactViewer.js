import React from "react";
import {Button, Modal, Table} from "antd";
import InteractService from "./interactService";
import moment from "moment";
import InteractEditor from './interactEditor';

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
        this.mInteractEditor = null;
    }

    setModalTitle(task) {
        let { task_name } = task;
        let title = [task_name, '沟通记录'].filter(s => s).join(' - ');
        this.setState({ modalTitle: title });
    }

    show(task) {
        this.setState({ modalOpen: true });
        this.setModalTitle(task);
        this.refTask = task;

        this.onQuery();
    }


    hide() {
        this.setState({ modalOpen: false });
    }



    async onQuery() {
        let { data } = await new InteractService().query({ task_id: this.refTask.ID }, [], ['create_time desc'], 1, 100);
        this.setState({ listData: data });
    }

    renderTime(cell) {
        if (cell) {
            return moment(cell).format('YYYY-MM-DD HH:mm:ss');
        } else {
            return '/';
        }
    }

    renderSource(cell) {
        return {
            email: '邮件',
            oa: 'OA',
            bb: '口头',
        }[cell];
    }

    onAppendLog() {
        if (!this.mInteractEditor) {
            return;
        }

        this.mInteractEditor.showWithTask(this.refTask);
    }

    renderTitle() {
        let task_name = this.refTask?.task_name;
        let title = [task_name, '沟通记录'].filter(s => s).join(' - ');
        return <h3>{title}<Button type={'link'} onClick={() => this.onAppendLog()}>添加</Button></h3>
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
                            <Column title="提议人" dataIndex="employee" key="employee"/>
                            <Column title="提议内容" dataIndex="message" key="message"/>
                            <Column title="来源" dataIndex="source" key="source" render={this.renderSource}/>
                            <Column title="答复内容" dataIndex="re_message" key="re_message"/>
                            <Column title="创建时间" dataIndex="create_time" key="create_time" render={this.renderTime}/>
                            <Column title="更新时间" dataIndex="update_time" key="update_time" render={this.renderTime}/>
                        </Table>
                    </div>
                    <InteractEditor ref={comp => this.mInteractEditor = comp} onFinish={() => this.onQuery()}/>
                </Modal>
            </>
        );
    }
}

export default TaskEditor;
