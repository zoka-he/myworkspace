import React, { useState } from 'react';
import { Button, theme, message } from 'antd';
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

  const handleGenerate = async () => {
    if (!currentBrainstorm?.id) {
      message.warning('请先保存脑洞');
      return;
    }

    try {
      setGenerating(true);
      message.loading({ content: '正在生成章节纲要...', key: 'generateOutline' });
      const outline = await apiCalls.generateChapterOutline(currentBrainstorm.id);
      message.success({ content: '章节纲要生成完成', key: 'generateOutline' });
      onGenerated(outline);
    } catch (error: any) {
      message.error({ content: error?.message || '生成章节纲要失败', key: 'generateOutline' });
    } finally {
      setGenerating(false);
    }
  };

  const hasOutline = currentBrainstorm?.chapter_outline && currentBrainstorm.chapter_outline.trim();

  return (
    <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold' }}>章节纲要</span>
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
      </div>
      
      {hasOutline ? (
        <div style={{ 
          padding: '12px', 
          backgroundColor: token.colorFillAlter, 
          borderRadius: '4px',
          whiteSpace: 'pre-wrap',
          fontSize: '13px',
          lineHeight: '1.6',
        }}>
          {currentBrainstorm.chapter_outline}
        </div>
      ) : (
        <div style={{ 
          padding: '12px', 
          minHeight: '20em',
          color: token.colorTextSecondary,
          fontSize: '12px',
          fontStyle: 'italic',
        }}>
          点击「生成章节纲要」按钮，将基于脑洞的元数据、用户问题、扩展问题和分析结果自动生成章节纲要
        </div>
      )}
    </div>
  );
}
