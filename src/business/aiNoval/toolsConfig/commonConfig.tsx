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
            ['DIFY_PARAGRAPH_STRIPPER_API_KEY']: '',
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
            <Form.Item name={'DIFY_PARAGRAPH_STRIPPER_API_KEY'} label="段落缩写工作流API Key：">
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