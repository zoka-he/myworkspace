import React, { useState } from 'react';
import { message } from '@/src/utils/antdAppMessage';

import { Button, Form, Input, Select, Space, theme } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { IBrainstorm } from '@/src/types/IAiNoval';
import apiCalls from '../../apiCalls';

const { useToken } = theme;

interface ChapterOutlineGeneratorProps {
  currentBrainstorm: IBrainstorm | null;
  onGenerated: (outline: string) => void;
}

/**
 * 章节纲要生成组件
 * 从元数据、user_question、expanded_questions、analysis_result 推理生成 chapter_outline
 */
export default function ChapterOutlineGenerator({
  currentBrainstorm,
  onGenerated,
}: ChapterOutlineGeneratorProps) {
  const { token } = useToken();
  const [generating, setGenerating] = useState(false);
  const [modelProvider, setModelProvider] = useState<'deepseek-chat' | 'deepseek-chat-siliconflow'>('deepseek-chat');

  const handleGenerate = async () => {
    if (!currentBrainstorm?.id) {
      message.warning('请先保存脑洞');
      return;
    }

    try {
      setGenerating(true);
      message.loading({ content: '正在生成章节纲要...', key: 'generateOutline' });
      const outline = await apiCalls.generateChapterOutline(currentBrainstorm.id, modelProvider);
      message.success({ content: '章节纲要生成完成', key: 'generateOutline' });
      onGenerated(outline);
    } catch (error: any) {
      message.error({ content: error?.message || '生成章节纲要失败', key: 'generateOutline' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold' }}>章节纲要</span>
        <Space>
          <Select
            size="small"
            style={{ width: 300 }}
            value={modelProvider}
            onChange={(value) => setModelProvider(value)}
            disabled={generating}
          >
            <Select.Option value="deepseek-chat">DeepSeek Chat</Select.Option>
            <Select.Option value="deepseek-chat-siliconflow">DeepSeek Chat (SiliconFlow)</Select.Option>
          </Select>
          <Button
            type="default"
            size="small"
            icon={<FileTextOutlined />}
            loading={generating}
            disabled={generating || !currentBrainstorm?.id}
            onClick={handleGenerate}
          >
            {generating ? '生成中...' : '生成章节纲要'}
          </Button>
        </Space>
      </div>
      

      <Form.Item name="chapter_outline" noStyle>
        <Input.TextArea
          autoSize={{
            minRows: 10,
          }}
          placeholder="点击「生成章节纲要」将自动生成；也可直接在此编辑，保存脑洞时一并写入"
        />
      </Form.Item>
    </div>
  );
}
