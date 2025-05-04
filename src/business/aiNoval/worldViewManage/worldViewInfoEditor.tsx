import React from "react";
import {Form, Modal, Input, Button, message, FormInstance, Radio} from "antd";
import _ from 'lodash';
import fetch from '@/src/fetch';
import { IWorldViewData } from "@/src/types/IAiNoval";
import DayJS from 'dayjs';

interface IWorldViewInfoEditorState {
    modalOpen: boolean,
    loading: boolean,
}

interface IWorldViewInfoProps {
    worldViewData: IWorldViewData,
    onFinish: (() => void) | undefined
}

class WorldViewInfoEditor extends React.Component<IWorldViewInfoProps, IWorldViewInfoEditorState> {

    private worldViewData: IWorldViewData;
    private mForm: FormInstance<any> | null;
    private oldData: IWorldViewData | null;

    constructor(props: IWorldViewInfoProps) {
        super(props);

        this.state = {
            modalOpen: false,
            loading: false,
        }

        // 默认值
        this.worldViewData = this.getDefaultNovalData();

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
                await fetch.post('/api/aiNoval/worldView', updateObj, { params: { id: updateObj.id } });
    
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
                await fetch.post('/api/aiNoval/worldView', createObj);
    
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

    private getDefaultNovalData(): IWorldViewData {
        return {
            id: null,
            title: null,
            content: null,
            is_dify_knowledge_base: 0
        }
    }

    render() {
        return (
            <>
                <Modal title={'世界观信息'} open={this.state.modalOpen} onCancel={e => this.onCancel()} footer={null}>
                    <Form ref={comp => this.onFormRef(comp)} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} initialValues={this.getDefaultNovalData}
                          onFinish={e => this.onFinish(e)}
                          onFinishFailed={e => this.onFinishedFailed(e)}
                    >
                        <Form.Item label={'世界观名称'} name={'title'} rules={[{ required: true, message: '世界观名称为必填！' }]}>
                            <Input/>
                        </Form.Item>
                        <Form.Item label={'世界观描述'} name={'content'} rules={[{ required: true, message: '世界观简述为必填！' }]}>
                            <Input.TextArea/>
                        </Form.Item>
                        <Form.Item label={'是否在知识库'} name={'is_dify_knowledge_base'}>
                            <Radio.Group>
                                <Radio value={1}>是</Radio>
                                <Radio value={0}>否</Radio>
                            </Radio.Group>
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

export default WorldViewInfoEditor;
