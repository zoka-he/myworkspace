import React from 'react';
import { Card, Descriptions, Tag, Empty, Tabs } from 'antd';
import { useCurrentWorldState } from '../WorldStateManageContext';
import { IWorldState, WorldStateType, WorldStateStatus, ImpactLevel } from '@/src/types/IAiNoval';

const stateTypeMap: Record<WorldStateType, string> = {
  world_event: '世界大事件',
  natural_disaster: '天灾',
  faction_agreement: '阵营协约',
  faction_misunderstanding: '阵营误判',
  character_agreement: '人物协议',
  character_perception_gap: '人物认知差',
};

export default function WorldStateDetailPanel() {
  const { currentWorldState } = useCurrentWorldState();

  if (!currentWorldState) {
    return (
      <Card>
        <Empty description="请选择一个世界态查看详情" />
      </Card>
    );
  }

  const { TabPane } = Tabs;

  return (
    <Card title={currentWorldState.title} size="small">
      <Tabs defaultActiveKey="basic" size="small">
        <TabPane tab="基础信息" key="basic">
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="类型">
              <Tag>{stateTypeMap[currentWorldState.state_type]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={currentWorldState.status === 'active' ? 'green' : 'default'}>
                {currentWorldState.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="影响级别">
              <Tag color={currentWorldState.impact_level === 'high' ? 'red' : 'blue'}>
                {currentWorldState.impact_level}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="描述">
              {currentWorldState.description || '无'}
            </Descriptions.Item>
            <Descriptions.Item label="标签">
              {currentWorldState.tags?.map(tag => (
                <Tag key={tag}>{tag}</Tag>
              )) || '无'}
            </Descriptions.Item>
            <Descriptions.Item label="影响描述">
              {currentWorldState.impact_description || '暂无'}
            </Descriptions.Item>
            <Descriptions.Item label="受影响领域">
              {currentWorldState.affected_areas?.length ? (
                currentWorldState.affected_areas.map(area => (
                  <Tag key={area}>{area}</Tag>
                ))
              ) : (
                '无'
              )}
            </Descriptions.Item>
          </Descriptions>
        </TabPane>

        <TabPane tab="关联关系" key="relations">
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="关联阵营">
              {currentWorldState.related_faction_ids?.join(', ') || '无'}
            </Descriptions.Item>
            <Descriptions.Item label="关联角色">
              {currentWorldState.related_role_ids?.join(', ') || '无'}
            </Descriptions.Item>
            <Descriptions.Item label="关联地理">
              {currentWorldState.related_geo_codes?.join(', ') || '无'}
            </Descriptions.Item>
            <Descriptions.Item label="引用世界态">
              {currentWorldState.related_world_state_ids?.join(', ') || '无'}
            </Descriptions.Item>
          </Descriptions>
        </TabPane>
      </Tabs>
    </Card>
  );
}
