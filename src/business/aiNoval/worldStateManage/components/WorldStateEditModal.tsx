import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select } from 'antd';
import { IWorldState, WorldStateType, WorldStateStatus, ImpactLevel } from '@/src/types/IAiNoval';
import { useWorldviewId } from '../WorldStateManageContext';
import {
  getFactionOptionsForWorldState,
  getRoleOptionsForWorldState,
  getGeoUnitOptionsForWorldState,
  getWorldStateList,
} from '@/src/api/aiNovel';

const { Option } = Select;
const { TextArea } = Input;

const stateTypeOptions: { value: WorldStateType; label: string }[] = [
  { value: 'world_event', label: '世界大事件' },
  { value: 'natural_disaster', label: '天灾' },
  { value: 'faction_agreement', label: '阵营协约' },
  { value: 'faction_misunderstanding', label: '阵营误判' },
  { value: 'faction_tech_limit', label: '阵营科技限制' },
  { value: 'character_agreement', label: '人物协议' },
  { value: 'character_perception_gap', label: '人物认知差' },
  { value: 'character_long_term_action', label: '人物长期行动' },
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

interface WorldStateEditModalProps {
  visible: boolean;
  worldState: IWorldState | null;
  onCancel: () => void;
  onSave: (values: any) => void;
}

export default function WorldStateEditModal({ visible, worldState, onCancel, onSave }: WorldStateEditModalProps) {
  const [form] = Form.useForm();
  const [worldviewId] = useWorldviewId();
  const [factionOptions, setFactionOptions] = useState<{ id: number; name?: string }[]>([]);
  const [roleOptions, setRoleOptions] = useState<{ id: number; name?: string }[]>([]);
  const [geoOptions, setGeoOptions] = useState<{ code: string; name?: string }[]>([]);
  const [worldStateOptions, setWorldStateOptions] = useState<IWorldState[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  useEffect(() => {
    if (visible && worldviewId) {
      setOptionsLoading(true);
      Promise.all([
        getFactionOptionsForWorldState(worldviewId),
        getRoleOptionsForWorldState(worldviewId),
        getGeoUnitOptionsForWorldState(worldviewId),
        getWorldStateList({ worldview_id: worldviewId }, 1, 500).then((r) => r.data),
      ])
        .then(([factions, roles, geos, worldStates]) => {
          setFactionOptions(factions ?? []);
          setRoleOptions(roles ?? []);
          setGeoOptions(geos ?? []);
          setWorldStateOptions(worldStates ?? []);
        })
        .catch((err) => {
          console.error('Load relation options failed:', err);
        })
        .finally(() => {
          setOptionsLoading(false);
        });
    }
  }, [visible, worldviewId]);

  useEffect(() => {
    if (visible) {
      if (worldState) {
        form.setFieldsValue({
          ...worldState,
          related_faction_ids: worldState.related_faction_ids ?? [],
          related_role_ids: worldState.related_role_ids ?? [],
          related_geo_codes: worldState.related_geo_codes ?? [],
          related_world_state_ids: worldState.related_world_state_ids ?? [],
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          worldview_id: worldviewId,
          related_faction_ids: [],
          related_role_ids: [],
          related_geo_codes: [],
          related_world_state_ids: [],
        });
      }
    }
  }, [visible, worldState, form, worldviewId]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSave({ ...worldState, ...values });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  return (
    <Modal
      title={worldState ? '编辑世界态' : '创建世界态'}
      visible={visible}
      onOk={handleOk}
      onCancel={onCancel}
      width={800}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
          <Input placeholder="请输入标题" />
        </Form.Item>

        <Form.Item name="state_type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
          <Select placeholder="请选择类型">
            {stateTypeOptions.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="status" label="状态">
          <Select placeholder="请选择状态">
            {statusOptions.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="description" label="描述">
          <TextArea autoSize={{ minRows: 4 }} placeholder="请输入描述" />
        </Form.Item>

        <Form.Item name="impact_level" label="影响级别">
          <Select placeholder="请选择影响级别">
            {impactLevelOptions.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="impact_description" label="影响描述">
          <TextArea autoSize={{ minRows: 3 }} placeholder="请输入影响描述" />
        </Form.Item>

        <Form.Item name="related_faction_ids" label="关联阵营">
          <Select
            mode="multiple"
            placeholder="请选择关联阵营"
            allowClear
            showSearch
            optionFilterProp="label"
            loading={optionsLoading}
            options={factionOptions.map((f) => ({ value: f.id, label: f.name || `阵营 ${f.id}` }))}
            filterOption={(input, option) =>
              (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
        <Form.Item name="related_role_ids" label="关联角色">
          <Select
            mode="multiple"
            placeholder="请选择关联角色"
            allowClear
            showSearch
            optionFilterProp="label"
            loading={optionsLoading}
            options={roleOptions.map((r) => ({ value: r.id, label: r.name || `角色 ${r.id}` }))}
            filterOption={(input, option) =>
              (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
        <Form.Item name="related_geo_codes" label="关联地理">
          <Select
            mode="multiple"
            placeholder="请选择关联地理"
            allowClear
            showSearch
            optionFilterProp="label"
            loading={optionsLoading}
            options={geoOptions.map((g) => ({ value: g.code, label: `${g.code}${g.name ? ` - ${g.name}` : ''}` }))}
            filterOption={(input, option) =>
              (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
        <Form.Item name="related_world_state_ids" label="引用世界态">
          <Select
            mode="multiple"
            placeholder="请选择引用的世界态"
            allowClear
            showSearch
            optionFilterProp="label"
            loading={optionsLoading}
            options={worldStateOptions
              .filter((w) => !worldState?.id || w.id !== worldState.id)
              .map((w) => ({
                value: w.id!,
                label: w.title || `世界态 ${w.id}`,
              }))}
            filterOption={(input, option) =>
              (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
