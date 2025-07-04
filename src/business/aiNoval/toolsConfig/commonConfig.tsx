import { useEffect, useState } from "react";
import { Button, Form, Input, message, Select, Space } from "antd";
import fetch from '@/src/fetch';

export function CommonConfig() {
    const [formForCommon] = Form.useForm();

    useEffect(() => {
        loadToolConfig();
    }, []);

    async function loadToolConfig() {
        let res = await fetch.get('/api/aiNoval/toolConfig/params');
        let formData = getDefaultToolConfig();
        for(let key in formData) {
            let value = res?.data?.find((item: any) => item.cfg_name === key)?.cfg_value_string;
            formData[key] = value;
        }

        formForCommon.setFieldsValue(formData);
    }

    function getDefaultToolConfig(): { [key: string]: string } {
        return {
            ['DIFY_DATASET_BASE_URL']: '',
            ['DIFY_DATASET_API_KEY']: '',
            ['DIFY_PARAGRAPH_STRIPPER_API_KEY']: '',
            ['DIFY_PARAGRAPH_TITLE_API_KEY']: '',
            ['DIFY_PARAGRAPH_ROLES_API_KEY']: '',
            ['DIFY_PARAGRAPH_FACTIONS_API_KEY']: '',
            ['DIFY_PARAGRAPH_LOCATIONS_API_KEY']: '',
            ['DIFY_PARAGRAPH_COMBINE_API_KEY']: '',
        }
    }

    const formLayout = {
        labelCol: { span: 8 },
        wrapperCol: { span: 16 },
    };
    
    const tailLayout = {
        wrapperCol: { offset: 8, span: 16 },
    };

    async function handleSubmit() {
        try {
            const formValues = await formForCommon.validateFields();
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
        <Form form={formForCommon} {...formLayout} style={{ maxWidth: 600 }}>
            <Form.Item name={'DIFY_DATASET_BASE_URL'} label="DIFY知识库API入口：">
                <Input/>
            </Form.Item>

            <Form.Item name={'DIFY_DATASET_API_KEY'} label="DIFY知识库API Key：">
                <Input/>
            </Form.Item>

            <Form.Item name={'DIFY_PARAGRAPH_STRIPPER_API_KEY'} label="段落缩写工作流API Key：">
                <Input/>
            </Form.Item>
            
            <Form.Item name={'DIFY_PARAGRAPH_TITLE_API_KEY'} label="段落标题工作流API Key：">
                <Input/>
            </Form.Item>

            <Form.Item name={'DIFY_PARAGRAPH_ROLES_API_KEY'} label="提取角色工作流API Key：">
                <Input/>
            </Form.Item>

            <Form.Item name={'DIFY_PARAGRAPH_FACTIONS_API_KEY'} label="提取阵营工作流API Key：">
                <Input/>

            </Form.Item>

            <Form.Item name={'DIFY_PARAGRAPH_LOCATIONS_API_KEY'} label="提取地理工作流API Key：">
                <Input/>
            </Form.Item>

            <Form.Item name={'DIFY_PARAGRAPH_COMBINE_API_KEY'} label="融合文段工作流API Key：">
                <Input/>
            </Form.Item>


            <Form.Item {...tailLayout}>
                <Space>
                    <Button type="primary" htmlType="submit" onClick={handleSubmit}>保存设置</Button>
                </Space>
            </Form.Item>
        </Form>
    );
} 