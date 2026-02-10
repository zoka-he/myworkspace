import React from 'react';
import { Table, Tag, Space, Button, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { IWorldState, WorldStateType, WorldStateStatus, ImpactLevel } from '@/src/types/IAiNoval';
import { useWorldStateList, useCurrentWorldState } from '../WorldStateManageContext';

const stateTypeMap: Record<WorldStateType, string> = {
  world_event: '世界大事件',
  natural_disaster: '天灾',
  faction_agreement: '阵营协约',
  faction_misunderstanding: '阵营误判',
  faction_tech_limit: '阵营科技限制',
  character_agreement: '人物协议',
  character_perception_gap: '人物认知差',
  character_long_term_action: '人物长期行动',
};

const statusMap: Record<WorldStateStatus, { text: string; color: string }> = {
  active: { text: '活跃', color: 'green' },
  expired: { text: '已过期', color: 'default' },
  resolved: { text: '已解决', color: 'blue' },
  suspended: { text: '已暂停', color: 'orange' },
};

const impactLevelMap: Record<ImpactLevel, { text: string; color: string }> = {
  low: { text: '低', color: 'default' },
  medium: { text: '中', color: 'blue' },
  high: { text: '高', color: 'orange' },
  critical: { text: '关键', color: 'red' },
};

interface WorldStateListProps {
  onEdit: (worldState: IWorldState) => void;
  onDelete: (id: number) => void;
  onSelect: (id: number | null) => void;
}

export default function WorldStateList({ onEdit, onDelete, onSelect }: WorldStateListProps) {
  const [worldStateList] = useWorldStateList();
  const { currentWorldStateId } = useCurrentWorldState();

  const columns = [
    {
      title: '类型',
      dataIndex: 'state_type',
      key: 'state_type',
      width: 120,
      render: (type: WorldStateType) => <Tag>{stateTypeMap[type]}</Tag>,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: WorldStateStatus) => {
        const statusInfo = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: '影响级别',
      dataIndex: 'impact_level',
      key: 'impact_level',
      width: 100,
      render: (level: ImpactLevel) => {
        const levelInfo = impactLevelMap[level] || { text: level, color: 'default' };
        return <Tag color={levelInfo.color}>{levelInfo.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: IWorldState) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除吗？"
            onConfirm={() => record.id && onDelete(record.id)}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={worldStateList}
      rowKey="id"
      size="small"
      pagination={{ pageSize: 20 }}
      onRow={(record) => ({
        onClick: () => onSelect(record.id || null),
        style: {
          cursor: 'pointer',
          backgroundColor: currentWorldStateId === record.id ? '#e6f7ff' : undefined,
        },
      })}
    />
  );
}
