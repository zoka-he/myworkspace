import React from 'react';
import { List, Tag, Space, Button, Popconfirm, Card, theme } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { IBrainstorm, BrainstormType, BrainstormStatus, Priority } from '@/src/types/IAiNoval';
import { useBrainstormList, useCurrentBrainstorm } from '../BrainstormManageContext';

const { useToken } = theme;

const typeMap: Record<BrainstormType, { text: string; color: string }> = {
  inspiration: { text: '灵感', color: 'blue' },
  problem: { text: '问题', color: 'red' },
  idea: { text: '想法', color: 'green' },
  note: { text: '笔记', color: 'default' },
  to_verify: { text: '待验证', color: 'orange' },
};

const statusMap: Record<BrainstormStatus, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  feasible_unused: { text: '可行未使用', color: 'blue' },
  in_use: { text: '使用中', color: 'red' },
  used: { text: '已使用', color: 'purple' },
  suspended: { text: '暂时搁置', color: 'warning' },
};

const priorityMap: Record<Priority, { text: string; color: string }> = {
  low: { text: '低', color: 'default' },
  medium: { text: '中', color: 'blue' },
  high: { text: '高', color: 'orange' },
  urgent: { text: '紧急', color: 'red' },
};

/** 优先级排序权重：紧急 -> 高 -> 中 -> 低 */
const priorityOrder: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** 状态排序权重（第二级）：使用中 -> 可行未使用 -> 草稿 -> 暂时搁置 -> 已使用 */
const statusOrder: Record<BrainstormStatus, number> = {
  in_use: 0,
  feasible_unused: 1,
  draft: 2,
  suspended: 3,
  used: 4,
};

interface BrainstormListProps {
  onEdit: (brainstorm: IBrainstorm) => void;
  onDelete: (id: number) => void;
  onSelect: (id: number | null) => void;
}

export default function BrainstormList({ onEdit, onDelete, onSelect }: BrainstormListProps) {
  const [brainstormList] = useBrainstormList();
  const { currentBrainstormId } = useCurrentBrainstorm();
  const { token } = useToken();

  const sortedList = React.useMemo(() => {
    return [...brainstormList].sort((a, b) => {
      const pa = priorityOrder[(a.priority || 'medium') as Priority];
      const pb = priorityOrder[(b.priority || 'medium') as Priority];
      if (pa !== pb) return pa - pb;
      const sa = statusOrder[(a.status || 'draft') as BrainstormStatus];
      const sb = statusOrder[(b.status || 'draft') as BrainstormStatus];
      return sa - sb;
    });
  }, [brainstormList]);

  return (
    <List
      dataSource={sortedList}
      renderItem={(item) => {
        const typeInfo = typeMap[item.brainstorm_type];
        const statusInfo = statusMap[item.status || 'draft'];
        const priorityInfo = priorityMap[item.priority || 'medium'];
        const isSelected = currentBrainstormId === item.id;

        return (
          <List.Item
            style={{
              cursor: 'pointer',
              backgroundColor: isSelected ? token.colorPrimaryBg : undefined,
              borderLeft: isSelected ? `3px solid ${token.colorPrimary}` : '3px solid transparent',
              padding: '12px',
              transition: 'all 0.2s',
            }}
            onClick={() => onSelect(item.id || null)}
          >
            <Card
              size="small"
              style={{ width: '100%' }}
              title={
                <Space>
                  <Tag color={typeInfo.color}>{typeInfo.text}</Tag>
                  <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
                  <Tag color={priorityInfo.color}>{priorityInfo.text}</Tag>
                  {item.analysis_status === 'completed' && (
                    <Tag color="green">已分析</Tag>
                  )}
                </Space>
              }
              extra={
                <Space>
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(item);
                    }}
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    title="确定删除吗？"
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      item.id && onDelete(item.id);
                    }}
                  >
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    >
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              }
            >
              <div>
                <h4 style={{ marginBottom: 8 }}>{item.title}</h4>
                <p style={{ color: token.colorTextSecondary, fontSize: '12px', marginBottom: 8 }}>
                  {item.content.substring(0, 100)}...
                </p>
                {item.tags && item.tags.length > 0 && (
                  <Space size="small" style={{ marginBottom: 8 }}>
                    {item.tags.map(tag => (
                      <Tag key={tag} size="small">{tag}</Tag>
                    ))}
                  </Space>
                )}
                
                {/* 分析结果摘要 */}
                {item.analysis_status === 'completed' && item.analysis_result && (() => {
                  const result = item.analysis_result;
                  let summary: string | null = null;
                  
                  // 优先显示自然语言全文（新格式）
                  if (result.analysis_text && result.analysis_text.trim()) {
                    const text = result.analysis_text.trim();
                    // 提取第一个段落或第一个 ## 标题后的内容
                    const firstSection = text.split(/\n\n/)[0] || text.split(/\n##\s+/)[1] || text;
                    const preview = firstSection.replace(/^##\s+[^\n]+\n?/m, '').trim();
                    if (preview) {
                      summary = `💡 ${preview.substring(0, 80)}${preview.length > 80 ? '...' : ''}`;
                    }
                  }
                  
                  // 兼容旧格式：优先显示影响分析
                  if (!summary && result.impact_analysis?.description) {
                    summary = `💡 ${result.impact_analysis.description.substring(0, 80)}${result.impact_analysis.description.length > 80 ? '...' : ''}`;
                  }
                  // 其次显示冲突
                  if (!summary && result.consistency_check?.conflicts && result.consistency_check.conflicts.length > 0) {
                    const conflict = result.consistency_check.conflicts[0];
                    summary = `⚠️ ${conflict.description.substring(0, 80)}${conflict.description.length > 80 ? '...' : ''}`;
                  }
                  // 再次显示建议
                  if (!summary && result.suggestions && result.suggestions.length > 0) {
                    summary = `💬 ${result.suggestions[0].content.substring(0, 80)}${result.suggestions[0].content.length > 80 ? '...' : ''}`;
                  }
                  // 最后显示机会
                  if (!summary && result.opportunities && result.opportunities.length > 0) {
                    summary = `✨ ${result.opportunities[0].description.substring(0, 80)}${result.opportunities[0].description.length > 80 ? '...' : ''}`;
                  }
                  
                  // 如果有摘要才显示，避免重复显示"已分析"（title 中已有 Tag）
                  if (!summary) return null;
                  
                  return (
                    <div style={{ 
                      marginTop: '12px', 
                      marginBottom: '8px', 
                      borderTop: `1px solid ${token.colorBorderSecondary}`,
                      paddingTop: '8px'
                    }}>
                      <div style={{ fontSize: '12px', color: token.colorTextSecondary }}>
                        {summary}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </Card>
          </List.Item>
        );
      }}
    />
  );
}
