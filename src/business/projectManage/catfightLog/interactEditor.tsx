import React from "react";
import {Form, Modal, Input, Button, message, Radio, FormInstance} from "antd";
import _, { update } from 'lodash';
// import InteractService from "./interactService";
import moment from "moment";
import EmployeeInput from '../../commonComponent/employeeInput';
import TaskSelect from '../../commonComponent/taskSelect';
import {ITaskData} from "@/src/types/ITaskData";
import fetch from '@/src/fetch';
import ProjectValueMapper from "../projectCommon/projectValueMapper";

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
        const srcOptions = ProjectValueMapper.contactSrcMapper.getInitList().map(item => {
            return <Radio value={item[0]}>{item[1]}</Radio>
        });

        const dirOptions = ProjectValueMapper.contactDirMapper.getInitList().map(item => {
            return <Radio value={item[0]}>{item[1]}</Radio>
        })

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

                        <Form.Item label={'沟通方式'} name={'source'}>
                            <Radio.Group name="source" defaultValue={'email'}>
                                {srcOptions}
                            </Radio.Group>
                        </Form.Item>

                        <Form.Item label={'发起方'} name={'dir'}>
                            <Radio.Group name="source" defaultValue={0}>
                                {dirOptions}
                            </Radio.Group>
                        </Form.Item>

                        <Form.Item label={'对方'} name={'employee'}>
                            <EmployeeInput/>
                        </Form.Item>
                        <Form.Item label={'对方意见'} name={'message'}>
                            <Input.TextArea/>
                        </Form.Item>
                        

                        <Form.Item label={'我方意见'} name={'re_message'}>
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
