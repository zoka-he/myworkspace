import React from "react";
import {Form, Modal, Input, Select, Button, message, DatePicker, Radio} from "antd";
import _ from 'lodash';
// import BugService from "./bugService";
import moment from "moment";
import EmployeeInput from '../commonComponent/employeeInput';
import TaskSelect from '../commonComponent/taskSelect';
import fetch from '@/src/fetch';

function date2string(date, format) {
    if (date) {
        return moment(date).format(format);
    } else {
        return null;
    }
}

function string2date(s) {
    if (s) {
        return moment(s);
    } else {
        return null;
    }
}

class BugEditor extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            modalOpen: false,
            loading: false,
        }

        this.formDefault = {
            priority: 0,
            status: 0
        }

        this.mForm = null;
        this.oldData = null;
    }

    show() {
        this.setState({
            modalOpen: true
        });

        this.oldData = null;
    }

    parseAndFixData(data) {
        // 避开antd识别日期的坑
        this.mForm?.setFieldsValue(_.clone(data));
    }

    showAndEdit(data) {
        this.setState({
            modalOpen: true
        });

        this.oldData = _.clone(data);
        this.parseAndFixData(this.oldData);
    }

    /**
     * 打开，并自动附带上任务ID
     * @param task
     */
    showWithTask(task) {
        let { ID } = task;
        this.setState({
            modalOpen: true
        });

        this.oldData = { task_id: ID };
        this.mForm?.setFieldsValue(this.oldData);
    }

    onFormRef(comp) {
        this.mForm = comp;
        if (this.oldData) {
            this.parseAndFixData(this.oldData);
        }
    }

    hide() {
        this.setState({
            modalOpen: false
        });
        this.mForm?.resetFields();
    }

    async onFinish(values) {
        this.hide();

        if (this.oldData?.ID) {
            let updateObj = _.clone(values);

            delete updateObj['create_time'];
            updateObj.update_time = moment().format('YYYY-MM-DD HH:mm:ss');

            // await new BugService().updateOne(this.oldData, updateObj);
            await fetch.post('/api/bug', updateObj, { params: { ID: this.oldData.ID } });
        } else {
            let createObj = _.clone(values);
            createObj.create_time = moment().format('YYYY-MM-DD HH:mm:ss');

            // await new BugService().insertOne(createObj);
            await fetch.post('/api/bug', createObj);
        }

        if (this.props.onFinish) {
            this.props.onFinish();
        }
        message.success('提交成功！');
    }

    onFinishedFailed() {
        message.warning('表单校验失败，请修改');
    }

    onCancel() {
        this.hide();
    }

    render() {
        return (
            <>
                <Modal title={'编辑BUG'} open={this.state.modalOpen} onOk={e => this.onOk(e)} onCancel={e => this.onCancel(e)} footer={null}>
                    <Form ref={comp => this.onFormRef(comp)} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} initialValues={this.formDefault}
                          onFinish={e => this.onFinish(e)}
                          onFinishFailed={e => this.onFinishedFailed(e)}
                    >
                        <Form.Item label={'关联任务'} name={'task_id'} rules={[{ required: true, message: '任务名为必填！' }]}>
                            <TaskSelect/>
                        </Form.Item>
                        <Form.Item label={'上报渠道'} name={'source'}>
                            <Input/>
                        </Form.Item>
                        <Form.Item label={'责任人'} name={'employee'}>
                            <EmployeeInput/>
                        </Form.Item>
                        <Form.Item label={'BUG描述'} name={'detail'}>
                            <Input.TextArea/>
                        </Form.Item>
                        <Form.Item label={'解决状态'} name={'status'}>
                            <Radio.Group name="resolve_status" defaultValue={0}>
                                <Radio value={0}>未复现</Radio>
                                <Radio value={1}>已复现</Radio>
                                <Radio value={2}>修复中</Radio>
                                <Radio value={3}>待复验</Radio>
                                <Radio value={4}>已关闭</Radio>
                            </Radio.Group>
                        </Form.Item>
                        <Form.Item label={'解决方案'} name={'solution'}>
                            <Input.TextArea/>
                        </Form.Item>
                        <Form.Item label={'复核人'} name={'tester'}>
                            <EmployeeInput/>
                        </Form.Item>
                        <div className={'f-align-center'}>
                            <Button style={{ width: '200px' }} type="primary" htmlType="submit">
                                提交
                            </Button>
                        </div>
                    </Form>
                </Modal>
            </>
        );
    }
}

export default BugEditor;
