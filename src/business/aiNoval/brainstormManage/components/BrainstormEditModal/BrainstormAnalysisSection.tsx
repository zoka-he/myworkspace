import React from 'react';
import { Button, theme } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { IBrainstorm } from '@/src/types/IAiNoval';
import AnalysisResultDisplay from '../AnalysisResultDisplay';
import ParentBrainstormPreview from '../ParentBrainstormPreview';

const { useToken } = theme;

interface BrainstormAnalysisSectionProps {
  currentBrainstorm: IBrainstorm | null;
  parentBrainstorm: IBrainstorm | null;
  parentLoading: boolean;
  analyzing: boolean;
  showParentPreview: boolean;
  formParentIds?: number[];
  currentParentIds?: number[];
  onAnalyze: () => void;
  onToggleParentPreview: (checked: boolean) => void;
}

export default function BrainstormAnalysisSection({
  currentBrainstorm,
  parentBrainstorm,
  parentLoading,
  analyzing,
  showParentPreview,
  formParentIds,
  currentParentIds,
  onAnalyze,
  onToggleParentPreview,
}: BrainstormAnalysisSectionProps) {
  const { token } = useToken();

  // 如果没有当前脑洞
  if (!currentBrainstorm) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: token.colorTextSecondary }}>
        保存后即可进行分析
      </div>
    );
  }

  // 如果切换到父脑洞预览
  if (showParentPreview) {
    const hasParent = !!(currentParentIds && currentParentIds.length > 0) || 
                      !!(formParentIds && formParentIds.length > 0) ||
                      !!currentBrainstorm.parent_id;
    return (
      <ParentBrainstormPreview
        parentBrainstorm={parentBrainstorm}
        loading={parentLoading}
        hasParent={hasParent}
        parentCount={currentParentIds?.length || formParentIds?.length || (currentBrainstorm.parent_id ? 1 : 0)}
      />
    );
  }

  // 有分析结果：自然语言全文（analysis_text）或旧版结构化字段
  const result = currentBrainstorm.analysis_result;
  const hasResult =
    !!result &&
    (!!(result.analysis_text && result.analysis_text.trim()) ||
      !!result.impact_analysis ||
      !!(result.suggestions && result.suggestions.length) ||
      !!(result.opportunities && result.opportunities.length) ||
      !!(result.risks && result.risks.length) ||
      !!result.consistency_check);

  // 显示当前脑洞分析
  return (
    <div>
      {/* 分析按钮 - 始终显示，状态由本地 analyzing 控制；分析结果为自然语言输出 */}
      <div style={{ marginBottom: '16px' }}>
        <Button
          type="primary"
          icon={<RobotOutlined />}
          onClick={onAnalyze}
          loading={analyzing}
          disabled={analyzing}
          block
        >
          {analyzing ? '分析中...' : '分析'}
        </Button>
      </div>

      {/* 分析结果 - 优先 analysis_text（自然语言），兼容旧结构化结果 */}
      {hasResult && <AnalysisResultDisplay analysisResult={result!} />}
    </div>
  );
}
