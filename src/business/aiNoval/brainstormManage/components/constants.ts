import { BrainstormType, BrainstormStatus, Priority, BrainstormCategory } from '@/src/types/IAiNoval';

export const typeOptions: { value: BrainstormType; label: string }[] = [
  { value: 'inspiration', label: '灵感' },
  { value: 'problem', label: '问题' },
  { value: 'idea', label: '想法' },
  { value: 'note', label: '笔记' },
  { value: 'to_verify', label: '待验证' },
];

export const statusOptions: { value: BrainstormStatus; label: string }[] = [
  { value: 'draft', label: '草稿' },
  { value: 'feasible_unused', label: '可行未使用' },
  { value: 'in_use', label: '使用中' },
  { value: 'used', label: '已使用' },
  { value: 'suspended', label: '暂时搁置' },
];

export const priorityOptions: { value: Priority; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
];

export const categoryOptions: { value: BrainstormCategory; label: string }[] = [
  { value: 'plot', label: '情节' },
  { value: 'character', label: '角色' },
  { value: 'worldview', label: '世界观' },
  { value: 'style', label: '风格' },
  { value: 'other', label: '其他' },
];

export const statusMap: Record<BrainstormStatus, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  feasible_unused: { text: '可行未使用', color: 'blue' },
  in_use: { text: '使用中', color: 'processing' },
  used: { text: '已使用', color: 'success' },
  suspended: { text: '暂时搁置', color: 'warning' },
};

/** 分析类型 */
export type AnalysisType = 'feasibility_and_expansion' | 'chapter_outline' | 'role_ideation' | 'other';

export const analysisTypeOptions: { value: AnalysisType; label: string; description: string }[] = [
  { value: 'feasibility_and_expansion', label: '可行性及思路扩展', description: '分析脑洞的可行性、一致性，并提供思路扩展建议' },
  { value: 'chapter_outline', label: '章节纲要', description: '基于脑洞的元数据、用户问题、扩展问题和分析结果生成章节纲要' },
  { value: 'role_ideation', label: '角色卡构思', description: '抽样生成角色种子，基于种子生成角色卡与背景草稿' },
];
