import React from 'react';
import { Tag, Space, theme } from 'antd';
import { IBrainstorm } from '@/src/types/IAiNoval';
import { statusMap } from './constants';
import AnalysisResultDisplay from './AnalysisResultDisplay';

const { useToken } = theme;

interface ParentBrainstormPreviewProps {
  parentBrainstorm: IBrainstorm | null;
  loading: boolean;
  hasParent: boolean;
  parentCount?: number;
}

export default function ParentBrainstormPreview({ 
  parentBrainstorm, 
  loading, 
  hasParent 
}: ParentBrainstormPreviewProps) {
  const { token } = useToken();

  if (!hasParent) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: token.colorTextSecondary }}>
        当前脑洞没有父脑洞
      </div>
    );
  }

  if (loading || !parentBrainstorm) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: token.colorTextSecondary }}>
        加载中...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
          父脑洞{parentCount && parentCount > 1 ? `（${parentCount}个，当前显示第1个）` : ''}：{parentBrainstorm.title}
        </div>
        <div style={{ fontSize: '12px', color: token.colorTextSecondary, marginBottom: '8px' }}>
          {parentBrainstorm.content?.substring(0, 100)}...
        </div>
        <Space size="small">
          {parentBrainstorm.status && (
            <Tag color={statusMap[parentBrainstorm.status]?.color || 'default'}>
              {statusMap[parentBrainstorm.status]?.text || parentBrainstorm.status}
            </Tag>
          )}
          {parentBrainstorm.priority && (
            <Tag>{parentBrainstorm.priority}</Tag>
          )}
        </Space>
      </div>

      {/* 父脑洞分析结果 */}
      {parentBrainstorm.analysis_status === 'completed' && parentBrainstorm.analysis_result ? (
        <AnalysisResultDisplay analysisResult={parentBrainstorm.analysis_result} />
      ) : (
        <div style={{ textAlign: 'center', padding: '20px', color: token.colorTextSecondary }}>
          父脑洞暂无分析结果
        </div>
      )}
    </div>
  );
}
