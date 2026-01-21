import { useEffect, useMemo, useState } from 'react'
import { Card, List, Button, message, Space, Modal, Form, Input, Select, Slider, DatePicker, Tag, Typography, Radio } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { IRoleData, IWorldViewData, IRoleRelation, RELATION_TYPES } from '@/src/types/IAiNoval'
import apiCalls from '../apiCalls'
import { useRoleDefList, useRoleId, useRoleInfoId, useWorldViewId, useWorldViewList } from '../roleManageContext'


interface RoleRelationPanelProps {
  roleId?: number | null
  roleName?: string | null
  worldViews?: IWorldViewData[] | null
  worldViewId?: number | null
  candidateRoles?: IRoleData[] | null
  onUpdate?: () => void
}


export function RoleRelationPanel({ 
  // roleId, 
  // roleName, 
  // worldViews, 
  // worldViewId,
  // candidateRoles,
  onUpdate
}: RoleRelationPanelProps) {
  const [roleId] = useRoleId();
  const [roleList] = useRoleDefList();
  const [roleInfoId] = useRoleInfoId();
  const [worldViewId] = useWorldViewId();
  const [worldViewList] = useWorldViewList();

  const selectedRole = useMemo(() => {
    return roleList.find(info => info.id === roleInfoId) || null;
  }, [roleInfoId])

  const currentWorldView = useMemo(() => {
    return worldViewList.find(w => w.id === worldViewId) || null;
  }, [worldViewId])


  const [relations, setRelations] = useState<IRoleRelation[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingRelation, setEditingRelation] = useState<IRoleRelation | null>(null)
  const [form] = Form.useForm()
  const [sliderColor, setSliderColor] = useState('#52c41a')
  const [relationStrength, setRelationStrength] = useState(50)

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
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条角色关系吗？',
      onOk: async () => {
        try {
          await apiCalls.deleteRoleRelation(record)
          message.success('删除成功')
          fetchIRoleRelations()
          onUpdate?.()
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
      onUpdate?.()
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
    const relationType = RELATION_TYPES.find(t => t.value === item.relation_type)

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
              type="text" 
              icon={<EditOutlined />}
              onClick={() => handleEdit(item)}
            >
              编辑
            </Button>
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(item)}
            >
              删除
            </Button>
          </Space>
          <List.Item.Meta
            title={
              <Space>
                <Typography.Text strong>{related_role_name}</Typography.Text>
                <Tag color={relationType?.color}>{relationType?.label}</Tag>
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
        <>
          {currentWorldView && (
            <div style={{ marginBottom: 16 }}>
              <Typography.Text type="secondary">
                当前世界观：{currentWorldView.title}
              </Typography.Text>
            </div>
          )}
          <Card
            title={`${selectedRole?.name}的角色关系`}
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                添加关系
              </Button>
            }
            bodyStyle={{ padding: '12px' }}
          >
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
          </Card>

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
                  const relationType = RELATION_TYPES.find(t => t.value === changedValues.relation_type)
                  if (relationType) {
                    setRelationStrength(relationType.presetStrength)
                    setSliderColor(
                      relationType.presetStrength <= 30 
                        ? '#ff4d4f'  // 敌对 - 红色
                        : relationType.presetStrength <= 70 
                          ? '#faad14'  // 中立 - 黄色
                          : '#52c41a'  // 亲密 - 绿色
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
                    options={RELATION_TYPES}
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
        </>
      )}

      <style jsx global>{`
        .ant-slider-handle {
          border-color: inherit !important;
        }
      `}</style>
    </>
  )
}