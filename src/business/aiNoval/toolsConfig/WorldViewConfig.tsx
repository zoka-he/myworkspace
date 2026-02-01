import { useEffect, useState } from "react";
import { ILlmDatasetInfo } from "@/src/utils/dify/types";
import { Button, Form, Input, message, Select, Space } from "antd";
import fetch from '@/src/fetch';
import * as apiCalls from '../worldViewManage/apiCalls';
import store from '@/src/store';
import { connect } from 'react-redux';

function mapStateToProps(state: any) {
    return {
        difyFrontHost: state.difySlice.frontHost,
    }
}

interface IWorldViewConfigProps {
    difyFrontHost: string;
}

export const WorldViewConfig = connect(mapStateToProps)(function({ difyFrontHost }: IWorldViewConfigProps) {
    let [llmDatasetOptions, setLlmDatasetOptions] = useState<any[]>([]);
    let [worldViewList, setWorldViewList] = useState<any[]>([]);
    let [selectedWorldView, setSelectedWorldView] = useState<any>(null);
    const [formForWorldview] = Form.useForm();

    useEffect(() => {
        apiCalls.getWorldViewList({}).then((res: any) => {
            let options = res.data?.map((item: any) => {
                return {
                    label: item.title,
                    value: item.id
                }
            });
            setWorldViewList(options || []);
        });
    }, []);

    useEffect(() => {
        loadToolConfig();
    }, [selectedWorldView]);

    async function loadLlmDatasetOptions() {
        try {
            let res = await fetch.get('/api/aiNoval/toolConfig/difyDatasets', { params: { difyFrontHost } }) as ILlmDatasetInfo[];
            let options = res.map((item: ILlmDatasetInfo) => {
                return {
                    label: item.name,
                    value: item.id
                }
            });
            setLlmDatasetOptions(options);
        } catch (error: any) {
            console.error('Failed to load LLM dataset options:', error);
            message.error('获取知识库列表失败，请检查Dify服务状态');
        }
    }

    async function loadToolConfig() {
        let res = await fetch.get('/api/aiNoval/toolConfig/params');
        let formData = getDefaultToolConfig();
        for(let key in formData) {
            let value = res?.data?.find((item: any) => item.cfg_name === key)?.cfg_value_string;
            formData[key] = value;
        }

        formForWorldview.setFieldsValue(formData);
    }

    function getDefaultToolConfig(): { [key: string]: string } {
        return {
            ['DIFY_GEN_GEO_NAMES_API_KEY_' + selectedWorldView]: '',
            // ['DIFY_ROLE_DATASET_ID_' + selectedWorldView]: '',
            // ['DIFY_EVENTS_DATASET_ID_' + selectedWorldView]: '',
            // ['DIFY_FACTION_DATASET_ID_' + selectedWorldView]: '',
            // ['DIFY_ITEM_DATASET_ID_' + selectedWorldView]: '',
            // ['DIFY_SKILL_DATASET_ID_' + selectedWorldView]: '',
            // ['DIFY_AUTO_SKELETON_PROMPT_API_KEY_' + selectedWorldView]: '',
            // ['DIFY_AUTO_WRITE_API_KEY_' + selectedWorldView]: '',
            // ['DIFY_AUTO_WRITE_WITH_SKELETON_API_KEY_' + selectedWorldView]: '',
            // ['DIFY_AUTO_WRITE_WITH_CHAT_API_KEY_' + selectedWorldView]: '',
            // ['DIFY_GEN_CHARACTER_API_KEY_' + selectedWorldView]: '',
        }
    }

    useEffect(() => {
        // loadLlmDatasetOptions();
        loadToolConfig();
    }, []);

    useEffect(() => {
        // loadLlmDatasetOptions();
    }, [difyFrontHost]);

    const formLayout = {
        labelCol: { span: 8 },
        wrapperCol: { span: 16 },
    };
    
    const tailLayout = {
        wrapperCol: { offset: 6, span: 18 },
    };

    async function handleSubmit() {
        if (!selectedWorldView) {
            message.error('请先选择世界观');
            return;
        }

        try {
            const formValues = await formForWorldview.validateFields();
            const values = Object.entries(formValues).map(([name, value]) => ({
                name,
                value
            }));
            await fetch.post('/api/aiNoval/toolConfig/params', values);
            message.success('配置已保存');
        } catch (error: any) {
            console.error('Failed to save tool config:', error);
            message.success(error.message);
        }
    }

    return (
        <Form form={formForWorldview} {...formLayout} style={{ maxWidth: 600 }}>
            <Form.Item label="世界观：">
                <Select options={worldViewList} onChange={(value) => {
                    setSelectedWorldView(value);
                }}/>
            </Form.Item>

            <Form.Item name={'DIFY_GEN_GEO_NAMES_API_KEY_' + selectedWorldView} label="地理生成工作流 API Key：">
                <Input disabled={!selectedWorldView}/>
            </Form.Item>

            

            <Form.Item {...tailLayout}>
                <Space>
                    <Button type="primary" htmlType="submit" onClick={handleSubmit} disabled={!selectedWorldView}>保存设置</Button>
                </Space>
            </Form.Item>
        </Form>
    );
})