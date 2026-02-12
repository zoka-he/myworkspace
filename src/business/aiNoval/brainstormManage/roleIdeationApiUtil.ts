/** 从 ReAct LLM 输出中提取 Final Answer 正文（去掉 "Final Answer:" 及前缀） */
export function extractFinalAnswerText(raw: string): string {
  const markers = ['Final Answer:', 'Final answer:', 'final answer:'];
  let text = (raw ?? '').trim();
  for (const m of markers) {
    const idx = text.indexOf(m);
    if (idx !== -1) {
      text = text.slice(idx + m.length).trim();
      break;
    }
  }
  return text;
}

/** 解析脑洞 JSON 字段，供角色构思 API 使用 */
export function parseJsonField(field: any): any {
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return field;
    }
  }
  return field;
}

export function parseBrainstorm(brainstorm: any) {
  if (!brainstorm) return null;
  const parsed = { ...brainstorm };
  parsed.tags = parseJsonField(parsed.tags);
  parsed.analysis_result = parseJsonField(parsed.analysis_result);
  parsed.related_faction_ids = parseJsonField(parsed.related_faction_ids);
  parsed.related_role_ids = parseJsonField(parsed.related_role_ids);
  parsed.related_geo_codes = parseJsonField(parsed.related_geo_codes);
  parsed.related_event_ids = parseJsonField(parsed.related_event_ids);
  parsed.related_chapter_ids = parseJsonField(parsed.related_chapter_ids);
  parsed.related_world_state_ids = parseJsonField(parsed.related_world_state_ids);
  parsed.parent_ids = parseJsonField(parsed.parent_ids);
  parsed.role_seeds = parseJsonField(parsed.role_seeds);
  parsed.role_drafts = parseJsonField(parsed.role_drafts);
  return parsed;
}

/** 构建脑洞上下文摘要，用于 prompt */
export function buildBrainstormContextSummary(parsed: any): string {
  const parts: string[] = [];
  parts.push(`标题：${parsed.title || '（无）'}`);
  parts.push(`内容：${(parsed.content || '').trim().slice(0, 1500) || '（无）'}`);
  if (parsed.user_question?.trim()) parts.push(`用户问题：${parsed.user_question.trim()}`);
  if (parsed.expanded_questions?.trim()) parts.push(`扩展问题：${parsed.expanded_questions.trim().slice(0, 800)}`);
  if (parsed.plot_planning?.trim()) parts.push(`剧情规划：${parsed.plot_planning.trim().slice(0, 800)}`);
  if (parsed.chapter_outline?.trim()) parts.push(`章节纲要：${parsed.chapter_outline.trim().slice(0, 800)}`);
  const analysisText = parsed.analysis_result?.analysis_text?.trim();
  if (analysisText) parts.push(`分析结果：${analysisText.slice(0, 1000)}`);
  return parts.join('\n\n');
}

/** 去掉第一个种子块中 LLM 可能输出的解释/思维前缀，只保留种子正文 */
export function stripSeedBlockPreamble(block: string): string {
  const lines = block.split(/\n/);
  const purePreamblePattern = /^(好的[,，]?|根据.*?[,，]?|下面.*?[,，]?|【?角色种子\s*\d+】?\s*|^首先[,，]?|^我将|^以下|^如下)\s*$/;
  const leadingNumPrefix = /^\d+[\.．、]\s*/;
  let start = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (purePreamblePattern.test(line)) continue;
    if (line.length >= 6) {
      start = i;
      break;
    }
  }
  const rest = lines.slice(start);
  const firstLine = rest[0]?.trim() ?? '';
  const firstLineBody = leadingNumPrefix.test(firstLine) ? firstLine.replace(leadingNumPrefix, '') : firstLine;
  const trimmed = (firstLineBody + (rest.length > 1 ? '\n' + rest.slice(1).join('\n') : '')).trim();
  return trimmed || block.trim();
}
