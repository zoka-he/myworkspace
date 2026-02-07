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
  { value: 'character_agreement', label: '人物协议' },
  { value: 'character_perception_gap', label: '人物认知差' },
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
    </Space>
  );
}
