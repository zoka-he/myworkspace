import React from "react";
import {Form, Modal, Input, Button, message, FormInstance, Radio} from "antd";
import _ from 'lodash';
import fetch from '@/src/fetch';
import { IGeoStarSystemData } from "@/src/types/IAiNoval";
import DayJS from 'dayjs';

interface IStarSystemEditState {
    modalOpen: boolean,
    loading: boolean,
}

interface IStarSystemEditProps {
    onFinish: (() => void) | undefined
}

class StarSystemEdit extends React.Component<IStarSystemEditProps, IStarSystemEditState> {

    private mForm: FormInstance<any> | null;
    private oldData: IGeoStarSystemData | null;

    constructor(props: IStarSystemEditProps) {
        super(props);

        this.state = {
            modalOpen: false,
            loading: false,
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
                worldview_id: this.props.worldviewId,
                ...values,
                updated_at: DayJS().format('YYYY-MM-DD HH:mm:ss')
            };

            try {
                await fetch.post('/api/aiNoval/geo/starSystem', updateObj, { params: { id: updateObj.id } });
    
                if (this.props.onFinish) {
                    this.props.onFinish();
                }
                message.success('更新成功！');
                this.hide();
            } catch(e) {
                message.error('更新失败！');
            }
        } else {
            let createObj = {
                ...values,
                worldview_id: this.props.worldviewId
            };

            try {
                await fetch.post('/api/aiNoval/geo/starSystem', createObj);
    
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

    private getDefaultFormData(): IGeoStarSystemData {
        return {
            id: null,
            worldview_id: null,
            name: null,
            code: null,
            described_in_llm: 0,
        }
    }

    render() {
        return (
            <>
                <Modal title={'太阳系信息'} open={this.state.modalOpen} onCancel={e => this.onCancel()} footer={null}>
                    <Form ref={comp => this.onFormRef(comp)} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} initialValues={this.getDefaultFormData}
                          onFinish={e => this.onFinish(e)}
                          onFinishFailed={e => this.onFinishedFailed(e)}
                    >
                        <Form.Item label={'太阳系名称'} name={'name'} rules={[{ required: true, message: '太阳系名称为必填！' }]}>
                            <Input/>
                        </Form.Item>
                        <Form.Item label={'太阳系编码'} name={'code'} rules={[{ required: true, message: '小说描述为必填！' }]}>
                            <Input.TextArea/>
                        </Form.Item>
                        <Form.Item label={'是否在知识库中'} name={'described_in_llm'}>
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

export default StarSystemEdit;
