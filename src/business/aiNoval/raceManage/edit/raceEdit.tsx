import { Modal, Form, Input, InputNumber, TreeSelect, Select } from 'antd';
import { forwardRef, useImperativeHandle, useState, useEffect, useMemo } from 'react';
import { message } from '@/src/utils/antdAppMessage';
import { IRaceData } from '@/src/types/IAiNoval';
import apiCalls from '../apiCalls';
import { useWorldViewId, useWorldViewList, useRaceList, useLoadRaceList } from '../RaceManageContext';

export interface RaceEditRef {
  setFormValues: (values: IRaceData) => void;
  resetForm: () => void;
  showAndEdit: (values: IRaceData) => void;
}

interface RaceEditProps {
  initialValues?: IRaceData;
}

function buildParentTreeOptions(items: IRaceData[], parentId: number | null, pathPrefix: string): { title: string; value: number; children?: ReturnType<typeof buildParentTreeOptions> }[] {
  return items
    .filter((item) => (item.parent_id ?? null) === parentId)
    .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0))
    .map((item) => {
      const path = pathPrefix ? `${pathPrefix} / ${item.name ?? ''}` : (item.name ?? '');
      return {
        title: path,
        value: item.id!,
        children: buildParentTreeOptions(items, item.id ?? null, path),
      };
    });
}

const RaceEdit = forwardRef<RaceEditRef, RaceEditProps>((_, ref) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [backupData, setBackupData] = useState<Partial<IRaceData>>({});
  const [worldViewId] = useWorldViewId();
  const [worldViewList] = useWorldViewList();
  const [raceList] = useRaceList();
  const loadRaceList = useLoadRaceList();

  const parentTreeOptions = useMemo(() => buildParentTreeOptions(raceList, null, ''), [raceList]);

  useImperativeHandle(ref, () => ({
    setFormValues(values: IRaceData) {
      setBackupData(values);
      form.setFieldsValue({
        id: values.id,
        worldview_id: values.worldview_id ?? worldViewId,
        parent_id: values.parent_id ?? null,
        name: values.name,
        description: values.description,
        order_num: values.order_num ?? 0,
        appearance: values.appearance,
        lifespan: values.lifespan,
        traits: values.traits,
        weaknesses: values.weaknesses,
        naming_habit: values.naming_habit,
        customs: values.customs,
        embed_document: values.embed_document,
      });
    },
    resetForm() {
      form.resetFields();
      setBackupData({});
    },
    showAndEdit(values: IRaceData) {
      setVisible(true);
      setBackupData(values);
      form.setFieldsValue({
        id: values.id,
        worldview_id: values.worldview_id ?? worldViewId,
        parent_id: values.parent_id ?? null,
        name: values.name,
        description: values.description,
        order_num: values.order_num ?? 0,
        appearance: values.appearance,
        lifespan: values.lifespan,
        traits: values.traits,
        weaknesses: values.weaknesses,
        naming_habit: values.naming_habit,
        customs: values.customs,
        embed_document: values.embed_document,
      });
    },
  }));

  useEffect(() => {
    if (!visible) form.resetFields();
  }, [visible, form]);

  const handleOk = async () => {
    try {
      const raw = await form.validateFields();
      const payload: IRaceData = {
        ...backupData,
        worldview_id: raw.worldview_id ?? worldViewId,
        parent_id: raw.parent_id ?? null,
        name: raw.name,
        description: raw.description,
        order_num: raw.order_num ?? 0,
        appearance: raw.appearance,
        lifespan: raw.lifespan,
        traits: raw.traits,
        weaknesses: raw.weaknesses,
        naming_habit: raw.naming_habit,
        customs: raw.customs,
        embed_document: raw.embed_document,
      };
      if (payload.id) {
        await apiCalls.updateRace(payload);
        message.success('族群更新成功');
      } else {
        await apiCalls.addRace(payload);
        message.success('族群创建成功');
      }
      setVisible(false);
      loadRaceList();
    } catch (e) {
      console.error('Race edit failed:', e);
      if (e && typeof (e as { errorFields?: unknown })?.errorFields === 'undefined') {
        message.error((e as Error)?.message ?? '保存失败');
      }
    }
  };

  const isCreate = !backupData?.id;

  return (
    <Modal
      title={isCreate ? '新建族群' : '编辑族群'}
      open={visible}
      onOk={handleOk}
      onCancel={() => setVisible(false)}
      width={560}
    >
      <Form form={form} layout="vertical" initialValues={{ order_num: 0 }}>
        <Form.Item name="worldview_id" label="世界观" rules={[{ required: true }]}>
          <Select
            placeholder="请选择世界观"
            options={worldViewList.map((w) => ({ label: w.title, value: w.id }))}
            allowClear
            disabled
          />
        </Form.Item>
        <Form.Item name="parent_id" label="上级族群（亚种时选择主种族）">
          <TreeSelect
            placeholder="不选则为根族群"
            treeData={parentTreeOptions}
            allowClear
            treeDefaultExpandAll
            showSearch
            treeNodeFilterProp="title"
          />
        </Form.Item>
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="族群/种族名称" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={4} placeholder="简述" />
        </Form.Item>
        <Form.Item name="order_num" label="同层排序（数字越小越靠前）">
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="appearance" label="外形">
          <Input.TextArea rows={2} placeholder="外形描述" />
        </Form.Item>
        <Form.Item name="lifespan" label="寿命">
          <Input placeholder="寿命" />
        </Form.Item>
        <Form.Item name="traits" label="特质">
          <Input.TextArea rows={2} placeholder="种族特质" />
        </Form.Item>
        <Form.Item name="weaknesses" label="弱点">
          <Input.TextArea rows={2} placeholder="弱点" />
        </Form.Item>
        <Form.Item name="naming_habit" label="命名习惯">
          <Input.TextArea rows={2} placeholder="命名习惯" />
        </Form.Item>
        <Form.Item name="customs" label="习俗">
          <Input.TextArea rows={2} placeholder="习俗" />
        </Form.Item>
        <Form.Item name="embed_document" label="嵌入原文" hidden>
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
});

RaceEdit.displayName = 'RaceEdit';

export default RaceEdit;
