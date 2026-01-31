import { useEffect } from "react";
import { Button, Form, Input, message, Space } from "antd";
import fetch from '@/src/fetch';

// 配置字段定义：统一管理字段名、标签和组件类型
interface FieldConfig {
    name: string;
    label: string;
    component: 'input' | 'select';
    disabled?: boolean;
}

const TOOL_CONFIG_FIELDS: FieldConfig[] = [
    { name: 'OPENROUTER_API_KEY', label: 'Openrouter API Key：', component: 'input' },
    { name: 'DEEPSEEK_API_KEY', label: 'DeepSeek API Key：', component: 'input' },
    { name: 'SILLICONFLOW_API_KEY', label: '硅基流动 API Key：', component: 'input' },
    { name: 'DIFY_HOST', label: 'DIFY API入口：', component: 'input' },
    { name: 'DIFY_DATASET_BASE_URL', label: 'DIFY知识库API入口：', component: 'input' },
    // { name: 'DIFY_DATASET_API_KEY', label: 'DIFY知识库API Key：', component: 'input' },
    // { name: 'DIFY_PARAGRAPH_STRIPPER_API_KEY', label: '段落缩写工作流API Key：', component: 'input' },
    // { name: 'DIFY_PARAGRAPH_TITLE_API_KEY', label: '段落标题工作流API Key：', component: 'input' },
    // { name: 'DIFY_PARAGRAPH_ROLES_API_KEY', label: '提取角色工作流API Key：', component: 'input' },
    // { name: 'DIFY_PARAGRAPH_FACTIONS_API_KEY', label: '提取阵营工作流API Key：', component: 'input' },
    // { name: 'DIFY_PARAGRAPH_LOCATIONS_API_KEY', label: '提取地理工作流API Key：', component: 'input' },
    // { name: 'DIFY_PARAGRAPH_COMBINE_API_KEY', label: '融合文段工作流API Key：', component: 'input' },
];

export function CommonConfig() {
    const [formForCommon] = Form.useForm();

    useEffect(() => {
        loadToolConfig();
    }, []);

    // 从配置数组生成默认配置对象
    function getDefaultToolConfig(): { [key: string]: string } {
        const config: { [key: string]: string } = {};
        TOOL_CONFIG_FIELDS.forEach(field => {
            config[field.name] = '';
        });
        return config;
    }

    async function loadToolConfig() {
        try {
            const res = await fetch.get('/api/aiNoval/toolConfig/params');
            const formData = getDefaultToolConfig();
            
            // 从接口数据中填充表单值
            TOOL_CONFIG_FIELDS.forEach(field => {
                const configItem = res?.data?.find((item: any) => item.cfg_name === field.name);
                if (configItem?.cfg_value_string) {
                    formData[field.name] = configItem.cfg_value_string;
                }
            });

            formForCommon.setFieldsValue(formData);
        } catch (error: any) {
            console.error('Failed to load tool config:', error);
            message.error('加载配置失败');
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
            message.error(error.message || '保存配置失败');
        }
    }

    // 根据配置数组渲染表单字段
    function renderFormItem(field: FieldConfig) {
        const { name, label, component, disabled } = field;
        
        return (
            <Form.Item key={name} name={name} label={label}>
                {component === 'input' && <Input disabled={disabled} />}
            </Form.Item>
        );
    }

    return (
        <Form form={formForCommon} {...formLayout} style={{ maxWidth: 600 }}>
            {TOOL_CONFIG_FIELDS.map(renderFormItem)}
            
            <Form.Item {...tailLayout}>
                <Space>
                    <Button type="primary" htmlType="submit" onClick={handleSubmit}>保存设置</Button>
                </Space>
            </Form.Item>
        </Form>
    );
} 