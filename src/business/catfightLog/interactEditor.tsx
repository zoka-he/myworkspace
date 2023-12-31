import React from "react";
import {Form, Modal, Input, Button, message, Radio, FormInstance} from "antd";
import _, { update } from 'lodash';
// import InteractService from "./interactService";
import moment from "moment";
import EmployeeInput from '../commonComponent/employeeInput';
import TaskSelect from '../commonComponent/taskSelect';
import {ITaskData} from "@/src/types/ITaskData";
import fetch from '@/src/fetch';

interface IInteractEditorProps {
    onFinish: Function
}

interface IInteractEditorState {
    modalOpen: boolean,
    loading: boolean
}

class InteractEditor extends React.Component<IInteractEditorProps, IInteractEditorState> {

    private mForm: FormInstance | null;
    private oldData: any;
    private formDefault: ITaskData;

    constructor(props: any) {
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

    parseAndFixData(data: any) {
        // 避开antd识别日期的坑
        this.mForm?.setFieldsValue(_.clone(data));
    }

    showAndEdit(task: any) {
        this.setState({
            modalOpen: true
        });

        this.oldData = _.clone(task);
        this.parseAndFixData(this.oldData);
    }

    /**
     * 打开，并自动附带上任务ID
     * @param task
     */
    showWithTask(task: any) {
        let { ID } = task;
        this.setState({
            modalOpen: true
        });

        this.oldData = { task_id: ID };
        this.mForm?.setFieldsValue(this.oldData);
    }

    onFormRef(comp: FormInstance<any> | null) {
        this.mForm = comp;
        if (comp && this.oldData) {
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

        if (this.oldData?.ID) {
            let updateObj = _.clone(values);

            delete updateObj['create_time'];
            updateObj.update_time = moment().format('YYYY-MM-DD HH:mm:ss');

            // await new InteractService().updateOne(this.oldData, updateObj);
            await fetch.post('/api/interact', updateObj, { params: { ID: this.oldData.ID } });
        } else {
            let createObj = _.clone(values);
            createObj.create_time = moment().format('YYYY-MM-DD HH:mm:ss');

            // await new InteractService().insertOne(createObj);
            await fetch.post('/api/interact', createObj);
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
                <Modal title={'编辑沟通日志'} open={this.state.modalOpen} onCancel={e => this.onCancel()} footer={null}>
                    <Form ref={comp => this.onFormRef(comp)} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} initialValues={this.formDefault}
                          onFinish={e => this.onFinish(e)}
                          onFinishFailed={e => this.onFinishedFailed()}
                    >
                        <Form.Item label={'关联任务'} name={'task_id'} rules={[{ required: true, message: '任务名为必填！' }]}>
                            <TaskSelect/>
                        </Form.Item>
                        <Form.Item label={'提议人'} name={'employee'}>
                            <EmployeeInput/>
                        </Form.Item>
                        <Form.Item label={'提议内容'} name={'message'}>
                            <Input.TextArea/>
                        </Form.Item>
                        <Form.Item label={'来源'} name={'source'}>
                            <Radio.Group name="source" defaultValue={'email'}>
                                <Radio value={'email'}>邮件</Radio>
                                <Radio value={'oa'}>OA</Radio>
                                <Radio value={'bb'}>口头</Radio>
                            </Radio.Group>
                        </Form.Item>
                        <Form.Item label={'答复内容'} name={'re_message'}>
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

export default InteractEditor;
