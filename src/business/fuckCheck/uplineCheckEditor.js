import React from "react";
import {Form, Modal, Input, Select, Button, message, DatePicker} from "antd";
import _ from 'lodash';
// import UplineCheckService from "./uplineCheckService";
import moment from "moment";
import FuckCheckUtils from './fuckCheckUtils';
import TaskEditor from "../taskEditor";
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

class UplineCheckEditor extends React.Component {
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
        this.mTaskEditor = null;
    }

    show() {
        this.setState({
            modalOpen: true
        });

        this.oldData = null;
    }

    parseAndFixData(data) {
        // 避开antd识别日期的坑
        if (data.tu_fuck_date) {
            data.fuck_date = data.tu_fuck_date;
        }
        if (data.tu_sys_name) {
            data.sys_name = data.tu_sys_name;
        }

        data.fuck_date = string2date(data.fuck_date);
        data.tu_fuck_date = string2date(data.tu_fuck_date);
        this.mForm?.setFieldsValue(_.clone(data));
    }

    async showAndEdit(task) {
        this.setState({
            modalOpen: true
        });

        this.oldData = _.clone(task);
        this.parseAndFixData(this.oldData);
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

        if (this.oldData && this.oldData.ID) {
            let updateObj = _.clone(values);

            delete updateObj['create_time'];
            updateObj.fuck_date = date2string(updateObj.fuck_date,'YYYY-MM-DD');

            // await taskDao.updateTask(this.oldData, updateObj);
            // await new UplineCheckService().updateOne(this.oldData, updateObj);
            await fetch.post('/api/fuckCheck', updateObj, { params: { ID: this.oldData.ID } });
        } else {
            let createObj = _.clone(values);
            createObj.fuck_date = date2string(createObj.fuck_date,'YYYY-MM-DD');

            // await new UplineCheckService().insertOne(createObj);
            await fetch.post('/api/fuckCheck', createObj);
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

    onShowTask(task) {
        // message.info(`打开ID为${task.ID}的任务`);

        if (this.mTaskEditor) {
            this.mTaskEditor.showAndEdit(task);
        }
    }

    render() {
        return (
            <>
                <Modal title={'编辑任务'} open={this.state.modalOpen} onOk={e => this.onOk(e)} onCancel={e => this.onCancel(e)} footer={null}>
                    <Form ref={comp => this.onFormRef(comp)} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} initialValues={this.formDefault}
                          onFinish={e => this.onFinish(e)}
                          onFinishFailed={e => this.onFinishedFailed(e)}
                    >
                        <Form.Item label={'上线日期'} name={'fuck_date'} rules={[{ required: true, message: '任务名为必填！' }]}>
                            <span>{date2string(this.oldData?.fuck_date, 'YYYY-MM-DD')}</span>
                        </Form.Item>
                        <Form.Item label={'归属系统'} name={'sys_name'}>
                            <span>{this.oldData?.sys_name}</span>
                        </Form.Item>
                        <Form.Item label={'任务情况'} name={'tlist'}>
                            <span>{FuckCheckUtils.renderTaskList(this.oldData?.tlist, task => this.onShowTask(task))}</span>
                        </Form.Item>
                        <Form.Item label={'网络关系申请'} name={'req_net'}>
                            <Input.TextArea/>
                        </Form.Item>
                        <Form.Item label={'SA申请'} name={'req_sa'}>
                            <Input.TextArea/>
                        </Form.Item>
                        <Form.Item label={'root申请'} name={'req_root'}>
                            <Input.TextArea/>
                        </Form.Item>
                        <Form.Item label={'负载均衡申请'} name={'req_f5'}>
                            <Input.TextArea/>
                        </Form.Item>
                        <Form.Item label={'问题'} name={'crash_info'}>
                            <Input.TextArea/>
                        </Form.Item>
                        
                        <div className={'f-align-center'}>
                            <Button style={{ width: '200px' }} type="primary" htmlType="submit">
                                提交
                            </Button>
                        </div>
                    </Form>

                    <TaskEditor ref={comp => this.mTaskEditor = comp}/>
                </Modal>
            </>
        );
    }
}

export default UplineCheckEditor;
