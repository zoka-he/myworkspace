import { useRef, useState, forwardRef, useImperativeHandle } from "react";
import {Form, Modal, Input, Button, message, Radio, TreeSelect, Space} from "antd";
import _ from 'lodash';
import fetch from '@/src/fetch';
import { IGeoStarSystemData } from "@/src/types/IAiNoval";
import DayJS from 'dayjs';
import * as EditCommon from "./editCommon";
import { generateGeoEmbedText, getMaxGeoCode } from "@/src/api/aiNovel";

interface IStarSystemEditProps {
    onFinish: (() => void) | undefined
}

interface IStarSystemEditRef {
    showAndEdit: (data: Object) => void;
    show: () => void;
}

const StarSystemEditModal = forwardRef<IStarSystemEditRef, IStarSystemEditProps>((props, ref) => {

    const [mForm] = Form.useForm();
    const [modalOpen, setModalOpen] = useState(false);
    const [starSystemList, setStarSystemList] = useState<EditCommon.IGeoStarSystemDataWithChildren[]>([]);
    const [loading, setLoading] = useState(false);
    const oldDataRef = useRef<IGeoStarSystemData | null>(null);

    useImperativeHandle(ref, () => ({
        showAndEdit,
        show,
    }));

    function parseAndFixData(data: Object) {
        oldDataRef.current = data as IGeoStarSystemData;
        mForm?.setFieldsValue(_.clone(data));
    }

    function show() {
        setModalOpen(true);
        oldDataRef.current = null;
        loadStarSystemTree();
    }

    function showAndEdit(data: Object) {
        setModalOpen(true);
        oldDataRef.current = _.clone(data) as IGeoStarSystemData;
        parseAndFixData(oldDataRef.current);
        loadStarSystemTree();
    }

    function hide() {
        setModalOpen(false);
        mForm?.resetFields();
        oldDataRef.current = null;
    }

    async function loadStarSystemTree() {
        let starSystemList = await EditCommon.loadStarSystemTree();
        setStarSystemList(starSystemList);
    }

    async function onFinish(values: any) {
        let oldData = oldDataRef.current;
        if (oldData) {
            let updateObj = {
                ...oldData,
                ...values,
                updated_at: DayJS().format('YYYY-MM-DD HH:mm:ss')
            };

            try {
                await fetch.post('/api/aiNoval/geo/starSystem', updateObj, { params: { id: updateObj.id } });
    
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
                ...values,
            };

            try {
                await fetch.post('/api/aiNoval/geo/starSystem', createObj);
    
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
            setLoading(true);
            const embedText = await generateGeoEmbedText({
                geoType: '星系',
                description: undefined,
                parentInfo: undefined
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

    function getDefaultFormData(): IGeoStarSystemData {
        return {
            id: null,
            worldview_id: null,
            name: null,
            code: null,
            described_in_llm: 0,
            parent_system_id: null,
            embed_document: null,
        }
    }

    return (
        <>
            <Modal title={'天体系统信息'} open={modalOpen} onCancel={e => onCancel()} footer={null} width={'80vw'}>
                <Form form={mForm} labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} initialValues={getDefaultFormData}
                      onFinish={e => onFinish(e)}
                      onFinishFailed={e => onFinishedFailed(e)}
                >
                    <Form.Item label={'天体系统名称'} name={'name'} rules={[{ required: true, message: '天体系统名称为必填！' }]}>
                        <Input/>
                    </Form.Item>

                    <Form.Item label={'天体系统编码'} name={'code'} rules={[
                        { required: true, message: '编码为必填！' },
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

                    <Form.Item label={'天体系统描述'} name={'description'} rules={[{ required: true, message: '描述为必填！' }]}>
                        <Input.TextArea autoSize={{ minRows: 10 }}/>
                    </Form.Item>

                    <Form.Item label={'父级天体系统'} name={'parent_system_id'}>
                        <TreeSelect
                            treeData={starSystemList}
                            fieldNames={{ label: 'name', value: 'id', children: 'children' }}
                            placeholder="请选择父天体系统"
                            allowClear
                        />
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

export default StarSystemEditModal;
