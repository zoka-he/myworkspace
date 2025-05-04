import React from "react";
import {Form, Modal, Input, Button, message, FormInstance} from "antd";
import _ from 'lodash';
import fetch from '@/src/fetch';
import { INovalData } from "@/src/types/IAiNoval";
import DayJS from 'dayjs';

interface INovalInfoEditorState {
    modalOpen: boolean,
    loading: boolean,
}

interface INovalInfoEditorProps {
    
    novalData: INovalData,
    onFinish: (() => void) | undefined
}

function getDefaultNovalData(): INovalData {
    return {
        id: null,
        title: null,
        description: null,
        createdAt: null,
        updatedAt: null,
    }
}

class NovalInfoEditor extends React.Component<INovalInfoEditorProps, INovalInfoEditorState> {

    private novalData: INovalData;
    private mForm: FormInstance<any> | null;
    private oldData: INovalData | null;

    constructor(props: INovalInfoEditorProps) {
        super(props);

        this.state = {
            modalOpen: false,
            loading: false,
        }

        // 默认值
        this.novalData = this.getDefaultNovalData();

        this.mForm = null;
        this.oldData = null;
    }

    show() {
        this.setState({
            modalOpen: true
        });

        this.oldData = null;
    }

    parseAndFixData(data: Object) {
        this.mForm?.setFieldsValue(_.clone(data));
    }

    showAndEdit(data: Object) {
        this.setState({
            modalOpen: true
        });

        this.oldData = _.clone(data);
        this.parseAndFixData(this.oldData);
    }

    onFormRef(comp: FormInstance<any> | null) {
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
        if (this.oldData) {
            let updateObj = {
                ...this.oldData,
                ...values,
                updated_at: DayJS().format('YYYY-MM-DD HH:mm:ss')
            };

            try {
                await fetch.post('/api/aiNoval/noval', updateObj, { params: { id: updateObj.id } });
    
                if (this.props.onFinish) {
                    this.props.onFinish();
                }
                message.success('更新成功！');
                this.hide();
            } catch(e) {
                message.error('更新失败！');
            }
        } else {
            let createObj = _.clone(values);
            try {
                await fetch.post('/api/aiNoval/noval', createObj);
    
                if (this.props.onFinish) {
                    this.props.onFinish();
                }
                message.success('创建成功！');
                this.hide();
            } catch(e) {
                message.error('创建失败！');
            }
        }
    }

    onFinishedFailed(e: any) {
        message.warning('表单校验失败，请修改');
    }

    onCancel() {
        this.hide();
    }

    private getDefaultNovalData(): INovalData {
        return {
            id: null,
            title: null,
            description: null,
            createdAt: null,
            updatedAt: null,
        }
    }

    render() {
        return (
            <>
                <Modal title={'小说信息'} open={this.state.modalOpen} onCancel={e => this.onCancel()} footer={null}>
                    <Form ref={comp => this.onFormRef(comp)} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} initialValues={this.getDefaultNovalData}
                          onFinish={e => this.onFinish(e)}
                          onFinishFailed={e => this.onFinishedFailed(e)}
                    >
                        <Form.Item label={'小说名称'} name={'title'} rules={[{ required: true, message: '小说名称为必填！' }]}>
                            <Input/>
                        </Form.Item>
                        <Form.Item label={'小说描述'} name={'description'} rules={[{ required: true, message: '小说描述为必填！' }]}>
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

export default NovalInfoEditor;
