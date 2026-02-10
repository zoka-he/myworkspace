import React from 'react';
import { Card, Tag, Button, Collapse, Space, theme } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { useCurrentBrainstorm, useBrainstormList } from '../BrainstormManageContext';
import { IBrainstorm, BrainstormType, BrainstormStatus, Priority } from '@/src/types/IAiNoval';
import AnalysisResultDisplay from './AnalysisResultDisplay';

const statusMap: Record<BrainstormStatus, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  feasible_unused: { text: '可行未使用', color: 'blue' },
  in_use: { text: '使用中', color: 'processing' },
  used: { text: '已使用', color: 'success' },
  suspended: { text: '暂时搁置', color: 'warning' },
};

const { Panel } = Collapse;
const { useToken } = theme;

const typeMap: Record<BrainstormType, { text: string; color: string }> = {
  inspiration: { text: '灵感', color: 'blue' },
  problem: { text: '问题', color: 'red' },
  idea: { text: '想法', color: 'green' },
  note: { text: '笔记', color: 'default' },
  to_verify: { text: '待验证', color: 'orange' },
};

interface BrainstormDetailPanelProps {
  onAnalyze: (id: number) => void;
}

export default function BrainstormDetailPanel({ onAnalyze }: BrainstormDetailPanelProps) {
  const { currentBrainstorm } = useCurrentBrainstorm();
  const [brainstormList] = useBrainstormList();
  const { token } = useToken();

  if (!currentBrainstorm) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '20px', color: token.colorTextSecondary }}>
          请选择一个脑洞查看详情
        </div>
      </Card>
    );
  }

  const typeInfo = typeMap[currentBrainstorm.brainstorm_type];

  return (
    <Card 
      title={
        <div>
          <Tag color={typeInfo.color}>{typeInfo.text}</Tag>
          {currentBrainstorm.title}
        </div>
      }
      size="small"
      style={{ marginTop: '12px' }}
    >
      {/* 基础信息 */}
      <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Space wrap style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: token.colorTextSecondary }}>状态：</span>
          {currentBrainstorm.status && (
            <Tag color={statusMap[currentBrainstorm.status]?.color || 'default'}>
              {statusMap[currentBrainstorm.status]?.text || currentBrainstorm.status}
            </Tag>
          )}
          <span style={{ fontSize: '12px', color: token.colorTextSecondary }}>优先级：</span>
          <Tag>{currentBrainstorm.priority}</Tag>
          <span style={{ fontSize: '12px', color: token.colorTextSecondary }}>内容分类：</span>
          <Tag>{currentBrainstorm.category}</Tag>
        </Space>
        {currentBrainstorm.tags && currentBrainstorm.tags.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <span style={{ fontSize: '12px', color: token.colorTextSecondary }}>标签：</span>
            <Space wrap size="small" style={{ marginLeft: '8px' }}>
              {currentBrainstorm.tags.map(tag => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
          </div>
        )}
      </div>
      
      {/* 内容 */}
      <div style={{ whiteSpace: 'pre-wrap', overflow: 'auto', marginBottom: '16px' }}>
        {currentBrainstorm.content}
      </div>

      {/* 用户原始问题 */}
      {currentBrainstorm.user_question && currentBrainstorm.user_question.trim() && (
        <div style={{ marginBottom: '16px', paddingTop: '12px', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={{ fontSize: '12px', color: token.colorTextSecondary, marginBottom: '4px', fontWeight: 'bold' }}>
            用户原始问题：
          </div>
          <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>{currentBrainstorm.user_question}</div>
        </div>
      )}

      {/* 扩展后的问题 */}
      {currentBrainstorm.expanded_questions && currentBrainstorm.expanded_questions.trim() && (
        <div style={{ marginBottom: '16px', paddingTop: '12px', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={{ fontSize: '12px', color: token.colorTextSecondary, marginBottom: '4px', fontWeight: 'bold' }}>
            扩展后的问题：
          </div>
          <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap', color: token.colorText }}>{currentBrainstorm.expanded_questions}</div>
        </div>
      )}

      {/* 剧情规划 */}
      {currentBrainstorm.plot_planning && currentBrainstorm.plot_planning.trim() && (
        <div style={{ marginBottom: '16px', paddingTop: '12px', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={{ fontSize: '12px', color: token.colorTextSecondary, marginBottom: '4px', fontWeight: 'bold' }}>
            剧情规划：
          </div>
          <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap', color: token.colorText }}>{currentBrainstorm.plot_planning}</div>
        </div>
      )}

      {/* 章节纲要 */}
      {currentBrainstorm.chapter_outline && currentBrainstorm.chapter_outline.trim() && (
        <div style={{ marginBottom: '16px', paddingTop: '12px', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={{ fontSize: '12px', color: token.colorTextSecondary, marginBottom: '4px', fontWeight: 'bold' }}>
            章节纲要：
          </div>
          <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap', color: token.colorText }}>{currentBrainstorm.chapter_outline}</div>
        </div>
      )}

      {/* 父脑洞 */}
      {(() => {
        const parentIds = currentBrainstorm.parent_ids || 
                         (currentBrainstorm.parent_id ? [currentBrainstorm.parent_id] : []);
        if (parentIds.length > 0) {
          const parentBrainstorms = brainstormList.filter(b => b.id && parentIds.includes(b.id));
          if (parentBrainstorms.length > 0) {
            return (
              <div style={{ marginBottom: '16px', paddingTop: '12px', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                <div style={{ fontSize: '12px', color: token.colorTextSecondary, marginBottom: '8px', fontWeight: 'bold' }}>
                  父脑洞{parentIds.length > 1 ? `（${parentIds.length}个）` : ''}：
                </div>
                <Space wrap size="small">
                  {parentBrainstorms.map(parent => (
                    <Tag 
                      key={parent.id} 
                      color="blue"
                      style={{ cursor: 'pointer' }}
                      title={parent.content?.substring(0, 100)}
                    >
                      {parent.title}
                    </Tag>
                  ))}
                </Space>
              </div>
            );
          }
        }
        return null;
      })()}

      {/* 分析按钮 - 仅展示 */}
      {/* {currentBrainstorm.analysis_status !== 'analyzing' && (
        <div style={{ marginBottom: '16px', paddingTop: '12px', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <Button
            type="primary"
            size="small"
            icon={<RobotOutlined />}
            disabled
            block
            title="请在编辑界面进行分析"
          >
            分析（请在编辑界面操作）
          </Button>
        </div>
      )} */}

      {/* 分析结果 - 使用统一的 AnalysisResultDisplay 组件，支持自然语言和结构化格式 */}
      {(() => {
        const result = currentBrainstorm.analysis_result;
        const hasResult =
          result &&
          (!!(result.analysis_text && result.analysis_text.trim()) ||
            !!result.impact_analysis ||
            !!(result.suggestions && result.suggestions.length) ||
            !!(result.opportunities && result.opportunities.length) ||
            !!(result.risks && result.risks.length) ||
            !!result.consistency_check);

        if (currentBrainstorm.analysis_status === 'analyzing') {
          return (
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${token.colorBorderSecondary}`, textAlign: 'center', color: token.colorTextSecondary }}>
              分析中...
            </div>
          );
        }

        if (hasResult) {
          return (
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
              <AnalysisResultDisplay analysisResult={result} />
            </div>
          );
        }

        return null;
      })()}
    </Card>
  );
}
