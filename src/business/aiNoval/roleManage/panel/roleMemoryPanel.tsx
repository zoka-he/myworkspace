/**
 * 角色记忆面板：与章节发展关联，支持优先级与槽位指向性，便于手动管理
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { message } from '@/src/utils/antdAppMessage';
import { Card, Table, Button, Space, Select, Modal, Form, Input, Typography, Divider, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import apiCalls from '../apiCalls';
import {
  IRoleMemory,
  ROLE_MEMORY_SCOPE,
  ROLE_MEMORY_AFFECTS_SLOTS,
  ROLE_MEMORY_TYPES,
  ROLE_MEMORY_NARRATIVE_USAGE,
  ROLE_MEMORY_IMPORTANCE,
} from '@/src/types/IAiNoval';
import { useWorldViewId, useRoleInfoId, useRoleInfoList } from '../roleManageContext';
import fetch from '@/src/fetch';
import type { IChapter } from '@/src/types/IAiNoval';

const { TextArea } = Input;
const { Title } = Typography;

export default function RoleMemoryPanel() {
  const [worldViewId] = useWorldViewId();
  const [roleInfoId] = useRoleInfoId();
  const [roleInfoList] = useRoleInfoList();

  const [list, setList] = useState<IRoleMemory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterAffectsSlot, setFilterAffectsSlot] = useState<string | undefined>();
  const [filterMemoryType, setFilterMemoryType] = useState<string | undefined>();
  const [filterImportanceMin, setFilterImportanceMin] = useState<string | undefined>();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<IRoleMemory | null>(null);
  const [form] = Form.useForm();
  const [submitLoading, setSubmitLoading] = useState(false);

  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copySourceRoleInfoId, setCopySourceRoleInfoId] = useState<number | undefined>();
  const [copyLoading, setCopyLoading] = useState(false);

  const [chapterList, setChapterList] = useState<IChapter[]>([]);

  const currentRoleInfo = useMemo(
    () => roleInfoList?.find((info) => info.id === roleInfoId) ?? null,
    [roleInfoList, roleInfoId]
  );
  const panelTitle = currentRoleInfo
    ? `角色记忆 - ${currentRoleInfo.name_in_worldview ?? '未命名'}${currentRoleInfo.version_name ? ` (v${currentRoleInfo.version_name})` : ''}`
    : '角色记忆';

  const loadChapters = useCallback(async () => {
    if (!worldViewId) return;
    try {
      const res = await fetch.get<{ data?: IChapter[] }>('/api/aiNoval/chapters/list', {
        params: { worldview_id: worldViewId, dataType: 'base', page: 1, limit: 500 },
      });
      const data = Array.isArray(res.data) ? res.data : (res as any)?.data?.data ?? [];
      setChapterList(data);
    } catch {
      setChapterList([]);
    }
  }, [worldViewId]);

  const loadList = useCallback(async () => {
    if (!worldViewId) return;
    setLoading(true);
    try {
      const params: Parameters<typeof apiCalls.getRoleMemoryList>[0] = {
        worldview_id: worldViewId,
        page: 1,
        limit: 100,
      };
      if (roleInfoId != null) params.role_info_id = roleInfoId;
      if (filterAffectsSlot) params.affects_slot = filterAffectsSlot;
      if (filterMemoryType) params.memory_type = filterMemoryType;
      if (filterImportanceMin) params.importance_min = filterImportanceMin;
      const res = await apiCalls.getRoleMemoryList(params);
      const data = (res as any)?.data?.data ?? res?.data ?? [];
      const count = (res as any)?.data?.count ?? data?.length ?? 0;
      setList(Array.isArray(data) ? data : []);
      setTotal(count);
    } catch (e) {
      message.error('加载角色记忆失败');
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [worldViewId, roleInfoId, filterAffectsSlot, filterMemoryType, filterImportanceMin]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  const handleAdd = () => {
    setEditingRecord(null);
    form.setFieldsValue({
      content: '',
      impact_summary: '',
      importance: 'medium',
      memory_type: undefined,
      affects_slot: undefined,
      related_role_info_id: undefined,
      scope: 'global',
      narrative_usage: undefined,
      chapter_id: undefined,
      start_chapter_id: undefined,
      end_chapter_id: undefined,
    });
    setModalVisible(true);
  };

  const handleEdit = (record: IRoleMemory) => {
    setEditingRecord(record);
    form.setFieldsValue({
      content: record.content ?? '',
      impact_summary: record.impact_summary ?? '',
      importance: record.importance ?? 'medium',
      memory_type: record.memory_type ?? undefined,
      affects_slot: record.affects_slot ?? undefined,
      related_role_info_id: record.related_role_info_id ?? undefined,
      scope: record.scope ?? 'global',
      narrative_usage: record.narrative_usage ?? undefined,
      chapter_id: record.chapter_id ?? undefined,
      start_chapter_id: record.start_chapter_id ?? undefined,
      end_chapter_id: record.end_chapter_id ?? undefined,
    });
    setModalVisible(true);
  };

  const openCopyModal = () => {
    setCopySourceRoleInfoId(otherVersionOptions[0]?.value);
    setCopyModalOpen(true);
  };

  const handleCopyFromVersion = async () => {
    if (!worldViewId || roleInfoId == null || copySourceRoleInfoId == null) {
      message.warning('请选择源版本');
      return;
    }
    setCopyLoading(true);
    try {
      const res = (await apiCalls.copyRoleMemoriesFromVersion({
        worldview_id: worldViewId,
        from_role_info_id: copySourceRoleInfoId,
        to_role_info_id: roleInfoId,
      })) as { success?: boolean; data?: { copied?: number }; error?: string };
      if (!res?.success) {
        message.error(res?.error || '拷贝失败');
        return;
      }
      const n = res.data?.copied ?? 0;
      message.success(n > 0 ? `已从所选版本拷贝 ${n} 条记忆` : '源版本下没有可拷贝的记忆');
      setCopyModalOpen(false);
      loadList();
    } catch {
      message.error('拷贝失败');
    } finally {
      setCopyLoading(false);
    }
  };

  const handleDelete = (record: IRoleMemory) => {
    if (!record.id) return;
    Modal.confirm({
      title: '确认删除',
      content: '确定删除这条角色记忆吗？',
      onOk: async () => {
        try {
          await apiCalls.deleteRoleMemory(record.id!);
          message.success('已删除');
          loadList();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (!worldViewId || !roleInfoId) {
        message.error('请先选择世界观和角色');
        return;
      }
      setSubmitLoading(true);
      const body: Partial<IRoleMemory> = {
        worldview_id: worldViewId,
        role_info_id: roleInfoId,
        content: values.content,
        impact_summary: values.impact_summary || undefined,
        importance: values.importance ?? 'medium',
        memory_type: values.memory_type,
        affects_slot: values.affects_slot,
        related_role_info_id: values.affects_slot === 'relationship' ? values.related_role_info_id : undefined,
        scope: values.scope ?? 'global',
        narrative_usage: values.narrative_usage ?? undefined,
        chapter_id: values.scope === 'at_chapter' ? values.chapter_id : undefined,
        start_chapter_id: values.scope === 'from_chapter' ? values.start_chapter_id : undefined,
        end_chapter_id: values.scope === 'from_chapter' ? values.end_chapter_id : undefined,
      };
      if (editingRecord?.id) {
        await apiCalls.updateRoleMemory(editingRecord.id, body);
        message.success('已更新');
      } else {
        await apiCalls.createRoleMemory(body);
        message.success('已添加');
      }
      setModalVisible(false);
      loadList();
    } catch (e) {
      // form validation or request error
    } finally {
      setSubmitLoading(false);
    }
  };

  const scopeLabel = (r: IRoleMemory) => {
    if (r.scope === 'global') return '全局';
    if (r.scope === 'at_chapter' && r.chapter_id) {
      const ch = chapterList.find((c) => c.id === r.chapter_id);
      return ch ? `第${ch.chapter_number}章` : `章#${r.chapter_id}`;
    }
    if (r.scope === 'from_chapter') {
      const s = chapterList.find((c) => c.id === r.start_chapter_id);
      const e = chapterList.find((c) => c.id === r.end_chapter_id);
      return s && e ? `第${s.chapter_number}–${e.chapter_number}章` : '区间';
    }
    return r.scope ?? '-';
  };

  const affectsSlotLabel = (slot: string | null | undefined) =>
    ROLE_MEMORY_AFFECTS_SLOTS.find((s) => s.value === slot)?.label ?? slot ?? '-';
  const memoryTypeLabel = (t: string | null | undefined) =>
    ROLE_MEMORY_TYPES.find((s) => s.value === t)?.label ?? t ?? '-';
  const narrativeUsageLabel = (u: string | null | undefined) =>
    ROLE_MEMORY_NARRATIVE_USAGE.find((s) => s.value === u)?.label ?? u ?? '-';

  const columns: ColumnsType<IRoleMemory> = [
    {
      title: '内容摘要',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (v: string) => (v ? (v.length > 80 ? v.slice(0, 80) + '...' : v) : '-'),
    },
    {
      title: '影响摘要',
      dataIndex: 'impact_summary',
      key: 'impact_summary',
      ellipsis: true,
      width: 140,
      render: (v: string) =>
        v ? (
          <Tooltip title={v}>
            <span>{v.length > 30 ? v.slice(0, 30) + '...' : v}</span>
          </Tooltip>
        ) : (
          '-'
        ),
    },
    {
      title: '重要性',
      dataIndex: 'importance',
      key: 'importance',
      width: 80,
      render: (v: string) => ROLE_MEMORY_IMPORTANCE.find((s) => s.value === v)?.label ?? v ?? '-',
    },
    {
      title: '影响维度',
      dataIndex: 'affects_slot',
      key: 'affects_slot',
      width: 100,
      render: (v) => affectsSlotLabel(v),
    },
    {
      title: '类型',
      dataIndex: 'memory_type',
      key: 'memory_type',
      width: 90,
      render: (v) => memoryTypeLabel(v),
    },
    {
      title: '章节范围',
      key: 'scope',
      width: 100,
      render: (_, r) => scopeLabel(r),
    },
    {
      title: '剧情使用',
      dataIndex: 'narrative_usage',
      key: 'narrative_usage',
      width: 80,
      render: (v) => narrativeUsageLabel(v),
    },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 70 },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>
            编辑
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const relatedRoleOptions = useMemo(() => {
    return (roleInfoList || [])
      .filter((info) => info.id !== roleInfoId)
      .map((info) => ({ value: info.id!, label: info.name_in_worldview || `#${info.id}` }));
  }, [roleInfoList, roleInfoId]);

  /** 同一角色定义（role_id）下的其它版本，用于「从指定版本拷贝」 */
  const otherVersionOptions = useMemo(() => {
    const rid = currentRoleInfo?.role_id;
    if (rid == null) return [];
    return (roleInfoList || [])
      .filter((info) => info.id != null && info.id !== roleInfoId && info.role_id === rid)
      .map((info) => ({
        value: info.id!,
        label: `${info.version_name?.trim() ? `v${info.version_name}` : '未命名版本'} · ${info.name_in_worldview || `#${info.id}`}`,
      }));
  }, [roleInfoList, roleInfoId, currentRoleInfo?.role_id]);

  const chapterOptions = useMemo(
    () =>
      chapterList.map((c) => ({
        value: c.id!,
        label: `第${c.chapter_number}章 ${(c.title || '').slice(0, 20)}`,
      })),
    [chapterList]
  );

  if (!worldViewId) {
    return (
      <Card title="角色记忆">
        <p className="text-gray-500">请先选择世界观。</p>
      </Card>
    );
  }

  if (roleInfoId == null) {
    return (
      <Card title="角色记忆">
        <p className="text-gray-500">请先在左侧选择角色。</p>
      </Card>
    );
  }

  return (
    <div>
      
      <div className="flex flex-row gap-3 items-center justify-between">
        <Title level={5} style={{ margin: 0 }}>{panelTitle}</Title>
        <Space>
          <Select
            placeholder="影响维度"
            allowClear
            style={{ width: 120 }}
            value={filterAffectsSlot}
            onChange={setFilterAffectsSlot}
            options={ROLE_MEMORY_AFFECTS_SLOTS.map((s) => ({ value: s.value, label: s.label }))}
          />
          <Select
            placeholder="类型"
            allowClear
            style={{ width: 110 }}
            value={filterMemoryType}
            onChange={setFilterMemoryType}
            options={ROLE_MEMORY_TYPES.map((s) => ({ value: s.value, label: s.label }))}
          />
          <Select
            placeholder="重要性不低于"
            allowClear
            style={{ width: 120 }}
            value={filterImportanceMin}
            onChange={setFilterImportanceMin}
            options={ROLE_MEMORY_IMPORTANCE.map((s) => ({ value: s.value, label: s.label }))}
          />
          <Tooltip title={otherVersionOptions.length === 0 ? '当前角色没有其它版本可拷贝' : undefined}>
            <Button icon={<CopyOutlined />} onClick={openCopyModal} disabled={otherVersionOptions.length === 0}>
              从版本拷贝
            </Button>
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增记忆
          </Button>
        </Space>
      </div>
      <Divider size="small"/>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={list}
        columns={columns}
        pagination={{ total, pageSize: 20, showSizeChanger: false }}
        size="small"
      />

      <Modal
        title="从指定版本拷贝记忆"
        open={copyModalOpen}
        onOk={handleCopyFromVersion}
        onCancel={() => setCopyModalOpen(false)}
        confirmLoading={copyLoading}
        okText="开始拷贝"
        destroyOnClose
      >
        <p className="text-gray-600 text-sm mb-3">
          将所选版本下的全部记忆复制到当前版本（追加到列表末尾，不会删除已有记忆）。仅可在同一角色不同信息版本之间拷贝。
        </p>
        <div className="mb-2">
          <span className="mr-2">源版本</span>
          <Select
            className="min-w-[240px]"
            placeholder="选择要拷贝的版本"
            value={copySourceRoleInfoId}
            onChange={(v) => setCopySourceRoleInfoId(v)}
            options={otherVersionOptions}
          />
        </div>
      </Modal>

      <Modal
        title={editingRecord ? '编辑角色记忆' : '新增角色记忆'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitLoading}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="content" label="记忆内容" rules={[{ required: true, message: '请输入内容' }]}>
            <TextArea autoSize={{ minRows: 4 }} placeholder="记忆的详细内容" />
          </Form.Item>
          <Form.Item name="impact_summary" label="影响摘要">
            <TextArea autoSize={{ minRows: 2 }} placeholder="此记忆对角色构成的影响（如：不再信任A，动机转为复仇）" allowClear />
          </Form.Item>
          <Form.Item name="importance" label="重要性" initialValue="medium">
            <Select
              options={ROLE_MEMORY_IMPORTANCE.map((s) => ({ value: s.value, label: s.label }))}
            />
          </Form.Item>
          <Form.Item name="memory_type" label="叙事类型">
            <Select allowClear placeholder="可选" options={ROLE_MEMORY_TYPES.map((s) => ({ value: s.value, label: s.label }))} />
          </Form.Item>
          <Form.Item name="affects_slot" label="影响维度">
            <Select
              allowClear
              placeholder="可选"
              options={ROLE_MEMORY_AFFECTS_SLOTS.map((s) => ({ value: s.value, label: s.label }))}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.affects_slot !== curr.affects_slot}>
            {({ getFieldValue }) =>
              getFieldValue('affects_slot') === 'relationship' ? (
                <Form.Item name="related_role_info_id" label="关联角色（对谁的态度）">
                  <Select allowClear placeholder="选择角色" options={relatedRoleOptions} showSearch optionFilterProp="label" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item name="scope" label="作用范围" initialValue="global">
            <Select
              options={ROLE_MEMORY_SCOPE.map((s) => ({ value: s.value, label: s.label }))}
            />
          </Form.Item>
          <Form.Item name="narrative_usage" label="剧情中的使用">
            <Select
              allowClear
              placeholder="不区分则留空；暗线仅作动机与伏笔，不在叙述中直接写出"
              options={ROLE_MEMORY_NARRATIVE_USAGE.map((s) => ({ value: s.value, label: s.label }))}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.scope !== curr.scope}>
            {({ getFieldValue }) => {
              const scope = getFieldValue('scope');
              if (scope === 'at_chapter') {
                return (
                  <Form.Item name="chapter_id" label="章节">
                    <Select allowClear placeholder="选择章节" options={chapterOptions} />
                  </Form.Item>
                );
              }
              if (scope === 'from_chapter') {
                return (
                  <>
                    <Form.Item name="start_chapter_id" label="起始章节">
                      <Select allowClear placeholder="选择起始章节" options={chapterOptions} />
                    </Form.Item>
                    <Form.Item name="end_chapter_id" label="结束章节">
                      <Select allowClear placeholder="选择结束章节（空表示至今有效）" options={chapterOptions} />
                    </Form.Item>
                  </>
                );
              }
              return null;
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
