import { useCallback, useEffect, useMemo, useState } from 'react'
import { message } from '@/src/utils/antdAppMessage';

import { App, Card, List, Button, Space, Modal, Form, Input, Select, Slider, DatePicker, Tag, Typography, Radio, Row, Col } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { IRoleData, IWorldViewData, IRoleRelation, IRoleRelationType } from '@/src/types/IAiNoval'
import apiCalls from '../apiCalls'
import { useRoleDefList, useRoleId, useRoleInfoId, useWorldViewId, useWorldViewList } from '../roleManageContext'
import { D3RoleRelationGraph } from './d3RoleRelationGraph'


interface RoleRelationPanelProps {
  roleId?: number | null
  roleName?: string | null
  worldViews?: IWorldViewData[] | null
  worldViewId?: number | null
  candidateRoles?: IRoleData[] | null
  onUpdate?: () => void
}


let roleRelationPanelRenderCount = 0;

export function RoleRelationPanel({ 
  // roleId, 
  // roleName, 
  // worldViews, 
  // worldViewId,
  // candidateRoles,
  // onUpdate
}: RoleRelationPanelProps) {
  roleRelationPanelRenderCount++;
  console.warn('=== [RoleRelationPanel] RENDER ===', roleRelationPanelRenderCount);

  const { modal } = App.useApp();
  
  const [roleId, setRoleDefId] = useRoleId();
  const [roleList] = useRoleDefList();
  const [roleInfoId, setRoleInfoId] = useRoleInfoId();
  const [worldViewId] = useWorldViewId();
  const [worldViewList] = useWorldViewList();

  const [graphUpdateTimestamp, setGraphUpdateTimestamp] = useState(0)
  
  console.warn('=== [RoleRelationPanel] Context values ===', {
    roleId,
    roleInfoId,
    worldViewId,
    roleListLen: roleList.length
  });

  const selectedRole = useMemo(() => {
    return roleList.find(info => info.id === roleId) || null;
  }, [roleInfoId, roleList])

  const currentWorldView = useMemo(() => {
    return worldViewList.find(w => w.id === worldViewId) || null;
  }, [worldViewId, worldViewList])


  const [relations, setRelations] = useState<IRoleRelation[]>([])
  const [relationTypes, setRelationTypes] = useState<IRoleRelationType[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingRelation, setEditingRelation] = useState<IRoleRelation | null>(null)
  const [form] = Form.useForm()
  const [sliderColor, setSliderColor] = useState('#52c41a')
  const [relationStrength, setRelationStrength] = useState(50)

  const relationTypeMap = useMemo(() => {
    const m = new Map<string, IRoleRelationType>()
    for (const t of relationTypes) {
      m.set(String(t.id), {
        ...t,
        id: String(t.id),
        default_strength: Number(t.default_strength ?? 50),
        default_color: t.default_color || 'default',
      })
    }
    return m
  }, [relationTypes])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiCalls.getRoleRelationTypeList(1, 500)
        if (cancelled) return
        const list = (res?.data || []) as IRoleRelationType[]
        setRelationTypes(
          list.map((r) => ({
            ...r,
            id: String(r.id ?? ''),
            default_strength: Number(r.default_strength ?? 50),
            default_color: r.default_color || 'default',
          }))
        )
      } catch {
        if (!cancelled) message.error('加载关系类型失败')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    fetchIRoleRelations()
  }, [roleId])

  const fetchIRoleRelations = async () => {
    if (!roleId || !worldViewId) return
    
    try {
      setLoading(true)
      const response = await apiCalls.getRoleRelationList(worldViewId, roleId)
      setRelations(response.data)
    } catch (error) {
      message.error('获取角色关系失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (record: IRoleRelation) => {
    modal.confirm({
      title: '确认删除',
      content: '确定要删除这条角色关系吗？',
      onOk: async () => {
        try {
          await apiCalls.deleteRoleRelation(record)
          message.success('删除成功')
          fetchIRoleRelations()
          setGraphUpdateTimestamp(Date.now())
          // onUpdate?.()
        } catch (error) {
          message.error('删除失败')
        }
      },
    })
  }

  const handleAdd = () => {
    setEditingRelation(null)
    setSliderColor('#52c41a') // 重置为默认颜色
    setRelationStrength(50) // 重置为默认值
    setIsModalVisible(true)
  }

  const handleEdit = (record: IRoleRelation) => {
    let strength = record.relation_strength || 50;
    setEditingRelation(record)
    setRelationStrength(strength)
    // 设置初始滑块颜色
    setSliderColor(
      strength <= 30 
        ? '#ff4d4f'  // 敌对 - 红色
        : strength <= 70 
          ? '#faad14'  // 中立 - 黄色
          : '#52c41a'  // 亲密 - 绿色
    )
    form.setFieldsValue({
      ...record,
      startTime: record.start_time ? dayjs(record.start_time) : undefined,
      endTime: record.end_time ? dayjs(record.end_time) : undefined,
      isActive: record.is_active,
    })
    setIsModalVisible(true)
  }

  const handleModalOk = async () => {
    if (!roleId || !worldViewId) {
      message.error('缺少必要参数')
      return
    }

    try {
      const values = await form.validateFields()
      const submitData: IRoleRelation = {
        ...values,
        role_id: roleId,
        worldview_id: worldViewId,
        relation_strength: relationStrength,
        start_time: values.startTime?.format('YYYY-MM-DD'),
        end_time: values.endTime?.format('YYYY-MM-DD'),
        is_active: values.isActive ?? true,
      }

      if (editingRelation) {
        await apiCalls.updateRoleRelation({ ...submitData, id: editingRelation.id })
      } else {
        await apiCalls.createRoleRelation(submitData)
      }
      
      message.success(editingRelation ? '更新成功' : '添加成功')
      setIsModalVisible(false)
      form.resetFields()
      setRelationStrength(50)
      fetchIRoleRelations()
      setGraphUpdateTimestamp(Date.now())
      // onUpdate?.()
    } catch (error) {
      message.error(editingRelation ? '更新失败' : '添加失败')
    }
  }

  const handleModalCancel = () => {
    setIsModalVisible(false)
    form.resetFields()
    setEditingRelation(null)
    setSliderColor('#52c41a') // 重置为默认颜色
    setRelationStrength(50) // 重置为默认值
  }

  const renderRelationItem = (item: IRoleRelation) => {
    const typeCode = item.relation_type != null ? String(item.relation_type) : ''
    const relationType = typeCode ? relationTypeMap.get(typeCode) : undefined

    let related_role_name = (roleList || []).find(role => role.id === item.related_role_id)?.name || '未知角色';
    let relation_strength = item.relation_strength || 50;
    
    return (
      <List.Item
        actions={[]}
        style={{ padding: '8px 0' }}
      >
        <div style={{ position: 'relative' }}>
          <Space style={{ position: 'absolute', right: 0, top: 0 }}>
            <Button 
              size="small"
              type="text" 
              icon={<EditOutlined />}
              onClick={() => handleEdit(item)}
            >
              {/* 编辑 */}
            </Button>
            <Button 
              size="small"
              type="text" 
              danger 
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(item)}
            >
              {/* 删除 */}
            </Button>
          </Space>
          <List.Item.Meta
            title={
              <Space>
                <Typography.Text strong>{related_role_name}</Typography.Text>
                <Tag color={relationType?.default_color ?? 'default'}>
                  {relationType?.label ?? (typeCode || '—')}
                </Tag>
                {!item.is_active && <Tag color="default">已结束</Tag>}
              </Space>
            }
            description={
              <Space direction="vertical" size="small" style={{ width: '100%', marginTop: 4 }}>
                <div>
                  <Space align="center">
                    <Typography.Text type="secondary">关系强度：</Typography.Text>
                    <Slider
                      value={relation_strength}
                      style={{ width: 100, pointerEvents: 'none' }}
                      min={0}
                      max={100}
                      tooltip={{ formatter: null }}
                      trackStyle={{
                        background: relation_strength <= 30 
                          ? '#ff4d4f'  // 敌对 - 红色
                          : relation_strength <= 70 
                            ? '#faad14'  // 中立 - 黄色
                            : '#52c41a'  // 亲密 - 绿色
                      }}
                    />
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {relation_strength <= 30 ? '敌对' : 
                       relation_strength <= 70 ? '中立' : '亲密'}
                    </Typography.Text>
                  </Space>
                </div>
                <div>
                  <Typography.Text type="secondary">时间：</Typography.Text>
                  <Typography.Text>
                    {dayjs(item.start_time).format('YYYY-MM-DD')}
                    {item.end_time && ` 至 ${dayjs(item.end_time).format('YYYY-MM-DD')}`}
                  </Typography.Text>
                </div>
                <Typography.Text type="secondary">{item.description}</Typography.Text>
              </Space>
            }
          />
        </div>
      </List.Item>
    )
  }

  return (
    <>
      {!worldViewId ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Typography.Text type="secondary" style={{ fontSize: 16 }}>
            请选择世界观
          </Typography.Text>
        </div>
      ) : (
        <Row gutter={16}>
          <Col span={17}>
            <Card title="角色关系力导向图" size="small" styles={{ body: { height: 'calc(100vh - 220px)', padding: 0 } }}>
              <D3RoleRelationGraph
                relationTypes={relationTypes}
                updateTimestamp={graphUpdateTimestamp}
                onNodeClick={(roleId: string) => {
                  let roleDef = roleList.find(role => role.id === Number(roleId))
                  if (roleDef) {
                    setRoleDefId(roleDef.id ?? null)
                    setRoleInfoId(roleDef.version ?? null)
                  }
                }}
              />
            </Card>
          </Col>
          <Col span={7}>
            <Card
              title={roleId ? `${selectedRole?.name}的角色关系` : '角色关系'}
              extra={
                roleId ? (
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                  >
                    {/* 添加关系 */}
                  </Button>
                ) : null
              }
              size="small"
              styles={{ body: { height: 'calc(100vh - 220px)' } }}
            >
              {!roleId ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Typography.Text type="secondary" style={{ fontSize: 16 }}>
                    请选择一个角色
                  </Typography.Text>
                </div>
              ) : (
                <List
                  loading={loading}
                  dataSource={relations}
                  renderItem={renderRelationItem}
                  itemLayout="vertical"
                  split={true}
                  style={{ 
                    '--ant-list-item-padding': '8px 0',
                    '--ant-list-item-border-bottom': '1px solid #f0f0f0'
                  } as React.CSSProperties}
                />
              )}
            </Card>
          </Col>

          <Modal
            title={editingRelation ? '编辑角色关系' : '添加角色关系'}
            open={isModalVisible}
            onOk={handleModalOk}
            onCancel={handleModalCancel}
            destroyOnClose
            width={600}
          >
            <Form
              form={form}
              layout="vertical"
              onValuesChange={(changedValues, allValues) => {
                // 处理关系类型变化
                if ('relation_type' in changedValues) {
                  const code =
                    changedValues.relation_type != null ? String(changedValues.relation_type) : ''
                  const relationType = code ? relationTypeMap.get(code) : undefined
                  if (relationType) {
                    const s = relationType.default_strength
                    setRelationStrength(s)
                    setSliderColor(
                      s <= 30 ? '#ff4d4f' : s <= 70 ? '#faad14' : '#52c41a'
                    )
                  }
                }
              }}
            >
              <div style={{ display: 'flex', gap: '16px' }}>
                <Form.Item
                  name="related_role_id"
                  label="关联角色"
                  rules={[{ required: true, message: '请选择关联角色' }]}
                  style={{ flex: 1 }}
                >
                  <Select
                    placeholder="请选择关联角色"
                    showSearch
                    options={(roleList || []).filter(role => role.id !== roleId).map(role => ({
                      value: role.id,
                      label: role.name
                    }))}
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </Form.Item>
                <Form.Item
                  name="relation_type"
                  label="关系类型"
                  rules={[{ required: true, message: '请选择关系类型' }]}
                  style={{ flex: 1 }}
                >
                  <Select
                    placeholder="请选择关系类型"
                    showSearch
                    optionFilterProp="label"
                    options={relationTypes.map((t) => ({
                      value: t.id,
                      label: t.label,
                    }))}
                  />
                </Form.Item>
              </div>

              <Form.Item
                label={
                  <Space>
                    <span>关系强度</span>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      范围0~100，0为敌对，100为亲密
                    </Typography.Text>
                  </Space>
                }
              >
                <Space align="center" style={{ width: '100%', justifyContent: 'center' }}>
                  <div style={{ width: 300 }}>
                    <Slider
                      min={0}
                      max={100}
                      value={relationStrength}
                      tooltip={{ 
                        formatter: (value) => `${value}`,
                        placement: 'top'
                      }}
                      trackStyle={{
                        background: sliderColor
                      }}
                      onChange={(value) => {
                        setRelationStrength(value)
                        setSliderColor(
                          value <= 30 
                            ? '#ff4d4f'  // 敌对 - 红色
                            : value <= 70 
                              ? '#faad14'  // 中立 - 黄色
                              : '#52c41a'  // 亲密 - 绿色
                        )
                      }}
                    />
                  </div>
                  <Typography.Text type="secondary" style={{ fontSize: 12, minWidth: 40 }}>
                    {sliderColor === '#ff4d4f' ? '敌对' : 
                     sliderColor === '#faad14' ? '中立' : '亲密'}
                  </Typography.Text>
                </Space>
              </Form.Item>

              <div style={{ display: 'flex', gap: '16px' }}>
                <Form.Item
                  name="startTime"
                  label="开始时间"
                  style={{ flex: 1 }}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                  name="endTime"
                  label="结束时间"
                  style={{ flex: 1 }}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </div>

              <Form.Item
                name="isActive"
                label="关系状态"
                tooltip="选择关系是否仍在持续"
              >
                <Radio.Group>
                  <Radio value={true}>持续中</Radio>
                  <Radio value={false}>已结束</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item
                name="description"
                label="描述"
              >
                <Input.TextArea 
                  placeholder="请输入关系描述，例如：两人在第一章相遇，共同经历了..." 
                  rows={4}
                />
              </Form.Item>
            </Form>
          </Modal>
        </Row>
      )}

      <style jsx global>{`
        .ant-slider-handle {
          border-color: inherit !important;
        }
      `}</style>
    </>
  )
}