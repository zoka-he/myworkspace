import { useRef, useState, forwardRef, useImperativeHandle } from "react";
import {Form, Modal, Input, Button, message, FormInstance, Radio, Select, TreeSelect, Space} from "antd";
import _ from 'lodash';
import fetch from '@/src/fetch';
import { IGeoPlanetData } from "@/src/types/IAiNoval";
import * as EditCommon from "./editCommon";
import { getMaxGeoCode, generateGeoEmbedText } from "@/src/api/aiNovel";

interface IPlanetEditProps {
    onFinish?: (() => void) | undefined
}

interface IPlanetEditRef {
    showAndEdit: (data: Object) => void;
}

const PlanetEditModal = forwardRef<IPlanetEditRef, IPlanetEditProps>((props, ref) => {

    const [mForm] = Form.useForm();
    const [modalOpen, setModalOpen] = useState(false);
    const [starSystemList, setStarSystemList] = useState<EditCommon.IGeoStarSystemDataWithChildren[] | null>(null);
    const [loading, setLoading] = useState(false);
    const oldDataRef = useRef<IGeoPlanetData | null>(null);

    useImperativeHandle(ref, () => ({
        showAndEdit,
        hide,
    }));

    function parseAndFixData(data: Object) {
        oldDataRef.current = data;
        mForm?.setFieldsValue(_.clone(data));
    }

    function preCheckData(data: Object) {
        const checkList = [
            'worldview_id',
            'star_system_id',
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
        loadStarSystemTree();
    }

    function hide() {
        setModalOpen(false);
        mForm?.resetFields();
    }

    async function loadStarSystemTree() {
        let starSystemList = await EditCommon.loadStarSystemTree();
        setStarSystemList(starSystemList);
    }

    async function onFinish(values: any) {
        let oldData = oldDataRef.current;
        if (oldData?.id) {
            let updateObj = {
                ...oldData,
                ...values,
            };

            try {
                await fetch.post('/api/aiNoval/geo/planet', updateObj, { params: { id: updateObj.id } });
    
                if (props.onFinish) {
                    props.onFinish();
                }
                message.success('更新成功！');
                oldDataRef.current = null;
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
                await fetch.post('/api/aiNoval/geo/planet', createObj);
    
                if (props.onFinish) {
                    props.onFinish();
                }
                message.success('创建成功！');
                oldDataRef.current = null;
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
            const description = formValues.description;

            setLoading(true);
            const embedText = await generateGeoEmbedText({
                geoType: '行星',
                description: description || undefined,
                parentInfo: '所属星系'
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

    function getDefaultFormData(): IGeoPlanetData {
        return {
            id: null,
            worldview_id: null,
            star_system_id: null,
            name: null,
            code: null,
            description: null,
            described_in_llm: 0,
            embed_document: null,
        }
    }


    return (
        <>
            <Modal title={'行星信息'} open={modalOpen} onCancel={e => onCancel()} footer={null} width={'80vw'}>
                <Form form={mForm} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} initialValues={getDefaultFormData}
                        onFinish={e => onFinish(e)}
                        onFinishFailed={e => onFinishedFailed(e)}
                >
                    <Form.Item label={'天体系统'} name={'star_system_id'} rules={[{ required: true, message: '天体系统为必填！' }]}>
                        <TreeSelect
                            treeData={starSystemList || []}
                            fieldNames={{ label: 'name', value: 'id', children: 'children' }}
                            placeholder="请选择天体系统"
                            allowClear
                        />
                    </Form.Item>
                    <Form.Item label={'行星名称'} name={'name'} rules={[{ required: true, message: '行星名称为必填！' }]}>
                        <Input/>
                    </Form.Item>
                    <Form.Item label={'行星编码'} name={'code'} rules={[
                        { required: true, message: '行星编码为必填！' },
                        {
                            validateTrigger: ['onChange', 'onBlur'],
                            warningOnly: true,
                            validator: async (arg1: any, value: string) => {
                                if (!value || value.length < 2) return Promise.resolve()
                                // 查询maxcode
                                try {
                                    const maxcode = await getMaxGeoCode(value);
                                    if (value < maxcode) {
                                        return Promise.reject(new Error(`当前最大编码：${maxcode}`))
                                    }
                                } catch (e) {
                                    // 忽略接口异常
                                }
                                return Promise.resolve()
                            }
                        }
                    ]}>
                        <Input/>
                    </Form.Item>
                    <Form.Item label={'行星描述'} name={'description'}>
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

export default PlanetEditModal;

