import { useState, useEffect } from 'react'
import { List, Button, Modal, Form, Input, Select, message, Tag, Empty, Typography, Col, Row, TreeSelect } from 'antd'
import { IFactionDefData, IWorldViewData, IFactionRelation } from '@/src/types/IAiNoval'
import styles from './factionRelationPanel.module.scss'
import apiCalls from '../apiCalls'


const DEFAULT_RELATION_STRENGTHS: Record<IFactionRelation['relation_type'], number> = {
  ally: 90,        // 盟友关系默认强度高
  enemy: 20,       // 敌对关系默认强度低
  neutral: 50,     // 中立关系默认强度中等
  vassal: 70,      // 附庸关系默认强度较高
  overlord: 80,    // 宗主关系默认强度高
  rival: 30,       // 竞争对手关系默认强度较低
  protector: 85,   // 保护者关系默认强度高
  dependent: 60,   // 依附者关系默认强度中等偏上
  war: 0          // 宣战状态关系强度为0
}

interface FactionRelationPanelProps {
  worldviewData: IWorldViewData[]
  currentFaction?: IFactionDefData | null
  factions: IFactionDefData[]
  onRelationChange?: () => void
}

const RELATION_TYPE_COLORS: Record<IFactionRelation['relation_type'], string> = {
  ally: 'success',
  enemy: 'error',
  neutral: 'default',
  vassal: 'warning',
  overlord: 'processing',
  rival: 'error',
  protector: 'success',
  dependent: 'warning',
  war: 'error'
}

const getStrengthBarColor = (strength: number) => {
  if (strength <= 30) return '#ff4d4f'  // 恶劣
  if (strength <= 70) return '#faad14'  // 一般
  return '#52c41a'                      // 良好
}

const getStrengthText = (strength: number) => {
  if (strength <= 30) return '恶劣'
  if (strength <= 70) return '一般'
  return '良好'
}

interface TreeNode {
  title: string
  value: number
  key: number
  children: TreeNode[]
}

export function FactionRelationPanel({ worldviewData, currentFaction, factions, onRelationChange }: FactionRelationPanelProps) {
  const [relations, setRelations] = useState<IFactionRelation[]>([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [editingRelation, setEditingRelation] = useState<IFactionRelation | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (currentFaction?.worldview_id && currentFaction?.id) {
      fetchRelations()
    } else {
      setRelations([])
    }
  }, [currentFaction?.worldview_id, currentFaction?.id])

  const fetchRelations = async () => {
    if (!currentFaction?.worldview_id || !currentFaction?.id) return
    
    try {
      setLoading(true)
      const response = await apiCalls.getFactionRelationList(currentFaction.worldview_id, currentFaction.id)
      setRelations(response.data || [])
    } catch (error) {
      message.error('获取关系列表失败')
      console.error('Failed to fetch relations:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!currentFaction) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <Empty description="请先选择一个阵营" />
        </div>
      </div>
    )
  }

  const getRelationTypeText = (type: IFactionRelation['relation_type']) => {
    const typeMap: Record<IFactionRelation['relation_type'], string> = {
      ally: '盟友',
      enemy: '敌对',
      neutral: '中立',
      vassal: '附庸',
      overlord: '宗主',
      rival: '竞争对手',
      protector: '保护者',
      dependent: '依附者',
      war: '宣战'
    }
    return typeMap[type]
  }

  const handleAdd = () => {
    setEditingRelation(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (relation: IFactionRelation) => {
    setEditingRelation(relation)
    form.setFieldsValue(relation)
    setIsModalVisible(true)
  }
  const handleDelete = async (id: number | undefined) => {
    if (!id) return

    try {
      await apiCalls.deleteFactionRelation(id)
      await fetchRelations()
      message.success('删除成功')
      onRelationChange?.()
    } catch (error) {
      message.error('删除失败')
      console.error('Failed to delete relation:', error)
    }
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      
      // 检查必要字段
      if (!currentFaction?.id) {
        message.error('当前阵营ID不能为空')
        return
      }
      if (!currentFaction?.worldview_id) {
        message.error('当前世界观ID不能为空')
        return
      }
      if (!values.target_faction_id) {
        message.error('请选择对象阵营')
        return
      }
      if (!values.relation_type) {
        message.error('请选择关系类型')
        return
      }

      const relationStrength = Number(values.relation_strength)
      if (isNaN(relationStrength) || relationStrength < 0 || relationStrength > 100) {
        message.error('关系强度必须是0-100之间的数字')
        return
      }

      const relationData: IFactionRelation = {
        worldview_id: currentFaction.worldview_id,
        source_faction_id: currentFaction.id,
        target_faction_id: values.target_faction_id,
        relation_type: values.relation_type,
        relation_strength: relationStrength,
        description: values.description || ''
      }

      if (editingRelation) {
        // 更新现有关系
        try {
          await apiCalls.updateFactionRelation({
            ...relationData,
            id: editingRelation.id
          })
          await fetchRelations()
          message.success('更新成功')
        } catch (error) {
          message.error('更新失败')
          console.error('Failed to update relation:', error)
          return
        }
      } else {
        // 添加新关系
        try {
          await apiCalls.addFactionRelation(relationData)
          await fetchRelations()
          message.success('添加成功')
        } catch (error) {
          message.error('添加失败')
          console.error('Failed to add relation:', error)
          return
        }
      }
      setIsModalVisible(false)
      onRelationChange?.()
    } catch (error) {
      console.error('表单验证失败:', error)
    }
  }

  const handleRelationTypeChange = (value: IFactionRelation['relation_type']) => {
    form.setFieldValue('relation_strength', DEFAULT_RELATION_STRENGTHS[value])
  }

  const getFactionTreeData = (): TreeNode[] => {
    // 创建阵营树形数据
    const buildTree = (items: IFactionDefData[], parentId: number | null = null): TreeNode[] => {
      return items
        .filter(item => item && item.parent_id === parentId && item.id !== currentFaction?.id)
        .map(item => {
          if (!item || typeof item.id === 'undefined') {
            return null
          }
          return {
            title: item.name || '未命名阵营',
            value: item.id,
            key: item.id,
            children: buildTree(items, item.id)
          }
        })
        .filter((node): node is TreeNode => node !== null)
    }

    return buildTree(factions)
  }

  return (
    <div className={styles.container}>
      <List
        header={
          <Row justify="space-between" align="middle">
            <Col>
              <Typography.Title level={5}>{currentFaction?.name ?? '未知'} - 关系列表</Typography.Title>
            </Col>
            <Col>
              <Button type="primary" onClick={handleAdd} size="small">
                添加关系
              </Button>
            </Col>
          </Row>
        }
        dataSource={relations || []}
        className={styles.list}
        size="small"
        loading={loading}
        rowKey={(record) => record?.id?.toString() || Math.random().toString()}
        renderItem={(item) => {
          if (!item) return null;
          return (
            <List.Item
              key={item.id?.toString() || Math.random().toString()}
              className={styles.listItem}
            >
              <div className={styles.content}>
                <div className={styles.grid}>
                  <div className={styles.headerRow}>
                    <div className={styles.title}>
                      <Tag color={RELATION_TYPE_COLORS[item.relation_type]} style={{ marginRight: 8 }}>
                        {getRelationTypeText(item.relation_type)}
                      </Tag>
                      {factions.find(f => f.id === item.target_faction_id)?.name ?? String(item.target_faction_id)}
                    </div>
                    <div className={styles.actions}>
                      <Button type="link" size="small" onClick={() => handleEdit(item)}>编辑</Button>
                      <Button type="link" size="small" danger onClick={() => handleDelete(item?.id)}>删除</Button>
                    </div>
                  </div>
                  <div className={styles.relationInfo}>
                    <div className={styles.relationStrength}>
                      <span className={styles.label}>关系强度</span>
                      <div className={styles.strengthBar}>
                        <div 
                          className={styles.strengthFill}
                          style={{ 
                            width: `${item.relation_strength}%`,
                            backgroundColor: getStrengthBarColor(item.relation_strength)
                          }}
                        />
                      </div>
                      <span style={{ color: getStrengthBarColor(item.relation_strength) }}>
                        {item.relation_strength} ({getStrengthText(item.relation_strength)})
                      </span>
                    </div>
                  </div>
                  {item.description && (
                    <div className={styles.description}>
                      {item.description}
                    </div>
                  )}
                </div>
              </div>
            </List.Item>
          )
        }}
        pagination={{
          pageSize: 10,
          size: 'small',
          className: styles.pagination
        }}
      />

      <Modal
        title={editingRelation ? '编辑阵营关系' : '添加阵营关系'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="当前世界观"
              >
                <Input 
                  value={worldviewData.find(w => w.id === currentFaction?.worldview_id)?.title || '未知'} 
                  disabled 
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="当前阵营"
              >
                <Input 
                  value={currentFaction?.name || '未知'} 
                  disabled 
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="target_faction_id"
            label="对象阵营"
            rules={[{ required: true, message: '请选择对象阵营' }]}
          >
            <TreeSelect
              treeData={getFactionTreeData()}
              placeholder="请选择对象阵营"
              treeDefaultExpandAll
              showSearch
              allowClear
              treeNodeFilterProp="title"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="relation_type"
            label="对象阵营与当前阵营关系"
            tooltip="对方是我方的？或对方对我方做了什么？"
            rules={[{ required: true, message: '请选择关系类型' }]}
          >
            <Select onChange={handleRelationTypeChange}>
              <Select.Option value="ally">盟友</Select.Option>
              <Select.Option value="enemy">敌对</Select.Option>
              <Select.Option value="neutral">中立</Select.Option>
              <Select.Option value="vassal">附庸</Select.Option>
              <Select.Option value="overlord">宗主</Select.Option>
              <Select.Option value="rival">竞争对手</Select.Option>
              <Select.Option value="protector">保护者</Select.Option>
              <Select.Option value="dependent">依附者</Select.Option>
              <Select.Option value="war">宣战</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="relation_strength"
            label="关系强度（0-100，0=关系恶劣，50=关系一般，100=关系良好）"
            rules={[
              { required: true, message: '请输入关系强度' },
              { 
                type: 'number',
                transform: (value) => Number(value),
                min: 0,
                max: 100,
                message: '关系强度必须在0-100之间'
              }
            ]}
          >
            <Input type="number" min={0} max={100} />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
