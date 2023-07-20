import React, { useEffect, useState } from "react";
import {Form, Modal, Input, Select, Button, message, DatePicker, FormInstance} from "antd";
import _ from 'lodash';
import moment from "moment";
import fetch from '@/src/fetch';
import Dayjs from 'dayjs';

import type { IRoadPlan } from "@/src/types/IRoadPlan";

interface IPlanEditorProp {
    helper?: IPlanEditorHelper
    onFinish?: Function
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

interface IPlanEditorHelper {
    show: Function,
    close: Function,
    isOpen: boolean,
    payload: any,
    showAndEdit: Function
}

function usePlanEditorHelper(): IPlanEditorHelper {
    let [payload, setPayload] = useState<any>(null);
    let [isOpen, setIsOpen] = useState(false);
    
    return {
        isOpen,
        payload,
        show() {
            setIsOpen(true);
        },
        async showAndEdit(plan: IRoadPlan) {
            let resp = await fetch.get('/api/roadPlan', { params: { ID: plan.ID } });
            setPayload(resp);
            setIsOpen(true);
        },
        close() {
            setPayload(null);
            setIsOpen(false);
        }
    }
}

function PlanEditor(props: IPlanEditorProp) {

    let helper: IPlanEditorHelper;
    if (props.helper) {
        helper = props.helper;
    } else {
        helper = usePlanEditorHelper();
    }

    let [mForm] = Form.useForm();
    let formDefault: IRoadPlan = {
        map_type: 'gaode'
    };


    function parseAndFixData(data: any) {
        // 避开antd识别日期的坑
        data.fuck_date = string2date(data.fuck_date);
        data.deadline_time = string2date(data.deadline_time);
        mForm?.setFieldsValue(_.clone(data));
    }

    useEffect(() => {
        if (!helper.isOpen) {
            return;
        }

        if (helper.payload) {
            parseAndFixData(helper.payload);
        }
    }, [helper.isOpen]);


    function hide() {
        helper.close();
        mForm?.resetFields();
    }

    async function onFinish(values: any) {
        hide();

        if (helper.payload) {
            let updateObj = _.clone(values);

            delete updateObj['create_time'];
            updateObj.update_time = moment().format('YYYY-MM-DD HH:mm:ss');

            // await taskDao.updateTask(this.oldData, updateObj);
            // await new TaskService().updateOne(this.oldData, updateObj);
            await fetch.post('/api/roadPlan', updateObj, { params: { ID: helper.payload.ID } })
        } else {
            let createObj = _.clone(values);
            createObj.create_time = moment().format('YYYY-MM-DD HH:mm:ss');

            // await new TaskService().insertOne(createObj);
            await fetch.post('/api/roadPlan', createObj);
        }

        if (props.onFinish) {
            props.onFinish();
        }
        message.success('提交成功！');
    }

    function onFinishedFailed(e: any) {
        message.warning('表单校验失败，请修改');
    }

    function onCancel() {
        hide();
    }


    return (
        <>
            <Modal title={'编辑计划'} open={helper.isOpen} onCancel={e => onCancel()} footer={null}>
                <Form form={mForm} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} initialValues={formDefault}
                    onFinish={e => onFinish(e)}
                    onFinishFailed={e => onFinishedFailed(e)}
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

PlanEditor.usePlanEditor = usePlanEditorHelper;

export default PlanEditor;
