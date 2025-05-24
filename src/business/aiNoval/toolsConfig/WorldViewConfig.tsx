import { useEffect, useState } from "react";
import { ILlmDatasetInfo } from "@/src/utils/dify/types";
import { Button, Form, Input, message, Select, Space } from "antd";
import fetch from '@/src/fetch';
import * as apiCalls from '../worldViewManage/apiCalls';

export function WorldViewConfig() {
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
        let res = await fetch.get('/api/aiNoval/toolConfig/difyDatasets') as ILlmDatasetInfo[];
        let options = res.map((item: ILlmDatasetInfo) => {
            return {
                label: item.name,
                value: item.id
            }
        });
        setLlmDatasetOptions(options);
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
            ['DIFY_GEO_DATASET_ID_' + selectedWorldView]: '',
            ['DIFY_ROLE_DATASET_ID_' + selectedWorldView]: '',
            ['DIFY_EVENTS_DATASET_ID_' + selectedWorldView]: '',
            ['DIFY_FACTION_DATASET_ID_' + selectedWorldView]: '',
            ['DIFY_ITEM_DATASET_ID_' + selectedWorldView]: '',
            ['DIFY_SKILL_DATASET_ID_' + selectedWorldView]: '',
            ['DIFY_AUTO_CHAPTER_PROMPT_API_KEY_' + selectedWorldView]: '',
            ['DIFY_AUTO_WRITE_API_KEY_' + selectedWorldView]: '',
        }
    }

    useEffect(() => {
        loadLlmDatasetOptions();
        loadToolConfig();
    }, []);

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

            <Form.Item name={'DIFY_GEO_DATASET_ID_' + selectedWorldView} label="地理知识库：">
                <Select options={llmDatasetOptions} disabled={!selectedWorldView}/>
            </Form.Item>

            <Form.Item name={'DIFY_ROLE_DATASET_ID_' + selectedWorldView} label="角色知识库：">
                <Select options={llmDatasetOptions} disabled={!selectedWorldView}/>
            </Form.Item>

            <Form.Item name={'DIFY_EVENTS_DATASET_ID_' + selectedWorldView} label="事件知识库：">
                <Select options={llmDatasetOptions} disabled={!selectedWorldView}/>
            </Form.Item>

            <Form.Item name={'DIFY_FACTION_DATASET_ID_' + selectedWorldView} label="阵营知识库：">
                <Select options={llmDatasetOptions} disabled={!selectedWorldView}/>
            </Form.Item>

            <Form.Item name={'DIFY_ITEM_DATASET_ID_' + selectedWorldView} label="物品知识库：">
                <Select options={llmDatasetOptions} disabled={!selectedWorldView}/>
            </Form.Item>

            <Form.Item name={'DIFY_SKILL_DATASET_ID_' + selectedWorldView} label="技能知识库：">
                <Select options={llmDatasetOptions} disabled={!selectedWorldView}/>
            </Form.Item>

            <Form.Item name={'DIFY_AUTO_CHAPTER_PROMPT_API_KEY_' + selectedWorldView} label="章节提示词工作流API Key：">
                <Input disabled={!selectedWorldView}/>
            </Form.Item>

            <Form.Item name={'DIFY_AUTO_WRITE_API_KEY_' + selectedWorldView} label="写作工作流API Key：">
                <Input disabled={!selectedWorldView}/>
            </Form.Item>

            <Form.Item {...tailLayout}>
                <Space>
                    <Button type="primary" htmlType="submit" onClick={handleSubmit} disabled={!selectedWorldView}>保存设置</Button>
                </Space>
            </Form.Item>
        </Form>
    );
} 