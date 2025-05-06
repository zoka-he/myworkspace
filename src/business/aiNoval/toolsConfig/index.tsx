import { useEffect, useState } from "react";
import { ILlmDatasetInfo } from "@/src/utils/dify/types";
import { Button, Card, Form, message, Select, Space } from "antd";
import fetch from '@/src/fetch';


export default function() {
    let [llmDatasetOptions, setLlmDatasetOptions] = useState<any[]>([]);

    const [form] = Form.useForm();

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
        res?.data?.forEach((item: any) => {
            let key = item.cfg_name as keyof typeof formData;
            formData[key] = item.cfg_value_string;
        });

        form.setFieldsValue(formData);
    }

    function getDefaultToolConfig(): { [key: string]: string } {
        return {
            DIFY_GEO_DATASET_ID: '',
            DIFY_ROLE_DATASET_ID: '',
            DIFY_EVENTS_DATASET_ID: '',
            DIFY_FACTION_DATASET_ID: '',
            DIFY_ITEM_DATASET_ID: '',
            DIFY_SKILL_DATASET_ID: ''
        }
    }

    function onFormFill() {
        form.setFieldsValue({
            ...getDefaultToolConfig()
        });
    }


    useEffect(() => {
        loadLlmDatasetOptions();
        loadToolConfig();
    }, []);


    const formLayout = {
        labelCol: { span: 6 },
        wrapperCol: { span: 18 },
    };
    
    const tailLayout = {
        wrapperCol: { offset: 6, span: 18 },
    };

    async function handleSubmit() {
        try {
            const formValues = await form.validateFields();
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
        <div>
            <Card title="Dify配置项">
                <Form form={form} {...formLayout} style={{ maxWidth: 600 }}>
                    <Form.Item name={'DIFY_GEO_DATASET_ID'} label="地理知识库：">
                        <Select options={llmDatasetOptions}/>
                    </Form.Item>

                    <Form.Item name={'DIFY_ROLE_DATASET_ID'} label="角色知识库：">
                        <Select options={llmDatasetOptions}/>
                    </Form.Item>

                    <Form.Item name={'DIFY_EVENTS_DATASET_ID'} label="事件知识库：">
                        <Select options={llmDatasetOptions}/>
                    </Form.Item>

                    <Form.Item name={'DIFY_FACTION_DATASET_ID'} label="阵营知识库：">
                        <Select options={llmDatasetOptions}/>
                    </Form.Item>

                    <Form.Item name={'DIFY_ITEM_DATASET_ID'} label="物品知识库：">
                        <Select options={llmDatasetOptions}/>
                    </Form.Item>

                    <Form.Item name={'DIFY_SKILL_DATASET_ID'} label="技能知识库：">
                        <Select options={llmDatasetOptions}/>
                    </Form.Item>

                    <Form.Item {...tailLayout}>
                        <Space>
                            <Button type="primary" htmlType="submit" onClick={handleSubmit}>保存设置</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    )
}