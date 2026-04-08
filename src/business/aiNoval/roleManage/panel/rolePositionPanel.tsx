import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Divider, Form, Input, InputNumber, Modal, Radio, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { message } from '@/src/utils/antdAppMessage';
import apiCalls from '../apiCalls';
import { useRoleId, useRoleInfoId, useRoleInfoList, useWorldViewId, useWorldViewList } from '../roleManageContext';
import type { IRolePositionRecord, IRolePositionValidationResult, IWorldviewPositionRule, ITimelineDef } from '@/src/types/IAiNoval';
import GeoSelect from '@/src/components/aiNovel/geoSelect';
import NovelTimeEdit from '@/src/business/aiNoval/eventManage2/components/NovelTimeEdit';
import { notifyAiNovelWriteCompleted } from '@/src/business/aiNoval/sharedWorkerBridge';
import { TimelineDateFormatter } from '@/src/business/aiNoval/common/novelDateUtils';
import { loadGeoUnionList } from '@/src/business/aiNoval/common/geoDataUtil';

const { TextArea } = Input;
const { Title, Text } = Typography;

const travelModeOptions = [
  { value: 'walk', label: '步行' },
  { value: 'ride', label: '骑乘' },
  { value: 'vehicle', label: '载具' },
  { value: 'portal', label: '传送' },
];

const travelModeLabelMap = new Map(travelModeOptions.map((item) => [item.value, item.label]));

function splitDecisionFactors(text?: string): Record<string, number> {
  const ret: Record<string, number> = {};
  if (!text) return ret;
  text
    .split(/[\n,，]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [k, v] = line.split(':').map((s) => s.trim());
      if (!k) return;
      const n = Number(v);
      ret[k] = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
    });
  return ret;
}

function joinDecisionFactors(obj?: Record<string, number> | null): string {
  if (!obj || typeof obj !== 'object') return '';
  return Object.entries(obj)
    .map(([k, v]) => `${k}:${v}`)
    .join('\n');
}

export default function RolePositionPanel() {
  const [worldViewId] = useWorldViewId();
  const [worldViewList] = useWorldViewList();
  const [roleId] = useRoleId();
  const [roleInfoId] = useRoleInfoId();
  const [roleInfoList] = useRoleInfoList();

  const [list, setList] = useState<IRolePositionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [geoNameMap, setGeoNameMap] = useState<Map<string, string>>(new Map());

  const [rule, setRule] = useState<IWorldviewPositionRule | null>(null);
  const [ruleSaving, setRuleSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IRolePositionRecord | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  const currentRoleInfo = useMemo(
    () => roleInfoList?.find((item) => item.id === roleInfoId) ?? null,
    [roleInfoList, roleInfoId]
  );

  const panelTitle = currentRoleInfo
    ? `角色位置 - ${currentRoleInfo.name_in_worldview ?? '未命名'}${currentRoleInfo.version_name ? ` (v${currentRoleInfo.version_name})` : ''}`
    : '角色位置';

  const timelineDef: ITimelineDef | null = useMemo(() => {
    if (!worldViewId) return null;
    const worldView: any = (worldViewList || []).find((w: any) => w.id === worldViewId);
    if (!worldView) return null;
    if (worldView.tl_id == null) return null;
    return {
      id: Number(worldView.tl_id),
      worldview_id: Number(worldView.tl_worldview_id ?? worldView.id ?? worldViewId),
      epoch: String(worldView.tl_epoch ?? '公元'),
      start_seconds: Number(worldView.tl_start_seconds ?? 0),
      hour_length_in_seconds: Number(worldView.tl_hour_length_in_seconds ?? 3600),
      day_length_in_hours: Number(worldView.tl_day_length_in_hours ?? 24),
      month_length_in_days: Number(worldView.tl_month_length_in_days ?? 30),
      year_length_in_months: Number(worldView.tl_year_length_in_months ?? 12),
      base_seconds: Number(worldView.tl_base_seconds ?? 0),
      faction_id: worldView.faction_id != null ? Number(worldView.faction_id) : undefined,
      description: worldView.description != null ? String(worldView.description) : undefined,
    };
  }, [worldViewId, worldViewList]);

  const fallbackTimelineDef: ITimelineDef = useMemo(
    () => ({
      id: 0,
      worldview_id: Number(worldViewId || 0),
      epoch: '公元',
      start_seconds: 0,
      hour_length_in_seconds: 3600,
      day_length_in_hours: 24,
      month_length_in_days: 30,
      year_length_in_months: 12,
      base_seconds: 0,
    }),
    [worldViewId]
  );

  const dateFormatter = useMemo(() => {
    try {
      const worldView: any = (worldViewList || []).find((w: any) => w.id === worldViewId);
      if (worldView?.tl_id != null) {
        return TimelineDateFormatter.fromWorldViewWithExtra(worldView as any);
      }
      return TimelineDateFormatter.fromTimelineDef(timelineDef || fallbackTimelineDef);
    } catch {
      return TimelineDateFormatter.fromTimelineDef(fallbackTimelineDef);
    }
  }, [worldViewId, worldViewList, timelineDef, fallbackTimelineDef]);

  useEffect(() => {
    let cancelled = false;
    async function loadGeoNames() {
      if (!worldViewId) {
        setGeoNameMap(new Map());
        return;
      }
      try {
        const geoList = await loadGeoUnionList(worldViewId);
        if (cancelled) return;
        const m = new Map<string, string>();
        (geoList || []).forEach((g: any) => {
          const code = g?.code != null ? String(g.code) : '';
          if (!code) return;
          const name = g?.name != null && String(g.name).trim() !== '' ? String(g.name) : code;
          m.set(code, name);
        });
        setGeoNameMap(m);
      } catch {
        if (!cancelled) setGeoNameMap(new Map());
      }
    }
    void loadGeoNames();
    return () => {
      cancelled = true;
    };
  }, [worldViewId]);

  const loadList = useCallback(async () => {
    if (!worldViewId || !roleId || !roleInfoId) return;
    setLoading(true);
    try {
      const rs = await apiCalls.getRolePositionList({
        worldview_id: worldViewId,
        role_id: roleId,
        role_info_id: roleInfoId,
        page: 1,
        limit: 200,
      });
      const data = (rs as any)?.data?.data ?? [];
      const count = (rs as any)?.data?.count ?? data.length ?? 0;
      setList(Array.isArray(data) ? data : []);
      setTotal(count);
    } catch {
      message.error('加载角色位置失败');
    } finally {
      setLoading(false);
    }
  }, [worldViewId, roleId, roleInfoId]);

  const loadRule = useCallback(async () => {
    if (!worldViewId) return;
    try {
      const rs = await apiCalls.getWorldviewPositionRule(worldViewId);
      setRule((rs as any)?.data ?? null);
    } catch {
      setRule(null);
    }
  }, [worldViewId]);

  useEffect(() => {
    loadList();
    loadRule();
  }, [loadList, loadRule]);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({
      geo_code: '',
      via_geo_codes: [],
      occurred_at: undefined,
      has_leave_at: 'N',
      leave_at: undefined,
      distance_from_prev_km: 0,
      travel_mode: 'walk',
      travel_mode_desc: '',
      move_purpose: '',
      stay_leave_intent_score: 0,
      intent_reason: '',
      stay_cost_score: 0,
      leave_cost_score: 0,
      stay_cost_reason: '',
      leave_cost_reason: '',
      desired_geo_codes: [],
      desired_reason: '',
      move_decision_factors_text: 'urgency_to_leave:0\nduty_to_stay:0\nsurvival_pressure:0',
      decision_reason: '',
      note: '',
    });
    setModalOpen(true);
  };

  const openEdit = (row: IRolePositionRecord) => {
    setEditing(row);
    form.setFieldsValue({
      geo_code: row.geo_code,
      via_geo_codes: row.via_geo_codes ?? [],
      occurred_at: row.occurred_at ?? undefined,
      has_leave_at: row.leave_at == null ? 'N' : 'Y',
      leave_at: row.leave_at ?? undefined,
      distance_from_prev_km: row.distance_from_prev_km ?? 0,
      travel_mode: row.travel_mode ?? 'walk',
      travel_mode_desc: row.travel_mode_desc ?? '',
      move_purpose: row.move_purpose ?? '',
      stay_leave_intent_score: row.stay_leave_intent_score ?? 0,
      intent_reason: row.intent_reason ?? '',
      stay_cost_score: row.stay_cost_score ?? 0,
      leave_cost_score: row.leave_cost_score ?? 0,
      stay_cost_reason: row.stay_cost_reason ?? '',
      leave_cost_reason: row.leave_cost_reason ?? '',
      desired_geo_codes: row.desired_geo_codes ?? [],
      desired_reason: row.desired_reason ?? '',
      move_decision_factors_text: joinDecisionFactors(row.move_decision_factors as any),
      decision_reason: row.decision_reason ?? '',
      note: row.note ?? '',
    });
    setModalOpen(true);
  };

  const saveRule = async () => {
    if (!worldViewId || !rule) return;
    setRuleSaving(true);
    try {
      await apiCalls.updateWorldviewPositionRule(worldViewId, {
        enforcement_mode: rule.enforcement_mode,
      });
      message.success('规则已保存');
      await loadRule();
    } catch {
      message.error('保存规则失败');
    } finally {
      setRuleSaving(false);
    }
  };

  const validateRecord = async (payload: Partial<IRolePositionRecord>) => {
    const rs = await apiCalls.validateRolePosition(payload);
    return (rs as any)?.data as IRolePositionValidationResult;
  };

  const handleSubmit = async () => {
    if (!worldViewId || !roleId || !roleInfoId) return;
    try {
      const values = await form.validateFields();
      const payload: Partial<IRolePositionRecord> = {
        worldview_id: worldViewId,
        role_id: roleId,
        role_info_id: roleInfoId,
        geo_code: values.geo_code,
        occurred_at: Number(values.occurred_at),
        leave_at: values.has_leave_at === 'Y'
          ? (values.leave_at != null && values.leave_at !== '' ? Number(values.leave_at) : null)
          : null,
        distance_from_prev_km: Number(values.distance_from_prev_km || 0),
        travel_mode: values.travel_mode,
        travel_mode_desc: values.travel_mode_desc || '',
        move_purpose: values.move_purpose || '',
        stay_leave_intent_score: Number(values.stay_leave_intent_score || 0),
        intent_reason: values.intent_reason || '',
        stay_cost_score: Number(values.stay_cost_score || 0),
        leave_cost_score: Number(values.leave_cost_score || 0),
        stay_cost_reason: values.stay_cost_reason || '',
        leave_cost_reason: values.leave_cost_reason || '',
        desired_geo_codes: Array.isArray(values.desired_geo_codes) ? values.desired_geo_codes.filter(Boolean) : [],
        desired_reason: values.desired_reason || '',
        via_geo_codes: Array.isArray(values.via_geo_codes) ? values.via_geo_codes.filter(Boolean) : [],
        move_decision_factors: splitDecisionFactors(values.move_decision_factors_text),
        decision_reason: values.decision_reason || '',
        note: values.note || '',
      };
      setSubmitLoading(true);
      const validate = await validateRecord({ ...payload, id: editing?.id });
      if (validate?.level === 'block') {
        message.error('规则拦截：当前移动被判定为瞬移风险过高');
        return;
      }
      if (validate?.level === 'warn') {
        const yes = await new Promise<boolean>((resolve) => {
          Modal.confirm({
            title: '瞬移风险提示',
            content: `风险分 ${validate.risk_score}，仍要保存吗？`,
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          });
        });
        if (!yes) return;
      }
      if (editing?.id) {
        await apiCalls.updateRolePosition(editing.id, payload);
        notifyAiNovelWriteCompleted({
          source: 'role',
          action: 'UPDATE',
          api: '/role/position',
        });
        message.success('位置记录已更新');
      } else {
        await apiCalls.createRolePosition(payload);
        notifyAiNovelWriteCompleted({
          source: 'role',
          action: 'CREATE',
          api: '/role/position',
        });
        message.success('位置记录已新增');
      }
      setModalOpen(false);
      loadList();
    } catch {
      // ignore validation error
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = (row: IRolePositionRecord) => {
    if (!row.id) return;
    Modal.confirm({
      title: '确认删除',
      content: '确定删除这条位置记录吗？',
      onOk: async () => {
        try {
          await apiCalls.deleteRolePosition(row.id!);
          notifyAiNovelWriteCompleted({
            source: 'role',
            action: 'DELETE',
            api: '/role/position',
          });
          message.success('已删除');
          loadList();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const columns: ColumnsType<IRolePositionRecord> = [
    {
      title: '发生时间',
      dataIndex: 'occurred_at',
      key: 'occurred_at',
      width: 180,
      render: (v?: number) => {
        if (v == null) return '-';
        try {
          return dateFormatter.formatSecondsToDate(Number(v));
        } catch {
          return String(v);
        }
      },
    },
    {
      title: '离开时间',
      dataIndex: 'leave_at',
      key: 'leave_at',
      width: 180,
      render: (v?: number | null) => {
        if (v == null) return '-';
        try {
          return dateFormatter.formatSecondsToDate(Number(v));
        } catch {
          return String(v);
        }
      },
    },
    {
      title: '位置',
      dataIndex: 'geo_code',
      key: 'geo_code',
      width: 180,
      render: (code?: string) => {
        if (!code) return '-';
        return geoNameMap.get(String(code)) || String(code);
      },
    },
    {
      title: '移动方式',
      dataIndex: 'travel_mode',
      key: 'travel_mode',
      width: 90,
      render: (v?: string) => {
        if (!v) return '-';
        return travelModeLabelMap.get(v) || v;
      },
    },
    {
      title: '移动方式说明',
      dataIndex: 'travel_mode_desc',
      key: 'travel_mode_desc',
      width: 180,
      render: (v?: string) => (v && v.trim() ? v : '-'),
    },
    {
      title: '移动目的',
      dataIndex: 'move_purpose',
      key: 'move_purpose',
      width: 180,
      render: (v?: string) => (v && v.trim() ? v : '-'),
    },
    // {
    //   title: '目标地点',
    //   dataIndex: 'desired_geo_codes',
    //   key: 'desired_geo_codes',
    //   width: 220,
    //   render: (v?: string[]) => {
    //     if (!Array.isArray(v) || v.length === 0) return '-';
    //     return v.map((code) => geoNameMap.get(String(code)) || String(code)).join(', ');
    //   },
    // },
    {
      title: '风险',
      dataIndex: 'validation_snapshot',
      key: 'validation_snapshot',
      width: 120,
      render: (v: any) => {
        const level = v?.level || 'ok';
        if (level === 'block') return <Tag color="red">block {v?.risk_score}</Tag>;
        if (level === 'warn') return <Tag color="orange">warn {v?.risk_score}</Tag>;
        return <Tag color="green">ok {v?.risk_score ?? 0}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, row) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(row)}>编辑</Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row)}>删除</Button>
        </Space>
      ),
    },
  ];

  if (!worldViewId) return <Card title="角色位置">请先选择世界观。</Card>;
  if (!roleId || !roleInfoId) return <Card title="角色位置">请先在左侧选择角色与版本。</Card>;

  return (
    <div>
      <div className="flex flex-row justify-between items-center">
        <Title level={5} style={{ margin: 0 }}>{panelTitle}</Title>
        <Space>
          <Text type="secondary">规则模式</Text>
          <Select
            style={{ width: 120 }}
            value={rule?.enforcement_mode || 'warn'}
            onChange={(v) => setRule((prev) => ({ ...(prev || { worldview_id: worldViewId }), enforcement_mode: v as 'warn' | 'block' }))}
            options={[
              { value: 'warn', label: 'warn' },
              { value: 'block', label: 'block' },
            ]}
          />
          <Button icon={<CheckCircleOutlined />} loading={ruleSaving} onClick={saveRule}>保存规则</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增位置</Button>
        </Space>
      </div>
      <Divider size="small" />
      <Table
        rowKey="id"
        dataSource={list}
        columns={columns}
        loading={loading}
        pagination={{ total, pageSize: 20, showSizeChanger: false }}
        size="small"
      />

      <Modal
        title={editing ? '编辑位置记录' : '新增位置记录'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitLoading}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          {!timelineDef && (
            <Alert
              type="warning"
              showIcon
              message="未获取到世界观时间线定义"
              description="当前“发生时间”使用默认时间参数（1年=12月，1月=30天，1天=24小时）。建议先在世界观中配置时间线。"
              style={{ marginBottom: 12 }}
            />
          )}
          <Form.Item name="geo_code" label="当前位置 geo_code" rules={[{ required: true, message: '请选择当前位置' }]}>
            <GeoSelect worldviewId={worldViewId} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="途经点 via_geo_codes">
            <Form.List name="via_geo_codes">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {fields.map((field) => (
                    <Space key={field.key} style={{ display: 'flex' }} align="start">
                      <Form.Item {...field} style={{ marginBottom: 0, minWidth: 420 }}>
                        <GeoSelect worldviewId={worldViewId} style={{ width: '100%' }} />
                      </Form.Item>
                      <Button icon={<MinusCircleOutlined />} onClick={() => remove(field.name)} />
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                    添加途经点
                  </Button>
                </Space>
              )}
            </Form.List>
          </Form.Item>
            <Form.Item name="occurred_at" label="发生时间" rules={[{ required: true, message: '请输入发生时间' }]} style={{ flex: 1 }}>
              <NovelTimeEdit timelineDef={timelineDef || fallbackTimelineDef} debounceMs={0} />
            </Form.Item>
            <Form.Item name="has_leave_at" label="离开时间" initialValue="N" style={{ flex: 1 }}>
              <Radio.Group
                options={[
                  { value: 'N', label: '无' },
                  { value: 'Y', label: '有' },
                ]}
                optionType="button"
                buttonStyle="solid"
              />
            </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.has_leave_at !== curr.has_leave_at}>
            {({ getFieldValue }) => {
              const hasLeaveAt = getFieldValue('has_leave_at') === 'Y';
              if (!hasLeaveAt) return null;
              return (
                <Form.Item name="leave_at" label="离开时间" rules={[{ required: true, message: '请选择离开时间' }]} style={{ flex: 1 }}>
                  <NovelTimeEdit timelineDef={timelineDef || fallbackTimelineDef} debounceMs={0} />
                </Form.Item>
              );
            }}
          </Form.Item>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="distance_from_prev_km" label="与上次距离（km）" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="travel_mode" label="移动方式" style={{ flex: 1 }}>
              <Select options={travelModeOptions} />
            </Form.Item>
          </Space>
          <Form.Item name="travel_mode_desc" label="移动方式说明">
            <TextArea autoSize={{ minRows: 2 }} placeholder="例如：借道商队、夜间潜行、短距跃迁等" />
          </Form.Item>
          <Form.Item name="move_purpose" label="移动目的">
            <TextArea autoSize={{ minRows: 2 }} placeholder="例如：赴约、避险、执行任务、补给等" />
          </Form.Item>

          <Form.Item name="stay_leave_intent_score" label="离开倾向(-100) — 留驻倾向(+100)">
            <InputNumber min={-100} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="intent_reason" label="意愿原因">
            <TextArea autoSize={{ minRows: 2 }} />
          </Form.Item>

          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="stay_cost_score" label="留驻代价(0-100)" style={{ flex: 1 }}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="leave_cost_score" label="离开代价(0-100)" style={{ flex: 1 }}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="stay_cost_reason" label="留驻成本原因">
            <TextArea autoSize={{ minRows: 2 }} />
          </Form.Item>
          <Form.Item name="leave_cost_reason" label="离开成本原因">
            <TextArea autoSize={{ minRows: 2 }} />
          </Form.Item>

          <Form.Item label="想去的地方 desired_geo_codes">
            <Form.List name="desired_geo_codes">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {fields.map((field) => (
                    <Space key={field.key} style={{ display: 'flex' }} align="start">
                      <Form.Item {...field} style={{ marginBottom: 0, minWidth: 420 }}>
                        <GeoSelect worldviewId={worldViewId} style={{ width: '100%' }} />
                      </Form.Item>
                      <Button icon={<MinusCircleOutlined />} onClick={() => remove(field.name)} />
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                    添加目标地点
                  </Button>
                </Space>
              )}
            </Form.List>
          </Form.Item>
          <Form.Item name="desired_reason" label="目标原因">
            <TextArea autoSize={{ minRows: 2 }} />
          </Form.Item>

          <Form.Item name="move_decision_factors_text" label="移动决断条件（key:value 每行一条，0~100）">
            <TextArea autoSize={{ minRows: 3 }} placeholder={'urgency_to_leave:80\nduty_to_stay:20\nsurvival_pressure:60'} />
          </Form.Item>
          <Form.Item name="decision_reason" label="决断说明">
            <TextArea autoSize={{ minRows: 2 }} />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <TextArea autoSize={{ minRows: 2 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

