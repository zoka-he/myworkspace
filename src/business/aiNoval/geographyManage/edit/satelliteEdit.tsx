import React from "react";
import {Form, Modal, Input, Button, message, FormInstance, Radio, Select, TreeSelect} from "antd";
import _ from 'lodash';
import fetch from '@/src/fetch';
import { IGeoSatelliteData } from "@/src/types/IAiNoval";
import * as EditCommon from "./editCommon";

interface IPlanetEditState {
    modalOpen: boolean,
    loading: boolean,
    starSystemList: EditCommon.IGeoStarSystemDataWithChildren[] | null,
    planetList: EditCommon.IGeoPlanetDataWithChildren[] | null,
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
            starSystemList: null,
            planetList: null,
        }

        this.mForm = null;
        this.oldData = null;
    }

    parseAndFixData(data: Object) {
        console.log("parseAndFixData", data);
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
        this.loadStarSystemTree();
    }

    onFormRef(comp: FormInstance<any> | null) {
        if (!this.mForm) {
            this.mForm = comp;
            if (this.oldData) {
                this.parseAndFixData(this.oldData);
            }
        }
    }

    hide() {
        this.setState({
            modalOpen: false
        });
        this.mForm?.resetFields();
    }

    async loadStarSystemTree() {
        let starSystemList = await EditCommon.loadStarSystemTree();
        this.setState({
            starSystemList
        });
    }

    async loadPlanetList(star_system_id?: number) {
        let params = { worldview_id: this.oldData?.worldview_id, star_system_id: star_system_id };

        let planetList = await EditCommon.loadPlanetList(params);
        this.setState({
            planetList
        });
    }

    onFormChange(values: any) {
        console.log("onFormChange", values);
        this.loadPlanetList(values.star_system_id);
        return values;
    }

    async onFinish(values: any) {

        console.log("onFinish", values);

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
                          onValuesChange={values => this.onFormChange(values)}
                          onFinish={e => this.onFinish(e)}
                          onFinishFailed={e => this.onFinishedFailed(e)}
                    >
                        <Form.Item label={'天体系统'} name={'star_system_id'} rules={[{ required: true, message: '天体系统为必填！' }]}>
                            <TreeSelect
                                treeData={this.state.starSystemList || []}
                                fieldNames={{ label: 'name', value: 'id', children: 'children' }}
                                placeholder="请选择天体系统"
                                allowClear
                            />
                        </Form.Item>
                        <Form.Item label={'行星'} name={'planet_id'} rules={[{ required: true, message: '行星为必填！' }]}>
                            <Select
                                options={this.state.planetList?.map(item => ({ label: item.name, value: item.id })) || []}
                                placeholder="请选择行星"
                                allowClear
                            />
                        </Form.Item>
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
