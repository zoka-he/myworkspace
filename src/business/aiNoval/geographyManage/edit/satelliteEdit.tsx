import React from "react";
import {Form, Modal, Input, Button, message, FormInstance, Radio, Select} from "antd";
import _ from 'lodash';
import fetch from '@/src/fetch';
import { IGeoSatelliteData } from "@/src/types/IAiNoval";

interface IPlanetEditState {
    modalOpen: boolean,
    loading: boolean,
}

interface IPlanetEditProps {
    onFinish: (() => void) | undefined
}

class SatelliteEdit extends React.Component<IPlanetEditProps, IPlanetEditState> {

    private mForm: FormInstance<any> | null;
    private oldData: IGeoSatelliteData | null;

    constructor(props: IPlanetEditProps) {
        super(props);

        this.state = {
            modalOpen: false,
            loading: false,
        }

        this.mForm = null;
        this.oldData = null;
    }

    parseAndFixData(data: Object) {
        this.mForm?.setFieldsValue(_.clone(data));
    }

    preCheckData(data: Object) {
        const checkList = [
            'worldview_id',
            'star_system_id',
            'planet_id'
        ];

        if (!data || !(data instanceof Object)) {
            message.error('编辑器初始数据必须为一个对象！');
            return false;
        }

        const dataObject = data as { [key: string]: any };
        for (const key of checkList) {
            if (!dataObject[key]) {
                message.error(`请先选择${key}！`);
                return false;
            }
        }

        return true;
    }

    showAndEdit(data: Object) {
        if (!this.preCheckData(data)) {
            return;
        }

        this.setState({
            modalOpen: true
        });

        this.oldData = {
            ...this.getDefaultFormData(),
            ...data,
        }
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
        if (this.oldData?.id) {
            let updateObj = {
                ...this.oldData,
                ...values,
            };

            try {
                await fetch.post('/api/aiNoval/geo/satellite', updateObj, { params: { id: updateObj.id } });
    
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
                ...this.oldData,
                ...values,
            };

            try {
                await fetch.post('/api/aiNoval/geo/satellite', createObj);
    
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

    private getDefaultFormData(): IGeoSatelliteData {
        return {
            id: null,
            worldview_id: null,
            star_system_id: null,
            planet_id: null,
            name: null,
            code: null,
            description: null,
            described_in_llm: 0,
        }
    }

    render() {
        return (
            <>
                <Modal title={'卫星信息'} open={this.state.modalOpen} onCancel={e => this.onCancel()} footer={null}>
                    <Form ref={comp => this.onFormRef(comp)} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} initialValues={this.getDefaultFormData}
                          onFinish={e => this.onFinish(e)}
                          onFinishFailed={e => this.onFinishedFailed(e)}
                    >
                        <Form.Item label={'卫星名称'} name={'name'} rules={[{ required: true, message: '卫星名称为必填！' }]}>
                            <Input/>
                        </Form.Item>
                        <Form.Item label={'卫星编码'} name={'code'} rules={[{ required: true, message: '卫星编码为必填！' }]}>
                            <Input/>
                        </Form.Item>
                        <Form.Item label={'卫星描述'} name={'description'}>
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

export default SatelliteEdit;
