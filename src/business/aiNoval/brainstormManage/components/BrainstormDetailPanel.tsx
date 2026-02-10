import React, { useState, useEffect, useRef } from 'react';
import { Card, Tag, Button, Collapse, Space, theme, Radio } from 'antd';
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

// 脑洞与可行性分析版面
interface AnalysisPanelProps {
  brainstorm: IBrainstorm;
  brainstormList: IBrainstorm[];
  token: ReturnType<typeof theme.useToken>['token'];
}

function AnalysisPanel({ brainstorm, brainstormList, token }: AnalysisPanelProps) {
  return (
    <>
      {/* 基础信息 */}
      <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Space wrap style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: token.colorTextSecondary }}>状态：</span>
          {brainstorm.status && (
            <Tag color={statusMap[brainstorm.status]?.color || 'default'}>
              {statusMap[brainstorm.status]?.text || brainstorm.status}
            </Tag>
          )}
          <span style={{ fontSize: '12px', color: token.colorTextSecondary }}>优先级：</span>
          <Tag>{brainstorm.priority}</Tag>
          <span style={{ fontSize: '12px', color: token.colorTextSecondary }}>内容分类：</span>
          <Tag>{brainstorm.category}</Tag>
        </Space>
        {brainstorm.tags && brainstorm.tags.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <span style={{ fontSize: '12px', color: token.colorTextSecondary }}>标签：</span>
            <Space wrap size="small" style={{ marginLeft: '8px' }}>
              {brainstorm.tags.map(tag => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
          </div>
        )}
      </div>
      
      {/* 内容 */}
      <div style={{ whiteSpace: 'pre-wrap', overflow: 'auto', marginBottom: '16px' }}>
        {brainstorm.content}
      </div>

      {/* 用户原始问题 */}
      {brainstorm.user_question && brainstorm.user_question.trim() && (
        <div style={{ marginBottom: '16px', paddingTop: '12px', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={{ fontSize: '12px', color: token.colorTextSecondary, marginBottom: '4px', fontWeight: 'bold' }}>
            用户原始问题：
          </div>
          <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>{brainstorm.user_question}</div>
        </div>
      )}

      {/* 扩展后的问题 */}
      {brainstorm.expanded_questions && brainstorm.expanded_questions.trim() && (
        <div style={{ marginBottom: '16px', paddingTop: '12px', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={{ fontSize: '12px', color: token.colorTextSecondary, marginBottom: '4px', fontWeight: 'bold' }}>
            扩展后的问题：
          </div>
          <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap', color: token.colorText }}>{brainstorm.expanded_questions}</div>
        </div>
      )}

      {/* 父脑洞 */}
      {(() => {
        const parentIds = brainstorm.parent_ids || 
                         (brainstorm.parent_id ? [brainstorm.parent_id] : []);
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

      {/* 分析结果 - 使用统一的 AnalysisResultDisplay 组件，支持自然语言和结构化格式 */}
      {(() => {
        const result = brainstorm.analysis_result;
        const hasResult =
          result &&
          (!!(result.analysis_text && result.analysis_text.trim()) ||
            !!result.impact_analysis ||
            !!(result.suggestions && result.suggestions.length) ||
            !!(result.opportunities && result.opportunities.length) ||
            !!(result.risks && result.risks.length) ||
            !!result.consistency_check);

        if (brainstorm.analysis_status === 'analyzing') {
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
    </>
  );
}

// 剧情规划与章节纲要版面
interface PlotPlanningPanelProps {
  brainstorm: IBrainstorm;
  token: ReturnType<typeof theme.useToken>['token'];
  showChapterOutline?: boolean;
}

function PlotPlanningPanel({ brainstorm, token, showChapterOutline = false }: PlotPlanningPanelProps) {
  const hasChapterOutline = brainstorm.chapter_outline && brainstorm.chapter_outline.trim();
  const hasPlotPlanning = brainstorm.plot_planning && brainstorm.plot_planning.trim();

  // 如果指定显示章节纲要且有章节纲要，优先显示章节纲要
  if (showChapterOutline && hasChapterOutline) {
    return (
      <>
        {/* 剧情规划 */}
        {hasPlotPlanning && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: token.colorTextSecondary, marginBottom: '4px', fontWeight: 'bold' }}>
              剧情规划：
            </div>
            <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap', color: token.colorText }}>{brainstorm.plot_planning}</div>
          </div>
        )}

        {/* 章节纲要 */}
        <div style={{ marginBottom: '16px', paddingTop: '12px', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={{ fontSize: '12px', color: token.colorTextSecondary, marginBottom: '4px', fontWeight: 'bold' }}>
            章节纲要：
          </div>
          <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap', color: token.colorText }}>{brainstorm.chapter_outline}</div>
        </div>
        
        
      </>
    );
  }

  // 否则显示剧情规划
  return (
    <>
      {/* 剧情规划 */}
      {hasPlotPlanning ? (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: token.colorTextSecondary, marginBottom: '4px', fontWeight: 'bold' }}>
            剧情规划：
          </div>
          <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap', color: token.colorText }}>{brainstorm.plot_planning}</div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px', color: token.colorTextSecondary }}>
          暂无剧情规划
        </div>
      )}
      
      {/* 章节纲要 */}
      {hasChapterOutline && (
        <div style={{ marginBottom: '16px', paddingTop: '12px', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={{ fontSize: '12px', color: token.colorTextSecondary, marginBottom: '4px', fontWeight: 'bold' }}>
            章节纲要：
          </div>
          <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap', color: token.colorText }}>{brainstorm.chapter_outline}</div>
        </div>
      )}
    </>
  );
}

export default function BrainstormDetailPanel({ onAnalyze }: BrainstormDetailPanelProps) {
  const { currentBrainstorm } = useCurrentBrainstorm();
  const [brainstormList] = useBrainstormList();
  const { token } = useToken();
  const [radioValue, setRadioValue] = useState<string>('1');
  const prevBrainstormIdRef = useRef<number | undefined>(undefined);
  const prevHasChapterOutlineRef = useRef<boolean>(false);
  const isManualSwitchRef = useRef<boolean>(false);

  // 自动切换逻辑：
  // 1. 当currentBrainstorm变化时，根据是否有章节纲要自动切换版面
  // 2. 当章节纲要出现或消失时，自动切换版面
  useEffect(() => {
    if (!currentBrainstorm) {
      prevBrainstormIdRef.current = undefined;
      prevHasChapterOutlineRef.current = false;
      return;
    }
    
    const hasChapterOutline = !!(currentBrainstorm.chapter_outline && currentBrainstorm.chapter_outline.trim());
    const currentBrainstormId = currentBrainstorm.id;
    const brainstormChanged = prevBrainstormIdRef.current !== currentBrainstormId;
    const chapterOutlineChanged = prevHasChapterOutlineRef.current !== hasChapterOutline;
    
    // 如果脑洞变化了，总是自动切换（切换脑洞时应该重置状态）
    if (brainstormChanged) {
      if (hasChapterOutline) {
        // 有章节纲要，自动切换到"剧情规划与章节纲要"
        setRadioValue('2');
      } else {
        // 没有章节纲要，自动切换到"脑洞与可行性分析"
        setRadioValue('1');
      }
      isManualSwitchRef.current = false; // 切换脑洞时重置手动切换标志
    } 
    // 如果只是章节纲要状态变化了，且不是用户手动切换，则自动切换
    else if (chapterOutlineChanged && !isManualSwitchRef.current) {
      if (hasChapterOutline) {
        // 有章节纲要，自动切换到"剧情规划与章节纲要"
        setRadioValue('2');
      } else {
        // 没有章节纲要，自动切换到"脑洞与可行性分析"
        setRadioValue('1');
      }
    }
    
    // 更新ref
    prevBrainstormIdRef.current = currentBrainstormId;
    prevHasChapterOutlineRef.current = hasChapterOutline;
    
    // 重置手动切换标志（延迟重置，避免立即被覆盖）
    if (isManualSwitchRef.current && !brainstormChanged) {
      const timer = setTimeout(() => {
        isManualSwitchRef.current = false;
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [currentBrainstorm]);

  // 处理用户手动切换到"剧情规划与章节纲要"时，如果没有章节纲要，自动切换回去
  useEffect(() => {
    if (!currentBrainstorm) return;
    
    const hasChapterOutline = !!(currentBrainstorm.chapter_outline && currentBrainstorm.chapter_outline.trim());
    
    // 如果用户手动切换到"剧情规划与章节纲要"，但没有章节纲要，自动切换回去
    if (radioValue === '2' && !hasChapterOutline && isManualSwitchRef.current) {
      // 延迟一下，让用户能看到切换效果
      const timer = setTimeout(() => {
        setRadioValue('1');
        isManualSwitchRef.current = false;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [radioValue, currentBrainstorm]);

  // 处理用户手动切换Radio
  const handleRadioChange = (e: any) => {
    isManualSwitchRef.current = true;
    setRadioValue(e.target.value);
  };

  if (!currentBrainstorm) {
    return (
      <Card style={{ margin: '10px 0 0' }}>
        <div style={{ textAlign: 'center', padding: '20px 20px 0', color: token.colorTextSecondary, height: '80vh' }}>
          请选择一个脑洞查看详情
        </div>
      </Card>
    );
  }

  const typeInfo = typeMap[currentBrainstorm.brainstorm_type];
  const hasChapterOutline = !!(currentBrainstorm.chapter_outline && currentBrainstorm.chapter_outline.trim());
  const showChapterOutline = radioValue === '2' && hasChapterOutline;

  return (
    <Card 
      title={
        <div className="flex justify-between items-center">
          <div>
            <Tag color={typeInfo.color}>{typeInfo.text}</Tag>
            {currentBrainstorm.title}
          </div>
          <Space>
            <Radio.Group value={radioValue} onChange={handleRadioChange}>
              <Radio value="1">脑洞与可行性分析</Radio>
              <Radio value="2">剧情规划与章节纲要</Radio>
            </Radio.Group>
          </Space>
        </div>
      }
      size="small"
      style={{ marginTop: '12px' }}
    >
      {radioValue === '1' ? (
        <AnalysisPanel brainstorm={currentBrainstorm} brainstormList={brainstormList} token={token} />
      ) : (
        <PlotPlanningPanel brainstorm={currentBrainstorm} token={token} showChapterOutline={showChapterOutline} />
      )}
    </Card>
  );
}
