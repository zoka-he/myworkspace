import React from 'react';
import { Form, Input, Button, Space } from 'antd';

const { TextArea } = Input;

interface AnalysisDirectionInputProps {
  loading: boolean;
  disabled: boolean;
  onExpand: () => void;
}

export default function AnalysisDirectionInput({ 
  loading, 
  disabled, 
  onExpand 
}: AnalysisDirectionInputProps) {
  return (
    <>
      <div style={{ marginBottom: '16px' }}>
        <div className='f-flex-two-side' style={{ width: '100%', marginBottom: '10px' }}>
          <span style={{ fontWeight: 'bold' }}>用户原始问题</span>
        </div>
        <Form.Item
          name="user_question"
          label={false}
        >
          <TextArea
            autoSize={{ minRows: 2 }}
            placeholder="请输入您希望分析的问题或关注点（可选）"
            allowClear
          />
        </Form.Item>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div className='f-flex-two-side' style={{ width: '100%', marginBottom: '10px' }}>
          <span style={{ fontWeight: 'bold' }}>扩展后的问题</span>
          <Space size="middle">
            <Button
              type="default"
              size="small"
              loading={loading}
              disabled={disabled}
              onClick={onExpand}
            >
              生成扩展问题
            </Button>
          </Space>
        </div>
        <Form.Item
          name="expanded_questions"
          label={false}
        >
          <TextArea
            autoSize={{ minRows: 4 }}
            placeholder="通过 ReAct+MCP 自动生成的扩展问题与限制性假设（点击「生成扩展问题」自动填充）"
            allowClear
          />
        </Form.Item>
      </div>
    </>
  );
}
