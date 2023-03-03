import React from "react";
import {Form, Modal, Input, Button, message} from "antd";
import _ from 'lodash';
import fetch from '@/src/fetch';

class accountEditor extends React.Component {
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
        try {
            let createObj = _.clone(values);
            await fetch.post('/api/infos/account', createObj);

            if (this.props.onFinish) {
                this.props.onFinish();
            }
            message.success('提交成功！');
            this.hide();
        } catch(e) {
            message.error('提交失败！');
        }
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
                <Modal title={'编辑账号'} open={this.state.modalOpen} onOk={e => this.onOk(e)} onCancel={e => this.onCancel(e)} footer={null}>
                    <Form ref={comp => this.onFormRef(comp)} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} initialValues={this.formDefault}
                          onFinish={e => this.onFinish(e)}
                          onFinishFailed={e => this.onFinishedFailed(e)}
                    >
                        <Form.Item label={'平台'} name={'sys_name'} rules={[{ required: true, message: '平台名称为必填！' }]}>
                            <Input/>
                        </Form.Item>
                        <Form.Item label={'账号'} name={'username'} rules={[{ required: true, message: '账号为必填！' }]}>
                            <Input/>
                        </Form.Item>
                        <Form.Item label={'密码'} name={'passwd'}>
                            <Input/>
                        </Form.Item>
                        <Form.Item label={'备注'} name={'remark'}>
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

export default accountEditor;
