import React from "react";
import {Form, Modal, Input, Select, Button, message, DatePicker} from "antd";
import _ from 'lodash';
import TaskService from "../taskManage/taskService";
import moment from "moment";
import EmployeeInput from './employeeInput';

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

class TaskEditor extends React.Component {
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
        this.oldTask = null;
    }

    show() {
        this.setState({
            modalOpen: true
        });

        this.oldTask = null;
    }

    parseAndFixData(data) {
        // 避开antd识别日期的坑
        data.fuck_date = string2date(data.fuck_date);
        data.deadline_time = string2date(data.deadline_time);
        this.mForm?.setFieldsValue(_.clone(data));
    }

    async showAndEdit(task) {
        this.setState({
            modalOpen: true
        });

        this.oldTask = await new TaskService().queryOne({ ID: task.ID });
        this.parseAndFixData(this.oldTask);
    }

    onFormRef(comp) {
        this.mForm = comp;
        if (this.oldTask) {
            this.parseAndFixData(this.oldTask);
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

        if (this.oldTask) {
            let updateObj = _.clone(values);

            delete updateObj['create_time'];
            updateObj.fuck_date = date2string(updateObj.fuck_date,'YYYY-MM-DD');
            updateObj.deadline_time = date2string(updateObj.deadline_time, 'YYYY-MM-DD');
            updateObj.update_time = moment().format('YYYY-MM-DD HH:mm:ss');

            // await taskDao.updateTask(this.oldTask, updateObj);
            await new TaskService().updateOne(this.oldTask, updateObj);
        } else {
            let createObj = _.clone(values);
            createObj.create_time = moment().format('YYYY-MM-DD HH:mm:ss');
            createObj.fuck_date = date2string(createObj.fuck_date,'YYYY-MM-DD');
            createObj.deadline_time = date2string(createObj.deadline_time, 'YYYY-MM-DD');

            await new TaskService().insertOne(createObj);
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
                <Modal title={'编辑任务'} open={this.state.modalOpen} onOk={e => this.onOk(e)} onCancel={e => this.onCancel(e)} footer={null}>
                    <Form ref={comp => this.onFormRef(comp)} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} initialValues={this.formDefault}
                        onFinish={e => this.onFinish(e)}
                        onFinishFailed={e => this.onFinishedFailed(e)}
                    >
                        <Form.Item label={'任务名称'} name={'task_name'} rules={[{ required: true, message: '任务名为必填！' }]}>
                            <Input/>
                        </Form.Item>
                        <Form.Item label={'归属系统'} name={'sys_name'}>
                            <Input/>
                        </Form.Item>
                        <Form.Item label={'优先级'} name={'priority'}>
                            <Select>
                                <Select.Option value={0}>普通</Select.Option>
                                <Select.Option value={1}>紧急</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item label={'承接人'} name={'employee'}>
                            <EmployeeInput/>
                        </Form.Item>
                        <Form.Item label={'任务详情'} name={'detail'}>
                            <Input.TextArea/>
                        </Form.Item>
                        <Form.Item label={'任务进度'} name={'status'}>
                            <Select>
                                <Select.Option value={0}>未开始</Select.Option>
                                <Select.Option value={1}>开发中</Select.Option>
                                <Select.Option value={2}>测试中</Select.Option>
                                <Select.Option value={3}>待上线</Select.Option>
                                <Select.Option value={4}>已完成</Select.Option>
                                <Select.Option value={5}>已关闭</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item label={'上线日期'} name={'fuck_date'}>
                            <DatePicker/>
                        </Form.Item>
                        <Form.Item label={'截止日期'} name={'deadline_time'}>
                            <DatePicker/>
                        </Form.Item>
                        <Form.Item label={'主要问题'} name={'problems'}>
                            <Input.TextArea/>
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

export default TaskEditor;
