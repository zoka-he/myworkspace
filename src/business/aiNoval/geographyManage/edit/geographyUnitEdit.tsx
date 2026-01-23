import { useRef, useState, forwardRef, useImperativeHandle } from "react";
import {Form, Modal, Input, Button, message, Radio, Select, Space} from "antd";
import _ from 'lodash';
import fetch from '@/src/fetch';
import { IGeoGeographyUnitData, GEO_UNIT_TYPES, IGeoUnionData } from "@/src/types/IAiNoval";
import { loadGeoUnionList } from "../../common/geoDataUtil";
import { generateGeoEmbedText } from "@/src/api/aiNovel";

interface IGeographyUnitEditProps {
    onFinish: (() => void) | undefined
}

interface IGeographyUnitEditRef {
    showAndEdit: (data: Object) => void;
}

const GeographyUnitEditModal = forwardRef<IGeographyUnitEditRef, IGeographyUnitEditProps>((props, ref) => {

    const [mForm] = Form.useForm();
    const [modalOpen, setModalOpen] = useState(false);
    const [parentUnionList, setParentUnionList] = useState<IGeoUnionData[]>([]);
    const [loading, setLoading] = useState(false);
    const oldDataRef = useRef<IGeoGeographyUnitData | null>(null);

    useImperativeHandle(ref, () => ({
        showAndEdit,
    }));

    function parseAndFixData(data: Object) {
        oldDataRef.current = data as IGeoGeographyUnitData;
        mForm?.setFieldsValue(_.clone(data));
    }

    /**
     * 加载当前世界观下可选的上级节点列表（行星 / 卫星 / 地理单元）
     */
    async function loadParentUnionList(worldview_id: number | null | undefined) {
        if (!worldview_id) {
            setParentUnionList([]);
            return;
        }

        try {
            const unionList = await loadGeoUnionList(worldview_id);
            const parentUnionList = unionList.filter(item =>
                item.data_type === 'planet' ||
                item.data_type === 'satellite' ||
                item.data_type === 'geoUnit'
            );

            setParentUnionList(parentUnionList);

            // 根据 oldData 预设选中项（保持原有逻辑的默认行为）
            if (oldDataRef.current && mForm) {
                const parent_type = oldDataRef.current.parent_type;
                const parent_id = oldDataRef.current.parent_id;

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
                    mForm.setFieldsValue({
                        parent_selector: parentSelectorValue,
                    });
                }
            }
        } catch (e: any) {
            message.error(e?.message || '加载上级节点列表失败！');
        }
    }

    /**
     * 用户在"上级节点"下拉框中选择值时，同步更新 parent_type / parent_id / planet_id / satellite_id / star_system_id
     * 保证后端现有逻辑不变，只是改为由表单决定这些字段。
     */
    function onParentSelectorChange(value: string) {
        if (!value || !mForm) return;

        const [dataType, idStr] = value.split(':');
        const parentId = Number(idStr) || null;

        const target = parentUnionList.find(
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

        mForm.setFieldsValue({
            parent_selector: value,
            parent_type,
            parent_id: parentId,
            planet_id,
            satellite_id,
            star_system_id,
            has_geo_area: 'N',
        });
    }

    function preCheckData(data: Object) {
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

    function showAndEdit(data: Object) {
        if (!preCheckData(data)) {
            return;
        }

        setModalOpen(true);
        
        let oldData = {
            ...getDefaultFormData(),
            ...data,
        }
        parseAndFixData(oldData);

        // 打开编辑器时，根据世界观加载可选上级节点
        const dataObject = data as { [key: string]: any };
        loadParentUnionList(dataObject.worldview_id || oldDataRef.current?.worldview_id || null);
    }

    function hide() {
        setModalOpen(false);
        mForm?.resetFields();
        oldDataRef.current = null;
    }

    async function onFinish(values: any) {
        let oldData = oldDataRef.current;
        if (oldData?.id) {
            let updateObj = {
                ...oldData,
                ...values,
            };

            try {
                await fetch.post('/api/aiNoval/geo/geoUnit', updateObj, { params: { id: updateObj.id } });
    
                if (props.onFinish) {
                    props.onFinish();
                }
                message.success('更新成功！');
                hide();
            } catch(e) {
                message.error('更新失败！');
            }
        } else {
            let createObj = {
                ...oldData,
                ...values,
            };

            try {
                await fetch.post('/api/aiNoval/geo/geoUnit', createObj);
    
                if (props.onFinish) {
                    props.onFinish();
                }
                message.success('创建成功！');
                hide();
            } catch(e) {
                message.error('创建失败！');
            }
        }
    }

    function onFinishedFailed(e: any) {
        message.warning('表单校验失败，请修改');
    }

    function onCancel() {
        hide();
    }

    /**
     * 生成嵌入文档
     */
    async function handleGenerateEmbedText() {
        try {
            const formValues = mForm.getFieldsValue();
            const type = formValues.type;
            const description = formValues.description;

            if (!type) {
                message.warning('请先选择地理单元类型！');
                return;
            }

            // 获取类型的中文名称
            const geoTypeItem = GEO_UNIT_TYPES.find(item => item.enName === type);
            const geoType = geoTypeItem ? geoTypeItem.cnName : type;

            // 获取上级关系信息
            let parentInfo: string | undefined;
            const parentType = formValues.parent_type;
            if (parentType === 'planet') {
                parentInfo = '所属行星';
            } else if (parentType === 'satellite') {
                parentInfo = '所属卫星';
            } else if (parentType === 'geoUnit') {
                parentInfo = '所属地理单元';
            }

            setLoading(true);
            const embedText = await generateGeoEmbedText({
                geoType,
                description: description || undefined,
                parentInfo
            });

            mForm.setFieldsValue({ embed_document: embedText });
            message.success('嵌入文档生成成功！');
        } catch (error: any) {
            console.error('生成嵌入文档失败：', error);
            message.error(error?.message || '生成嵌入文档失败！');
        } finally {
            setLoading(false);
        }
    }

    function getDefaultFormData(): IGeoGeographyUnitData {
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
            embed_document: null,
        }
    }

    function getGeoUnitOptions() {
        return GEO_UNIT_TYPES.map(item => ({
            label: `${item.cnName} - ${item.codePrefix}`,
            value: item.enName,
        }));
    }

    return (
        <>
            <Modal title={'地理单元信息'} open={modalOpen} onCancel={e => onCancel()} footer={null} width={'80vw'}>
                <Form form={mForm} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} initialValues={getDefaultFormData}
                      onFinish={e => onFinish(e)}
                      onFinishFailed={e => onFinishedFailed(e)}
                >
                    <Form.Item label={'地理单元名称'} name={'name'} rules={[{ required: true, message: '地理单元名称为必填！' }]}>
                        <Input/>
                    </Form.Item>
                    <Form.Item label={'地理单元类型'} name={'type'} rules={[{ required: true, message: '地理单元类型为必填！' }]}>
                        <Select options={getGeoUnitOptions()} showSearch/>
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
                    
                    <Form.Item label={'是否具有疆域意义'} name={'has_geo_area'}>
                        <Radio.Group>
                            <Radio value={"Y"}>是</Radio>
                            <Radio value={"N"}>否</Radio>
                        </Radio.Group>
                    </Form.Item>
                    {/* 上级节点选择（支持行星 / 卫星 / 地理单元） */}
                    <Form.Item label={'上级节点'} name={'parent_selector'}>
                        <Select
                            allowClear
                            showSearch
                            placeholder="默认为在树中选中的节点，可在此手动指定"
                            options={parentUnionList.map(item => {
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
                            onChange={onParentSelectorChange}
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
                    
                    <Form.Item label={'嵌入文档'}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Button 
                                type="default" 
                                onClick={handleGenerateEmbedText}
                                loading={loading}
                            >
                                生成嵌入文档
                            </Button>
                            <Form.Item name={'embed_document'} noStyle>
                                <Input.TextArea autoSize={{ minRows: 5 }}/>
                            </Form.Item>
                        </Space>
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
});

export default GeographyUnitEditModal;
