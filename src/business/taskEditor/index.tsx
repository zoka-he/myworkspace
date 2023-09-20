import React from "react";
import {Form, Modal, Input, Select, Button, message, DatePicker, FormInstance} from "antd";
import _ from 'lodash';
// import TaskService from "../taskManage/taskService";
import moment from "moment";
import EmployeeInput from '../commonComponent/employeeInput';
import {ITaskData} from "@/src/types/ITaskData";
import fetch from '@/src/fetch';
import Dayjs from 'dayjs';

interface ITaskEditorProp {
    onFinish?: Function
}

interface ITaskEditorState {
    modalOpen: boolean,
    loading: boolean,
}

function date2string(date: any, format: string) {
    if (date) {
        return Dayjs(date).format(format);
    } else {
        return null;
    }
}

function string2date(s?: string) {
    if (s) {
        return Dayjs(s);
    } else {
        return null;
    }
}

class TaskEditor extends React.Component<ITaskEditorProp, ITaskEditorState & {}> {
    private formDefault: ITaskData = {
        priority: 0,
        status: 0
    }

    private mForm: FormInstance | null;
    private oldTask: ITaskData | null;

    constructor(props: {}) {
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

    parseAndFixData(data: any) {
        // 避开antd识别日期的坑
        data.fuck_date = string2date(data.fuck_date);
        data.deadline_time = string2date(data.deadline_time);
        this.mForm?.setFieldsValue(_.clone(data));
    }

    async showAndEdit(task: ITaskData) {
        this.setState({
            modalOpen: true
        });

        this.oldTask = await fetch.get('/api/task', { params: { ID: task.ID } });
        // this.oldTask = await new TaskService().queryOne({ ID: task.ID });
        this.parseAndFixData(this.oldTask);
    }

    onFormRef(comp: FormInstance | null) {
        if (!comp) {
            return;
        }

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

    async onFinish(values: any) {
        this.hide();

        if (this.oldTask) {
            let updateObj = _.clone(values);

            delete updateObj['create_time'];
            updateObj.fuck_date = date2string(updateObj.fuck_date,'YYYY-MM-DD');
            updateObj.deadline_time = date2string(updateObj.deadline_time, 'YYYY-MM-DD');
            updateObj.update_time = moment().format('YYYY-MM-DD HH:mm:ss');

            // await taskDao.updateTask(this.oldTask, updateObj);
            // await new TaskService().updateOne(this.oldTask, updateObj);
            await fetch.post('/api/task', updateObj, { params: { ID: this.oldTask.ID } })
        } else {
            let createObj = _.clone(values);
            createObj.create_time = moment().format('YYYY-MM-DD HH:mm:ss');
            createObj.fuck_date = date2string(createObj.fuck_date,'YYYY-MM-DD');
            createObj.deadline_time = date2string(createObj.deadline_time, 'YYYY-MM-DD');

            // await new TaskService().insertOne(createObj);
            await fetch.post('/api/task', createObj);
        }

        if (this.props.onFinish) {
            this.props.onFinish();
        }
        message.success('提交成功！');
    }

    onFinishedFailed(e: any) {
        message.warning('表单校验失败，请修改');
    }

    onCancel() {
        this.hide();
    }

    render() {
        return (
            <>
                <Modal title={'编辑任务'} open={this.state.modalOpen} onCancel={e => this.onCancel()} footer={null}>
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
                                <Select.Option value={-1}>搁置</Select.Option>
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
                                <Select.Option value={1}>执行中</Select.Option>
                                <Select.Option value={2}>验证中</Select.Option>
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
