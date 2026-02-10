import React from 'react';
import { Collapse, Tag } from 'antd';
import { IBrainstormAnalysisResult } from '@/src/types/IAiNoval';

const { Panel } = Collapse;

/** 按 ## 标题拆分自然语言分析为段落，用于折叠展示 */
function parseAnalysisSections(text: string): { title: string; content: string }[] {
  const raw = text.trim();
  if (!raw) return [];
  const parts = raw.split(/\n##\s+/);
  const sections: { title: string; content: string }[] = [];
  for (let i = 0; i < parts.length; i++) {
    const block = parts[i].replace(/^##\s*/, '').trim();
    if (!block) continue;
    const firstLineEnd = block.indexOf('\n');
    const title = firstLineEnd >= 0 ? block.slice(0, firstLineEnd).trim() : block;
    const content = firstLineEnd >= 0 ? block.slice(firstLineEnd + 1).trim() : '';
    sections.push({ title: title || '分析', content });
  }
  if (sections.length === 0) sections.push({ title: '分析结果', content: raw });
  return sections;
}

interface AnalysisResultDisplayProps {
  analysisResult: IBrainstormAnalysisResult;
}

export default function AnalysisResultDisplay({ analysisResult }: AnalysisResultDisplayProps) {
  const result = analysisResult;

  // 优先展示自然语言全文（不做解析）
  if (result.analysis_text && result.analysis_text.trim()) {
    const sections = parseAnalysisSections(result.analysis_text);
    return (
      <Collapse defaultActiveKey={sections.map((_, i) => String(i))} size="small">
        {sections.map((s, idx) => (
          <Panel header={s.title} key={String(idx)}>
            <div style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{s.content}</div>
          </Panel>
        ))}
      </Collapse>
    );
  }

  // 兼容旧的结构化结果
  const activeKeys: string[] = [];
  if (result.impact_analysis) activeKeys.push('impact');
  if (result.consistency_check) activeKeys.push('consistency');
  if (result.suggestions && result.suggestions.length > 0) activeKeys.push('suggestions');
  if (result.opportunities && result.opportunities.length > 0) activeKeys.push('opportunities');

  return (
    <Collapse defaultActiveKey={activeKeys} size="small">
      {result.impact_analysis && (
        <Panel header="影响分析" key="impact">
          <p style={{ margin: 0 }}>{result.impact_analysis.description}</p>
        </Panel>
      )}
      {result.consistency_check && (
        <Panel header="一致性检查" key="consistency">
          <p style={{ margin: '0 0 8px 0' }}>一致性评分: {result.consistency_check.consistency_score}</p>
          {result.consistency_check.conflicts?.map((conflict, idx) => (
            <div key={idx} style={{ marginTop: 8 }}>
              <Tag color="red">{conflict.severity}</Tag>
              {conflict.description}
            </div>
          ))}
        </Panel>
      )}
      {result.suggestions && result.suggestions.length > 0 && (
        <Panel header="建议" key="suggestions">
          {result.suggestions.map((suggestion, idx) => (
            <div key={idx} style={{ marginTop: idx === 0 ? 0 : 8 }}>
              <Tag color="blue">{suggestion.priority}</Tag>
              {suggestion.content}
            </div>
          ))}
        </Panel>
      )}
      {result.opportunities && result.opportunities.length > 0 && (
        <Panel header="机会" key="opportunities">
          {result.opportunities.map((opp, idx) => (
            <div key={idx} style={{ marginTop: idx === 0 ? 0 : 8 }}>
              <Tag color="green">{opp.potential}</Tag>
              {opp.description}
            </div>
          ))}
        </Panel>
      )}
    </Collapse>
  );
}
