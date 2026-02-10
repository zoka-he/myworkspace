import React from 'react';
import { Form, Input, Button, theme, Space } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { IBrainstorm } from '@/src/types/IAiNoval';
import BrainstormFormFields from './BrainstormFormFields';

const { useToken } = theme;

interface BrainstormFormSectionProps {
  brainstorm: IBrainstorm | null;
  brainstormList: IBrainstorm[];
  worldviewId: number | null;
  expandingDirection: boolean;
  onExpandQuestions: () => void;
  onSave: () => void;
  saving?: boolean;
}

/**
 * 人工填写部分组件
 * 包含：元数据、内容、原始问题、扩展问题、剧情规划、章节纲要
 */
export default function BrainstormFormSection({
  brainstorm,
  brainstormList,
  worldviewId,
  expandingDirection,
  onExpandQuestions,
  onSave,
  saving = false,
}: BrainstormFormSectionProps) {
  const { token } = useToken();

  return (
    <>
      {/* 1. 元数据（全部往上提） */}
      <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <BrainstormFormFields brainstorm={brainstorm} brainstormList={brainstormList} />
      </div>

      {/* 2. 内容 */}
      <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
          <Input.TextArea 
            autoSize={{ minRows: 8 }} 
            placeholder="请输入内容（支持Markdown）" 
          />
        </Form.Item>
      </div>

      {/* 3. 原始问题 */}
      <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>用户原始问题</div>
        <Form.Item name="user_question" label={false}>
          <Input.TextArea
            autoSize={{ minRows: 2 }}
            placeholder="请输入您希望分析的问题或关注点（可选）"
            allowClear
          />
        </Form.Item>
      </div>

      {/* 4. 扩展后的问题 */}
      <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>扩展后的问题</span>
          <Button
            type="default"
            size="small"
            loading={expandingDirection}
            disabled={!worldviewId}
            onClick={onExpandQuestions}
          >
            生成扩展问题
          </Button>
        </div>
        <Form.Item name="expanded_questions" label={false}>
          <Input.TextArea
            autoSize={{ minRows: 4}}
            placeholder="通过 ReAct+MCP 自动生成的扩展问题与限制性假设（点击「生成扩展问题」自动填充）"
            allowClear
          />
        </Form.Item>
      </div>

      {/* 5. 剧情规划 */}
      <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>剧情规划</div>
        <Form.Item name="plot_planning" label={false}>
          <Input.TextArea
            autoSize={{ minRows: 4}}
            placeholder="请输入您对该脑洞的剧情规划或期望的发展方向（可选，将纳入分析内容）"
            allowClear
          />
        </Form.Item>
      </div>

      {/* 保存按钮 */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={onSave}
          loading={saving}
        >
          {saving ? '保存中...' : '保存表单'}
        </Button>
      </div>
    </>
  );
}
