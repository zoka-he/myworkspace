import React from "react";
import {Form, Modal, Input, Select, Button, message, DatePicker, FormInstance} from "antd";
import _ from 'lodash';
import moment from "moment";
import fetch from '@/src/fetch';
import Dayjs from 'dayjs';

import type { IRoadPlan } from "@/src/types/IRoadPlan";

interface IPlanEditorProp {
    onFinish?: Function
}

interface IPlanEditorState {
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

class TaskEditor extends React.Component<IPlanEditorProp, IPlanEditorState & {}> {
    private formDefault: IRoadPlan = {}

    private mForm: FormInstance | null;
    private oldData: IRoadPlan | null;

    constructor(props: {}) {
        super(props);

        this.state = {
            modalOpen: false,
            loading: false,
        }

        this.formDefault = {
            map_type: 'gaode'
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

    parseAndFixData(data: any) {
        // 避开antd识别日期的坑
        data.fuck_date = string2date(data.fuck_date);
        data.deadline_time = string2date(data.deadline_time);
        this.mForm?.setFieldsValue(_.clone(data));
    }

    async showAndEdit(plan: IRoadPlan) {
        this.setState({
            modalOpen: true
        });

        this.oldData = await fetch.get('/api/roadPlan', { params: { ID: plan.ID } });
        // this.oldData = await new TaskService().queryOne({ ID: task.ID });
        this.parseAndFixData(this.oldData);
    }

    onFormRef(comp: FormInstance | null) {
        if (!comp) {
            return;
        }

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

    async onFinish(values: any) {
        this.hide();

        if (this.oldData) {
            let updateObj = _.clone(values);

            delete updateObj['create_time'];
            updateObj.update_time = moment().format('YYYY-MM-DD HH:mm:ss');

            // await taskDao.updateTask(this.oldData, updateObj);
            // await new TaskService().updateOne(this.oldData, updateObj);
            await fetch.post('/api/roadPlan', updateObj, { params: { ID: this.oldData.ID } })
        } else {
            let createObj = _.clone(values);
            createObj.create_time = moment().format('YYYY-MM-DD HH:mm:ss');

            // await new TaskService().insertOne(createObj);
            await fetch.post('/api/roadPlan', createObj);
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
                <Modal title={'编辑计划'} open={this.state.modalOpen} onCancel={e => this.onCancel()} footer={null}>
                    <Form ref={comp => this.onFormRef(comp)} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} initialValues={this.formDefault}
                        onFinish={e => this.onFinish(e)}
                        onFinishFailed={e => this.onFinishedFailed(e)}
                    >
                        <Form.Item label={'名称'} name={'name'} rules={[{ required: true, message: '任务名为必填！' }]}>
                            <Input/>
                        </Form.Item>
                        <Form.Item label={'描述'} name={'remark'}>
                            <Input.TextArea/>
                        </Form.Item>

                        <Form.Item label="地图类型" name="map_type">
                            <Select>
                                <Select.Option value="baidu">百度地图</Select.Option>
                                <Select.Option value="gaode">高德地图</Select.Option>
                            </Select>
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
