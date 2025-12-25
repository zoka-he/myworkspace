import React from "react";
import {Form, Modal, Input, Button, message, FormInstance, Radio, Select, TreeSelect} from "antd";
import _ from 'lodash';
import fetch from '@/src/fetch';
import { IGeoStarData } from "@/src/types/IAiNoval";
import DayJS from 'dayjs';
import * as EditCommon from "./editCommon";

interface IStarEditState {
    modalOpen: boolean,
    loading: boolean,
    starSystemList: EditCommon.IGeoStarSystemDataWithChildren[] | null,
}

interface IStarEditProps {
    onFinish: (() => void) | undefined
}

class StarEdit extends React.Component<IStarEditProps, IStarEditState> {

    private mForm: FormInstance<any> | null;
    private oldData: IGeoStarData | null;
    private starSystemList: EditCommon.IGeoStarSystemDataWithChildren[] | null;

    constructor(props: IStarEditProps) {
        super(props);

        this.state = {
            modalOpen: false,
            loading: false,
            starSystemList: null,
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
            'star_system_id'
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

    async loadStarSystemTree() {
        let starSystemList = await EditCommon.loadStarSystemTree();

        this.setState({
            starSystemList
        });
    }

    async onFinish(values: any) {
        if (this.oldData?.id) {
            let updateObj = {
                ...this.oldData,
                ...values,
            };

            try {
                await fetch.post('/api/aiNoval/geo/star', updateObj, { params: { id: updateObj.id } });
    
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
                await fetch.post('/api/aiNoval/geo/star', createObj);
    
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

    private getDefaultFormData(): IGeoStarData {
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
                <Modal title={'恒星信息'} open={this.state.modalOpen} onCancel={e => this.onCancel()} footer={null}>
                    <Form ref={comp => this.onFormRef(comp)} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} initialValues={this.getDefaultFormData}
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
                        <Form.Item label={'恒星名称'} name={'name'} rules={[{ required: true, message: '恒星名称为必填！' }]}>
                            <Input/>
                        </Form.Item>
                        <Form.Item label={'恒星编码'} name={'code'} rules={[{ required: true, message: '恒星编码为必填！' }]}>
                            <Input/>
                        </Form.Item>
                        <Form.Item label={'恒星类型'} name={'type'}>
                            <Select>
                                <Select.Option value={'褐矮星'}>褐矮星</Select.Option>
                                <Select.Option value={'红矮星'}>红矮星</Select.Option>
                                <Select.Option value={'黄矮星'}>黄矮星</Select.Option>
                                <Select.Option value={'蓝超巨星'}>蓝超巨星</Select.Option>
                                <Select.Option value={'红巨星'}>红巨星</Select.Option>
                                <Select.Option value={'白矮星'}>白矮星</Select.Option>
                                <Select.Option value={'中子星'}>中子星</Select.Option>
                                <Select.Option value={'黑洞'}>黑洞</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item label={'恒星描述'} name={'description'}>
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

export default StarEdit;
