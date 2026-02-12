import React from 'react';
import { Switch, Space, Tabs, theme } from 'antd';
import { IBrainstorm, IRoleSeed, IRoleDraft } from '@/src/types/IAiNoval';
import BrainstormAnalysisSection from './BrainstormAnalysisSection';
import ChapterOutlineGenerator from './ChapterOutlineGenerator';
import RoleIdeationPanel from './RoleIdeationPanel';
import { AnalysisType, analysisTypeOptions } from '../constants';

const { useToken } = theme;

interface BrainstormAnalysisPanelProps {
  currentBrainstorm: IBrainstorm | null;
  parentBrainstorm: IBrainstorm | null;
  parentLoading: boolean;
  analyzing: boolean;
  showParentPreview: boolean;
  formParentIds?: number[];
  currentParentIds?: number[];
  analysisType: AnalysisType;
  onAnalysisTypeChange: (type: AnalysisType) => void;
  onAnalyze: () => void;
  onToggleParentPreview: (checked: boolean) => void;
  onChapterOutlineGenerated: (outline: string) => void;
  onRoleSeedsChange?: (seeds: IRoleSeed[]) => void;
  onRoleDraftsChange?: (drafts: IRoleDraft[]) => void;
}

/**
 * 分析面板组件
 * 包含：分析类型选择、分析按钮、分析结果展示
 */
export default function BrainstormAnalysisPanel({
  currentBrainstorm,
  parentBrainstorm,
  parentLoading,
  analyzing,
  showParentPreview,
  formParentIds,
  currentParentIds,
  analysisType,
  onAnalysisTypeChange,
  onAnalyze,
  onToggleParentPreview,
  onChapterOutlineGenerated,
  onRoleSeedsChange,
  onRoleDraftsChange,
}: BrainstormAnalysisPanelProps) {
  const { token } = useToken();

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h4 style={{ margin: 0 }}>分析</h4>
        <Space>
          <span style={{ fontSize: '12px', color: token.colorTextSecondary }}>当前脑洞</span>
          <Switch
            checked={showParentPreview}
            onChange={onToggleParentPreview}
            checkedChildren="父脑洞"
            unCheckedChildren="当前"
            disabled={!currentBrainstorm || (
              (!currentBrainstorm.parent_ids || currentBrainstorm.parent_ids.length === 0) && 
              !currentBrainstorm.parent_id && 
              (!formParentIds || formParentIds.length === 0)
            )}
          />
          <span style={{ fontSize: '12px', color: token.colorTextSecondary }}>父脑洞</span>
        </Space>
      </div>
      
      {/* 使用 Tabs 切换不同的分析类型 */}
      <Tabs
        activeKey={analysisType}
        onChange={(key) => onAnalysisTypeChange(key as AnalysisType)}
        items={analysisTypeOptions.map(opt => ({
          key: opt.value,
          label: opt.label,
          children: (
            <div style={{ marginTop: '16px' }}>
              {opt.value === 'feasibility_and_expansion' && (
                <BrainstormAnalysisSection
                  currentBrainstorm={currentBrainstorm}
                  parentBrainstorm={parentBrainstorm}
                  parentLoading={parentLoading}
                  analyzing={analyzing}
                  showParentPreview={showParentPreview}
                  formParentIds={formParentIds}
                  currentParentIds={currentParentIds || []}
                  onAnalyze={onAnalyze}
                  onToggleParentPreview={onToggleParentPreview}
                />
              )}
              {opt.value === 'chapter_outline' && (
                <ChapterOutlineGenerator
                  currentBrainstorm={currentBrainstorm}
                  onGenerated={onChapterOutlineGenerated}
                />
              )}
              {opt.value === 'role_ideation' && (
                <RoleIdeationPanel
                  currentBrainstorm={currentBrainstorm}
                  onSeedsChange={(seeds) => onRoleSeedsChange?.(seeds)}
                  onDraftsChange={(drafts) => onRoleDraftsChange?.(drafts)}
                />
              )}
              {opt.value === 'other' && (
                <div style={{ textAlign: 'center', padding: '40px', color: token.colorTextSecondary }}>
                  该分析类型暂未实现
                </div>
              )}
            </div>
          ),
        }))}
      />
    </div>
  );
}
