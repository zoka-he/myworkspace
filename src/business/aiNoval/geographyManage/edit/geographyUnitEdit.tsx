import React from "react";
import {Form, Modal, Input, Button, message, FormInstance, Radio, Select} from "antd";
import _ from 'lodash';
import fetch from '@/src/fetch';
import { IGeoGeographyUnitData, GEO_UNIT_TYPES } from "@/src/types/IAiNoval";

interface IGeographyUnitEditState {
    modalOpen: boolean,
    loading: boolean,
}

interface IGeographyUnitEditProps {
    onFinish: (() => void) | undefined
}

class GeographyUnitEdit extends React.Component<IGeographyUnitEditProps, IGeographyUnitEditState> {

    private mForm: FormInstance<any> | null;
    private oldData: IGeoGeographyUnitData | null;

    constructor(props: IGeographyUnitEditProps) {
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
        const baseCheckList = [
            'worldview_id',
            'star_system_id',
            'parent_id',
            'parent_type',
        ];

        if (!data || !(data instanceof Object)) {
            message.error('编辑器初始数据必须为一个对象！');
            return false;
        }

        const dataObject = data as { [key: string]: any };
        for (const key of baseCheckList) {
            if (!dataObject[key]) {
                message.error(`请先选择${key}！`);
                return false;
            }
        }

        switch (dataObject.parent_type) {
            case 'planet':
                if (!dataObject.planet_id) {
                    message.error('请先选择行星！');
                    return false;
                }
                break;

            case 'satellite':
                if (!dataObject.satellite_id) {
                    message.error('请先选择卫星！');
                    return false;
                }
                break;
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
                await fetch.post('/api/aiNoval/geo/geoUnit', updateObj, { params: { id: updateObj.id } });
    
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
                await fetch.post('/api/aiNoval/geo/geoUnit', createObj);
    
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

    private getDefaultFormData(): IGeoGeographyUnitData {
        return {
            id: null,
            worldview_id: null,
            name: null,
            code: null,
            type: null,
            parent_type: null,
            planet_id: null,
            satellite_id: null,
            description: null,
            described_in_llm: 0,
        }
    }

    private getGeoUnitOptions() {
        return GEO_UNIT_TYPES.map(item => ({
            label: `${item.cnName} - ${item.codePrefix}`,
            value: item.enName,
        }));
    }

    render() {
        return (
            <>
                <Modal title={'地理单元信息'} open={this.state.modalOpen} onCancel={e => this.onCancel()} footer={null}>
                    <Form ref={comp => this.onFormRef(comp)} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} initialValues={this.getDefaultFormData}
                          onFinish={e => this.onFinish(e)}
                          onFinishFailed={e => this.onFinishedFailed(e)}
                    >
                        <Form.Item label={'地理单元名称'} name={'name'} rules={[{ required: true, message: '地理单元名称为必填！' }]}>
                            <Input/>
                        </Form.Item>
                        <Form.Item label={'地理单元编码'} name={'code'} rules={[{ required: true, message: '地理单元编码为必填！' }, {
                            validateTrigger: ['onChange', 'onBlur'],
                            warningOnly: true,
                            validator: async (arg1: any, value: string) => {
                                if (!value || value.length < 2) return Promise.resolve()
                                // 查询maxcode
                                try {
                                    const res = await fetch.get('/api/web/aiNoval/geo/geoUnit/maxCode', { params: { prefix: value.slice(0, 2) } })
                                    const maxcode = res?.data
                                    if (value < maxcode) {
                                        return Promise.reject(new Error(`当前最大编码：${maxcode}`))
                                    }
                                } catch (e) {
                                    // 忽略接口异常
                                }
                                return Promise.resolve()
                            }
                        }]}>
                            <Input/>
                        </Form.Item>
                        <Form.Item label={'地理单元类型'} name={'type'} rules={[{ required: true, message: '地理单元类型为必填！' }]}>
                            <Select options={this.getGeoUnitOptions()}/>
                        </Form.Item>
                        <Form.Item label={'地理单元描述'} name={'description'}>
                            <Input.TextArea autoSize={{ minRows: 6 }}/>
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

export default GeographyUnitEdit;
