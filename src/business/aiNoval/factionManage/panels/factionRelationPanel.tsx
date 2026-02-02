import { useState, useEffect } from 'react'
import { List, Button, Modal, Form, Input, Select, message, Tag, Empty, Typography, Col, Row, TreeSelect } from 'antd'
import { IFactionDefData, IWorldViewData, IFactionRelation } from '@/src/types/IAiNoval'
import styles from './factionRelationPanel.module.scss'
import apiCalls from '../apiCalls'
import { D3FactionView } from './factionRelationMap'
import { useWorldViewId } from '../FactionManageContext'
import { 
  getRelationTypeText as getSharedRelationTypeText,
  RELATION_TYPE_DEFINITIONS,
  getRelationTypeDefinition,
  RelationCategory,
  getRelationTypesByCategory
} from '../utils/relationTypeMap'

// 使用科学的关系类型定义来设置默认强度
const DEFAULT_RELATION_STRENGTHS: Record<IFactionRelation['relation_type'], number> = 
  Object.fromEntries(
    Object.values(RELATION_TYPE_DEFINITIONS).map(def => [def.key, def.defaultStrength])
  ) as Record<IFactionRelation['relation_type'], number>;

interface FactionRelationPanelProps {
  worldviewData: IWorldViewData[]
  currentFaction?: IFactionDefData | null
  factions: IFactionDefData[]
  onRelationChange?: () => void
}

// 关系类型颜色映射（根据分类自动生成，使用 Partial 以支持所有类型）
const RELATION_TYPE_COLORS: Partial<Record<IFactionRelation['relation_type'], string>> = {
  // 政治关系
  ally: 'success',
  enemy: 'error',
  neutral: 'default',
  vassal: 'warning',
  overlord: 'processing',
  rival: 'error',
  protector: 'success',
  dependent: 'warning',
  confederation: 'success',
  federation: 'success',
  puppet: 'error',
  client_state: 'warning',
  exile_government: 'default',
  successor_state: 'default',
  suzerain: 'warning',
  tributary: 'warning',
  satellite: 'warning',
  buffer_state: 'default',
  // 军事关系
  war: 'error',
  ceasefire: 'default',
  armistice: 'default',
  military_cooperation: 'success',
  defense_pact: 'success',
  non_aggression: 'default',
  military_alliance: 'success',
  arms_race: 'error',
  military_observer: 'default',
  peacekeeping: 'success',
  occupation: 'error',
  liberation: 'success',
  insurgency: 'error',
  counter_insurgency: 'warning',
  // 经济关系
  trade_partner: 'success',
  economic_union: 'success',
  customs_union: 'success',
  resource_dependency: 'warning',
  market_dominance: 'warning',
  economic_exploitation: 'error',
  aid_donor: 'success',
  aid_recipient: 'default',
  sanctions: 'error',
  embargo: 'error',
  trade_war: 'error',
  economic_cooperation: 'success',
  // 社会关系
  cultural_exchange: 'success',
  immigration: 'default',
  refugee: 'default',
  diaspora: 'default',
  exile: 'default',
  cultural_dominance: 'warning',
  assimilation: 'default',
  segregation: 'error',
  integration: 'success',
  // 宗教关系
  same_faith: 'success',
  different_faith: 'default',
  heresy: 'error',
  crusade: 'error',
  jihad: 'error',
  religious_alliance: 'success',
  religious_supremacy: 'warning',
  tolerance: 'success',
  persecution: 'error',
  missionary: 'default',
  conversion: 'default',
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
  const props = { worldviewData, currentFaction, factions, onRelationChange: handleFactionRelationChange }
  const [fullRelationList, setFullRelationList] = useState<IFactionRelation[]>([])
  const [worldViewId] = useWorldViewId()

  useEffect(() => {
    updateFullRelationList()
  }, [worldViewId])

  function handleFactionRelationChange() {
    updateFullRelationList()
  }

  async function updateFullRelationList() {
    if (!worldViewId) return;

    try {
      let response = await apiCalls.getFactionRelationList(worldViewId)
      setFullRelationList(response.data || [])
    } catch (error) {
      message.error('获取全量关系列表失败')
      console.error('Failed to fetch full relation list:', error)
    }
  }

  return (
    <div className={`${styles.container} f-fit-height f-flex-col`}>
      <div className={`${styles.containerMap}`}>
        <D3FactionView factions={factions} factionRelations={fullRelationList} />
      </div>
      <div className={`${styles.controlContainer}`}>
        <FactionRelationControl {...props} />
      </div>
    </div>
  )

}

function FactionRelationControl({ worldviewData, currentFaction, factions, onRelationChange }: FactionRelationPanelProps) {
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
      <div className={`${styles.container} f-fit-height f-flex-col`}>
        <div className={`${styles.emptyState} f-flex-1`}>
          <Empty description="请先选择一个阵营" />
        </div>
      </div>
    )
  }

  // 使用共享的关系类型映射
  const getRelationTypeText = getSharedRelationTypeText

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
    const def = getRelationTypeDefinition(value);
    if (def) {
      form.setFieldValue('relation_strength', def.defaultStrength);
      // 更新关系强度输入框的提示信息
      const [min, max] = def.strengthRange;
      form.setFieldsValue({
        relation_strength: def.defaultStrength
      });
    }
  }
  
  // 获取当前选择的关系类型的强度范围提示
  const getRelationStrengthLabel = () => {
    const relationType = form.getFieldValue('relation_type');
    if (!relationType) {
      return '关系强度（0-100，0=关系恶劣，50=关系一般，100=关系良好）';
    }
    const def = getRelationTypeDefinition(relationType);
    if (def) {
      const [min, max] = def.strengthRange;
      return `关系强度（${min}-${max}，${def.label}的合理范围，默认：${def.defaultStrength}）`;
    }
    return '关系强度（0-100，0=关系恶劣，50=关系一般，100=关系良好）';
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
    <>
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
        className={`${styles.list} f-flex-1`}
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
            <Select 
              onChange={handleRelationTypeChange}
              placeholder="选择关系类型"
              optionLabelProp="label"
              showSearch
              filterOption={(input, option) => {
                const def = getRelationTypeDefinition(option?.value as IFactionRelation['relation_type']);
                return (def?.label || '').toLowerCase().includes(input.toLowerCase()) ||
                       (def?.description || '').toLowerCase().includes(input.toLowerCase());
              }}
              style={{ width: '100%' }}
            >
              {/* 政治关系 */}
              <Select.OptGroup label="政治关系">
                {getRelationTypesByCategory(RelationCategory.POLITICAL).map(type => {
                  const def = getRelationTypeDefinition(type);
                  return (
                    <Select.Option 
                      key={type} 
                      value={type}
                      label={def?.label}
                      title={def?.description}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{def?.label}</div>
                        {def?.description && (
                          <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                            {def.description}
                          </div>
                        )}
                      </div>
                    </Select.Option>
                  );
                })}
              </Select.OptGroup>
              
              {/* 军事关系 */}
              <Select.OptGroup label="军事关系">
                {getRelationTypesByCategory(RelationCategory.MILITARY).map(type => {
                  const def = getRelationTypeDefinition(type);
                  return (
                    <Select.Option 
                      key={type} 
                      value={type}
                      label={def?.label}
                      title={def?.description}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{def?.label}</div>
                        {def?.description && (
                          <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                            {def.description}
                          </div>
                        )}
                      </div>
                    </Select.Option>
                  );
                })}
              </Select.OptGroup>
              
              {/* 经济关系 */}
              <Select.OptGroup label="经济关系">
                {getRelationTypesByCategory(RelationCategory.ECONOMIC).map(type => {
                  const def = getRelationTypeDefinition(type);
                  return (
                    <Select.Option 
                      key={type} 
                      value={type}
                      label={def?.label}
                      title={def?.description}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{def?.label}</div>
                        {def?.description && (
                          <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                            {def.description}
                          </div>
                        )}
                      </div>
                    </Select.Option>
                  );
                })}
              </Select.OptGroup>
              
              {/* 社会关系 */}
              <Select.OptGroup label="社会关系">
                {getRelationTypesByCategory(RelationCategory.SOCIAL).map(type => {
                  const def = getRelationTypeDefinition(type);
                  return (
                    <Select.Option 
                      key={type} 
                      value={type}
                      label={def?.label}
                      title={def?.description}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{def?.label}</div>
                        {def?.description && (
                          <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                            {def.description}
                          </div>
                        )}
                      </div>
                    </Select.Option>
                  );
                })}
              </Select.OptGroup>
              
              {/* 宗教关系 */}
              <Select.OptGroup label="宗教关系">
                {getRelationTypesByCategory(RelationCategory.RELIGIOUS).map(type => {
                  const def = getRelationTypeDefinition(type);
                  return (
                    <Select.Option 
                      key={type} 
                      value={type}
                      label={def?.label}
                      title={def?.description}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{def?.label}</div>
                        {def?.description && (
                          <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                            {def.description}
                          </div>
                        )}
                      </div>
                    </Select.Option>
                  );
                })}
              </Select.OptGroup>
            </Select>
          </Form.Item>

          <Form.Item
            name="relation_strength"
            label={getRelationStrengthLabel()}
            rules={[
              { required: true, message: '请输入关系强度' },
              { 
                type: 'number',
                transform: (value) => Number(value),
                validator: (_, value) => {
                  const relationType = form.getFieldValue('relation_type');
                  if (!relationType) {
                    if (value < 0 || value > 100) {
                      return Promise.reject(new Error('关系强度必须在0-100之间'));
                    }
                    return Promise.resolve();
                  }
                  const def = getRelationTypeDefinition(relationType);
                  if (def) {
                    const [min, max] = def.strengthRange;
                    if (value < min || value > max) {
                      return Promise.reject(new Error(`关系强度应在${min}-${max}之间（${def.label}的合理范围）`));
                    }
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Input 
              type="number" 
              min={0} 
              max={100}
              placeholder="输入关系强度"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
      </>
  )
}
