import React from 'react';
import { Select, Space } from 'antd';
import { useFilters } from '../WorldStateManageContext';
import { WorldStateType, WorldStateStatus, ImpactLevel } from '@/src/types/IAiNoval';

const { Option } = Select;

export const stateTypeOptions: { value: WorldStateType; label: string }[] = [
  { value: 'world_event', label: '世界大事件' },
  { value: 'natural_disaster', label: '天灾' },
  { value: 'faction_agreement', label: '阵营协约' },
  { value: 'faction_misunderstanding', label: '阵营误判' },
  { value: 'faction_tech_limit', label: '阵营科技限制' },
  { value: 'character_agreement', label: '人物协议' },
  { value: 'character_perception_gap', label: '人物认知差' },
  { value: 'character_long_term_action', label: '人物长期行动' },
];

export const statusOptions: { value: WorldStateStatus; label: string }[] = [
  { value: 'active', label: '活跃' },
  { value: 'expired', label: '已过期' },
  { value: 'resolved', label: '已解决' },
  { value: 'suspended', label: '已暂停' },
];

export const impactLevelOptions: { value: ImpactLevel; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'critical', label: '关键' },
];

export default function WorldStateFilterPanel() {
  const [filters, setFilters] = useFilters();

  return (
    <Space wrap>
      <Select
        style={{ width: 120 }}
        placeholder="类型"
        allowClear
        value={filters.state_type}
        onChange={(value) => setFilters({ ...filters, state_type: value })}
      >
        {stateTypeOptions.map(opt => (
          <Option key={opt.value} value={opt.value}>{opt.label}</Option>
        ))}
      </Select>
      <Select
        style={{ width: 100 }}
        placeholder="状态"
        allowClear
        value={filters.status}
        onChange={(value) => setFilters({ ...filters, status: value })}
      >
        {statusOptions.map(opt => (
          <Option key={opt.value} value={opt.value}>{opt.label}</Option>
        ))}
      </Select>
      <Select
        style={{ width: 100 }}
        placeholder="影响级别"
        allowClear
        value={filters.impact_level}
        onChange={(value) => setFilters({ ...filters, impact_level: value })}
      >
        {impactLevelOptions.map(opt => (
          <Option key={opt.value} value={opt.value}>{opt.label}</Option>
        ))}
      </Select>
      <Select
        style={{ width: 120 }}
        placeholder="排序"
        allowClear
        value={filters.sort_by ? `${filters.sort_by}:${filters.sort_order || 'asc'}` : undefined}
        onChange={(value) => {
          if (value == null || value === '') {
            const { sort_by, sort_order, ...rest } = filters;
            setFilters(rest);
            return;
          }
          const [sort_by, sort_order] = value.split(':');
          setFilters({ ...filters, sort_by, sort_order: sort_order || 'asc' });
        }}
      >
        <Option value="impact_level:asc">影响级别 升序</Option>
        <Option value="impact_level:desc">影响级别 降序</Option>
        <Option value="status:asc">状态 升序</Option>
        <Option value="status:desc">状态 降序</Option>
        {/* <Option value="id:asc">ID 升序</Option>
        <Option value="id:desc">ID 降序</Option> */}
      </Select>
    </Space>
  );
}
