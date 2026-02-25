import React, { useEffect, useState, useMemo } from 'react';
import { Select, Space } from 'antd';
import { useFilters, useWorldviewId } from '../BrainstormManageContext';
import { BrainstormType, BrainstormStatus, Priority, BrainstormCategory, IChapter } from '@/src/types/IAiNoval';
import { getChapterListByWorldviewId } from '../../chapterManage/apiCalls';

const { Option } = Select;

const typeOptions: { value: BrainstormType; label: string }[] = [
  { value: 'inspiration', label: '灵感' },
  { value: 'problem', label: '问题' },
  { value: 'idea', label: '想法' },
  { value: 'note', label: '笔记' },
  { value: 'to_verify', label: '待验证' },
];

const statusOptions: { value: BrainstormStatus; label: string }[] = [
  { value: 'draft', label: '草稿' },
  { value: 'feasible_unused', label: '可行未使用' },
  { value: 'in_use', label: '使用中' },
  { value: 'used', label: '已使用' },
  { value: 'suspended', label: '暂时搁置' },
];

const priorityOptions: { value: Priority; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
];

const categoryOptions: { value: BrainstormCategory; label: string }[] = [
  { value: 'plot', label: '情节' },
  { value: 'character', label: '角色' },
  { value: 'worldview', label: '世界观' },
  { value: 'style', label: '风格' },
  { value: 'other', label: '其他' },
];

export default function BrainstormFilterPanel() {
  const [filters, setFilters] = useFilters();
  const [worldviewId] = useWorldviewId();
  const [chapterList, setChapterList] = useState<IChapter[]>([]);

  useEffect(() => {
    if (!worldviewId) {
      setChapterList([]);
      return;
    }
    getChapterListByWorldviewId(worldviewId, 1, 500)
      .then((res) => setChapterList(res.data || []))
      .catch(() => setChapterList([]));
  }, [worldviewId]);

  const chapterOptions = useMemo(() => chapterList.map((ch) => ({
    value: ch.id,
    label: `第 ${ch.chapter_number ?? ch.id} 章 · ${ch.title || '未命名'}`,
  })), [chapterList]);

  return (
    <Space wrap>
      <Select
        style={{ width: 180 }}
        placeholder="按章节筛选"
        allowClear
        showSearch
        optionFilterProp="label"
        value={filters.related_chapter_id ?? undefined}
        onChange={(value) => setFilters({ ...filters, related_chapter_id: value ?? undefined })}
        options={chapterOptions}
      />
      <Select
        style={{ width: 150 }}
        placeholder="条目类型"
        allowClear
        value={filters.brainstorm_type}
        onChange={(value) => setFilters({ ...filters, brainstorm_type: value })}
      >
        {typeOptions.map(opt => (
          <Option key={opt.value} value={opt.value}>{opt.label}</Option>
        ))}
      </Select>

      {/* <Select
        style={{ width: 150 }}
        placeholder="状态"
        mode="multiple"
        allowClear
        value={filters.status}
        onChange={(value) => setFilters({ ...filters, status: value })}
      >
        {statusOptions.map(opt => (
          <Option key={opt.value} value={opt.value}>{opt.label}</Option>
        ))}
      </Select> */}

      {/*<Select
        style={{ width: 120 }}
        placeholder="优先级"
        allowClear
        value={filters.priority}
        onChange={(value) => setFilters({ ...filters, priority: value })}
      >
        {priorityOptions.map(opt => (
          <Option key={opt.value} value={opt.value}>{opt.label}</Option>
        ))}
      </Select> */}

      <Select
        style={{ width: 150 }}
        placeholder="内容分类"
        allowClear
        value={filters.category}
        onChange={(value) => setFilters({ ...filters, category: value })}
      >
        {categoryOptions.map(opt => (
          <Option key={opt.value} value={opt.value}>{opt.label}</Option>
        ))}
      </Select>
    </Space>
  );
}
