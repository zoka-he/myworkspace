import React from "react";
import {Form, Modal, Input, Button, message, FormInstance, Radio, Select} from "antd";
import _ from 'lodash';
import fetch from '@/src/fetch';
import { IGeoGeographyUnitData, GEO_UNIT_TYPES, IGeoUnionData } from "@/src/types/IAiNoval";
import { loadGeoUnionList } from "../../common/geoDataUtil";

interface IGeographyUnitEditState {
    modalOpen: boolean,
    loading: boolean,

    // 可选的上级节点列表（行星 / 卫星 / 地理单元）
    parentUnionList: IGeoUnionData[],
}

interface IGeographyUnitEditProps {
    onFinish: (() => void) | undefined
}

class GeographyUnitEdit extends React.Component<IGeographyUnitEditProps, IGeographyUnitEditState> {

    // 使用 any 以兼容 antd FormRef / FormInstance 的差异
    private mForm: any;
    private oldData: IGeoGeographyUnitData | null;

    constructor(props: IGeographyUnitEditProps) {
        super(props);

        this.state = {
            modalOpen: false,
            loading: false,
            parentUnionList: [],
        }

        this.mForm = null;
        this.oldData = null;
    }

    parseAndFixData(data: Object) {
        this.mForm?.setFieldsValue(_.clone(data));
    }

    /**
     * 加载当前世界观下可选的上级节点列表（行星 / 卫星 / 地理单元）
     */
    async loadParentUnionList(worldview_id: number | null | undefined) {
        if (!worldview_id) {
            this.setState({ parentUnionList: [] });
            return;
        }

        try {
            const unionList = await loadGeoUnionList(worldview_id);
            const parentUnionList = unionList.filter(item =>
                item.data_type === 'planet' ||
                item.data_type === 'satellite' ||
                item.data_type === 'geoUnit'
            );

            this.setState({ parentUnionList });

            // 根据 oldData 预设选中项（保持原有逻辑的默认行为）
            if (this.oldData && this.mForm) {
                const parent_type = this.oldData.parent_type;
                const parent_id = this.oldData.parent_id;

                if (parent_type && parent_id) {
                    let dataTypeForSelect: string | null = null;
                    if (parent_type === 'planet') {
                        dataTypeForSelect = 'planet';
                    } else if (parent_type === 'satellite') {
                        dataTypeForSelect = 'satellite';
                    } else {
                        // 地理单元在 unionList 中的 data_type 为 geoUnit
                        dataTypeForSelect = 'geoUnit';
                    }

                    const parentSelectorValue = `${dataTypeForSelect}:${parent_id}`;
                    this.mForm.setFieldsValue({
                        parent_selector: parentSelectorValue,
                    });
                }
            }
        } catch (e: any) {
            message.error(e?.message || '加载上级节点列表失败！');
        }
    }

    /**
     * 用户在“上级节点”下拉框中选择值时，同步更新 parent_type / parent_id / planet_id / satellite_id / star_system_id
     * 保证后端现有逻辑不变，只是改为由表单决定这些字段。
     */
    onParentSelectorChange = (value: string) => {
        if (!value || !this.mForm) return;

        const [dataType, idStr] = value.split(':');
        const parentId = Number(idStr) || null;

        const target = this.state.parentUnionList.find(
            item => item.data_type === dataType && item.id === parentId
        );

        let parent_type: string | null = null;
        let planet_id: number | null = null;
        let satellite_id: number | null = null;
        let star_system_id: number | null = null;

        if (target) {
            star_system_id = target.star_system_id || null;
        }

        switch (dataType) {
            case 'planet':
                parent_type = 'planet';
                planet_id = parentId;
                satellite_id = null;
                break;
            case 'satellite':
                parent_type = 'satellite';
                satellite_id = parentId;
                planet_id = target?.planet_id || null;
                break;
            case 'geoUnit':
                // 地理单元作为上级，parent_type 使用 geoUnit
                parent_type = 'geoUnit';
                planet_id = target?.planet_id || null;
                satellite_id = target?.satellite_id || null;
                break;
        }

        this.mForm.setFieldsValue({
            parent_selector: value,
            parent_type,
            parent_id: parentId,
            planet_id,
            satellite_id,
            star_system_id,
        });
    };

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

        // 打开编辑器时，根据世界观加载可选上级节点
        const dataObject = data as { [key: string]: any };
        this.loadParentUnionList(dataObject.worldview_id || this.oldData.worldview_id || null);
    }

    onFormRef(comp: any) {
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
                <Modal title={'地理单元信息'} open={this.state.modalOpen} onCancel={e => this.onCancel()} footer={null} width={'70vw'}>
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
                        {/* 上级节点选择（支持行星 / 卫星 / 地理单元） */}
                        <Form.Item label={'上级节点'} name={'parent_selector'}>
                            <Select
                                allowClear
                                showSearch
                                placeholder="默认为在树中选中的节点，可在此手动指定"
                                options={this.state.parentUnionList.map(item => {
                                    let typeLabel = '';
                                    if (item.data_type === 'planet') {
                                        typeLabel = '行星';
                                    } else if (item.data_type === 'satellite') {
                                        typeLabel = '卫星';
                                    } else if (item.data_type === 'geoUnit') {
                                        typeLabel = '地理单元';
                                    }
                                    const label = `[${typeLabel}] ${item.name || ''}${item.code ? ` (${item.code})` : ''}`;
                                    const value = `${item.data_type}:${item.id}`;
                                    return { label, value };
                                })}
                                optionFilterProp="label"
                                onChange={this.onParentSelectorChange}
                            />
                        </Form.Item>
                        {/* 隐藏字段：由上级节点选择器自动维护，保持与原有后端字段兼容 */}
                        <Form.Item name={'parent_type'} hidden>
                            <Input type="hidden" />
                        </Form.Item>
                        <Form.Item name={'parent_id'} hidden>
                            <Input type="hidden" />
                        </Form.Item>
                        <Form.Item name={'planet_id'} hidden>
                            <Input type="hidden" />
                        </Form.Item>
                        <Form.Item name={'satellite_id'} hidden>
                            <Input type="hidden" />
                        </Form.Item>
                        <Form.Item name={'star_system_id'} hidden>
                            <Input type="hidden" />
                        </Form.Item>
                        <Form.Item label={'地理单元描述'} name={'description'}>
                            <Input.TextArea autoSize={{ minRows: 10 }}/>
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
