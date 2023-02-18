import React from "react";
import {Form, Modal, Input, Select, Button, message, DatePicker} from "antd";
import _ from 'lodash';
import employeeDao from "./employeeDao";
import moment from "moment";
import EmployeeService from './employeeService';

class EmployeeEditor extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            modalOpen: false,
            loading: false,
        }

        this.formDefault = {}

        this.mForm = null;
        this.oldObj = null;
    }

    show() {
        this.setState({
            modalOpen: true
        });

        this.oldObj = null;
    }

    parseAndFixData(data) {
        this.mForm?.setFieldsValue(_.clone(data));
    }

    showAndEdit(data) {
        this.setState({
            modalOpen: true
        });

        this.oldObj = _.clone(data);

        this.parseAndFixData(this.oldObj);
    }

    onFormRef(comp) {
        this.mForm = comp;
        if (this.oldObj) {
            this.parseAndFixData(this.oldObj);
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

        let service = new EmployeeService();

        if (this.oldObj) {
            let updateObj = _.clone(values);
            delete updateObj['create_time'];
            updateObj.update_time = moment().format('YYYY-MM-DD HH:mm:ss');
            await service.updateOne(this.oldObj, updateObj);
        } else {
            let createObj = _.clone(values);
            await service.insertOne(createObj);
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
                        <Form.Item label={'姓名'} name={'name'} rules={[{ required: true, message: '姓名为必填！' }]}>
                            <Input/>
                        </Form.Item>
                        <Form.Item label={'手机'} name={'phone'}>
                            <Input/>
                        </Form.Item>
                        <Form.Item label={'邮箱'} name={'email'}>
                            <Input/>
                        </Form.Item>
                        <Form.Item label={'公司'} name={'corp'}>
                            <Input/>
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

export default EmployeeEditor;
