import React from 'react';
import { Card, Tag, Button, Collapse, Space, theme } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { useCurrentBrainstorm } from '../BrainstormManageContext';
import { IBrainstorm, BrainstormType, BrainstormStatus, Priority } from '@/src/types/IAiNoval';

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
                <Tag key={tag} size="small">{tag}</Tag>
              ))}
            </Space>
          </div>
        )}
      </div>
      
      {/* 内容 */}
      <div style={{ whiteSpace: 'pre-wrap', overflow: 'auto', marginBottom: '16px' }}>
        {currentBrainstorm.content}
      </div>

      {/* 分析方向：正文下方 */}
      {currentBrainstorm.analysis_direction != null && currentBrainstorm.analysis_direction !== '' && (
        <div style={{ marginBottom: '16px', paddingTop: '12px', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <span style={{ fontSize: '12px', color: token.colorTextSecondary }}>分析方向：</span>
          <div style={{ marginTop: '4px', fontSize: '13px' }}>{currentBrainstorm.analysis_direction}</div>
        </div>
      )}

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

      {/* 分析结果 */}
      {currentBrainstorm.analysis_status === 'completed' && currentBrainstorm.analysis_result ? (
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          {(() => {
            const result = currentBrainstorm.analysis_result!;
            const activeKeys: string[] = [];
            if (result.impact_analysis) activeKeys.push('impact');
            if (result.consistency_check) activeKeys.push('consistency');
            if (result.suggestions && result.suggestions.length > 0) activeKeys.push('suggestions');
            if (result.opportunities && result.opportunities.length > 0) activeKeys.push('opportunities');
            
            return (
              <Collapse 
                defaultActiveKey={activeKeys}
                size="small"
              >
            {currentBrainstorm.analysis_result.impact_analysis && (
              <Panel header="影响分析" key="impact">
                <p style={{ margin: 0 }}>{currentBrainstorm.analysis_result.impact_analysis.description}</p>
              </Panel>
            )}
            {currentBrainstorm.analysis_result.consistency_check && (
              <Panel header="一致性检查" key="consistency">
                <p style={{ margin: '0 0 8px 0' }}>一致性评分: {currentBrainstorm.analysis_result.consistency_check.consistency_score}</p>
                {currentBrainstorm.analysis_result.consistency_check.conflicts?.map((conflict, idx) => (
                  <div key={idx} style={{ marginTop: 8 }}>
                    <Tag color="red">{conflict.severity}</Tag>
                    {conflict.description}
                  </div>
                ))}
              </Panel>
            )}
            {currentBrainstorm.analysis_result.suggestions && currentBrainstorm.analysis_result.suggestions.length > 0 && (
              <Panel header="建议" key="suggestions">
                {currentBrainstorm.analysis_result.suggestions.map((suggestion, idx) => (
                  <div key={idx} style={{ marginTop: idx === 0 ? 0 : 8 }}>
                    <Tag color="blue">{suggestion.priority}</Tag>
                    {suggestion.content}
                  </div>
                ))}
              </Panel>
            )}
            {currentBrainstorm.analysis_result.opportunities && currentBrainstorm.analysis_result.opportunities.length > 0 && (
              <Panel header="机会" key="opportunities">
                {currentBrainstorm.analysis_result.opportunities.map((opp, idx) => (
                  <div key={idx} style={{ marginTop: idx === 0 ? 0 : 8 }}>
                    <Tag color="green">{opp.potential}</Tag>
                    {opp.description}
                  </div>
                ))}
              </Panel>
            )}
              </Collapse>
            );
          })()}
        </div>
      ) : currentBrainstorm.analysis_status === 'analyzing' ? (
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${token.colorBorderSecondary}`, textAlign: 'center', color: token.colorTextSecondary }}>
          分析中...
        </div>
      ) : null}
    </Card>
  );
}
