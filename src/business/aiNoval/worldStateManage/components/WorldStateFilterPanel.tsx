import React from 'react';
import { Card, Checkbox, Select, Space } from 'antd';
import { useFilters } from '../WorldStateManageContext';
import { WorldStateType, WorldStateStatus, ImpactLevel } from '@/src/types/IAiNoval';

const { Option } = Select;

const stateTypeOptions: { value: WorldStateType; label: string }[] = [
  { value: 'world_event', label: '世界大事件' },
  { value: 'natural_disaster', label: '天灾' },
  { value: 'faction_agreement', label: '阵营协约' },
  { value: 'faction_misunderstanding', label: '阵营误判' },
  { value: 'character_agreement', label: '人物协议' },
  { value: 'character_perception_gap', label: '人物认知差' },
];

const statusOptions: { value: WorldStateStatus; label: string }[] = [
  { value: 'active', label: '活跃' },
  { value: 'expired', label: '已过期' },
  { value: 'resolved', label: '已解决' },
  { value: 'suspended', label: '已暂停' },
];

const impactLevelOptions: { value: ImpactLevel; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'critical', label: '关键' },
];

export default function WorldStateFilterPanel() {
  const [filters, setFilters] = useFilters();

  return (
    <Card title="筛选条件" size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <div style={{ marginBottom: 8 }}>类型</div>
          <Select
            style={{ width: '100%' }}
            placeholder="选择类型"
            allowClear
            value={filters.state_type}
            onChange={(value) => setFilters({ ...filters, state_type: value })}
          >
            {stateTypeOptions.map(opt => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
        </div>

        <div>
          <div style={{ marginBottom: 8 }}>状态</div>
          <Select
            style={{ width: '100%' }}
            placeholder="选择状态"
            allowClear
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
          >
            {statusOptions.map(opt => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
        </div>

        <div>
          <div style={{ marginBottom: 8 }}>影响级别</div>
          <Select
            style={{ width: '100%' }}
            placeholder="选择影响级别"
            allowClear
            value={filters.impact_level}
            onChange={(value) => setFilters({ ...filters, impact_level: value })}
          >
            {impactLevelOptions.map(opt => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
        </div>
      </Space>
    </Card>
  );
}
