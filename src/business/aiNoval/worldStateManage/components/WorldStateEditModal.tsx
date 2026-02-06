import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, InputNumber } from 'antd';
import { IWorldState, WorldStateType, WorldStateStatus, ImpactLevel } from '@/src/types/IAiNoval';
import { useWorldviewId } from '../WorldStateManageContext';

const { Option } = Select;
const { TextArea } = Input;

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

interface WorldStateEditModalProps {
  visible: boolean;
  worldState: IWorldState | null;
  onCancel: () => void;
  onSave: (values: any) => void;
}

export default function WorldStateEditModal({ visible, worldState, onCancel, onSave }: WorldStateEditModalProps) {
  const [form] = Form.useForm();
  const [worldviewId] = useWorldviewId();

  useEffect(() => {
    if (visible) {
      if (worldState) {
        form.setFieldsValue(worldState);
      } else {
        form.resetFields();
        form.setFieldsValue({ worldview_id: worldviewId });
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
            {stateTypeOptions.map(opt => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="status" label="状态">
          <Select placeholder="请选择状态">
            {statusOptions.map(opt => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="description" label="描述">
          <TextArea rows={4} placeholder="请输入描述" />
        </Form.Item>

        <Form.Item name="impact_level" label="影响级别">
          <Select placeholder="请选择影响级别">
            {impactLevelOptions.map(opt => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="impact_description" label="影响描述">
          <TextArea rows={3} placeholder="请输入影响描述" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
