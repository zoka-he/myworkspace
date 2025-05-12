import React, { useEffect } from 'react'
import { Form, Input, TreeSelect, Select, Button, Divider } from 'antd'
import { SaveOutlined, CloseOutlined } from '@ant-design/icons'
import { IStoryLine, IFactionDefData, IRoleData, IGeoStarSystemData, IGeoStarData, IGeoPlanetData, ITimelineDef } from '@/src/types/IAiNoval'
import { type IGeoTreeItem } from '../../common/geoDataUtil'
import NovelTimeEdit from './NovelTimeEdit'

interface TimelineEvent {
  id: string
  title: string
  description: string
  date: number // seconds
  location: string
  faction: string[]
  characters: string[]
  storyLine: string
  faction_ids?: number[]
  role_ids?: number[]
}

interface EventEditPanelProps {
  selectedEvent: TimelineEvent | null
  isAddingEvent: boolean
  onClose: () => void
  onSave: (values: any) => void
  storyLines: IStoryLine[]
  selectedWorld: string
  geoTree: IGeoTreeItem<IGeoStarSystemData>[]
  factions: IFactionDefData[]
  roles: IRoleData[]
  timelineDef: ITimelineDef
}

function EventEditPanel({
  selectedEvent,
  isAddingEvent,
  onClose,
  onSave,
  storyLines,
  selectedWorld,
  geoTree,
  factions,
  roles,
  timelineDef
}: EventEditPanelProps) {
  const [form] = Form.useForm()

  // Reset form when isAddingEvent changes
  useEffect(() => {
    if (isAddingEvent) {
      form.resetFields()
      form.setFieldsValue({
        date: 0,
        faction: [],
        characters: [],
        title: '',
        description: '',
        location: undefined,
        storyLine: undefined
      })
    }
  }, [isAddingEvent, form])

  // Update form when selectedEvent changes
  useEffect(() => {
    if (selectedEvent) {
      console.log('Updating form with selected event:', selectedEvent)
      form.setFieldsValue({
        ...selectedEvent,
        date: selectedEvent.date || 0,
        faction: selectedEvent.faction_ids || [],
        characters: selectedEvent.role_ids || []
      })
    }
  }, [selectedEvent, form])

  // 构建阵营树形数据
  const getFactionTreeData = () => {
    interface TreeNode {
      title: string
      value: string
      children?: TreeNode[]
    }

    const buildTree = (parentId: number | null = null): TreeNode[] => {
      return factions
        .filter(faction => faction.parent_id === parentId)
        .map(faction => ({
          title: faction.name || '未命名阵营',
          value: faction.id?.toString() || '',
          children: buildTree(faction.id)
        }))
    }

    return buildTree()
  }

  // 构建角色树形数据
  const getRoleTreeData = () => {
    return roles.map(role => ({
      title: role.name || '未命名角色',
      value: role.id?.toString() || ''
    }))
  }

  // 构建地理树形数据
  const getGeoTreeData = () => {
    const convertToTreeData = (item: IGeoTreeItem<IGeoStarSystemData | IGeoStarData | IGeoPlanetData>): any => {
      const node = {
        title: item.title,
        value: item.key,
        children: item.children?.map(convertToTreeData)
      }
      return node
    }
    return geoTree.map(convertToTreeData)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      console.log('Form values:', values)
      onSave({
        ...values,
        date: values.date || 0,
        faction: values.faction || [],
        characters: values.characters || [],
        worldview_id: Number(selectedWorld)
      })
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  return (
    <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{isAddingEvent ? '添加事件' : '事件详情'}</h3>
        {(selectedEvent || isAddingEvent) && (
          <Button 
            type="text" 
            icon={<CloseOutlined />} 
            onClick={onClose}
            style={{ padding: '4px' }}
          />
        )}
      </div>
      <Divider style={{ margin: '12px 0' }} />
      {(selectedEvent || isAddingEvent) ? (
        <Form
          form={form}
          layout="vertical"
          style={{ flex: 1, overflow: 'auto' }}
          initialValues={selectedEvent ? {
            ...selectedEvent,
            date: selectedEvent.date || 0,
            faction: selectedEvent.faction_ids || [],
            characters: selectedEvent.role_ids || []
          } : {
            date: 0,
            faction: [],
            characters: []
          }}
        >
          <Form.Item
            name="title"
            label="事件标题"
            rules={[{ required: true, message: '请输入事件标题' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="事件描述"
            rules={[{ required: true, message: '请输入事件描述' }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item
            name="date"
            label="发生时间"
            rules={[{ required: true, message: '请选择发生时间' }]}
          >
            <NovelTimeEdit timelineDef={timelineDef} />
          </Form.Item>
          <Form.Item
            name="location"
            label="发生地点"
            rules={[{ required: true, message: '请选择发生地点' }]}
          >
            <TreeSelect
              treeData={getGeoTreeData()}
              placeholder="请选择发生地点"
              allowClear
              treeDefaultExpandAll
              showSearch
              treeNodeFilterProp="title"
            />
          </Form.Item>
          <Form.Item
            name="faction"
            label="相关阵营"
          >
            <TreeSelect
              treeData={getFactionTreeData()}
              placeholder="请选择相关阵营"
              allowClear
              multiple
              treeDefaultExpandAll
              showSearch
              treeNodeFilterProp="title"
            />
          </Form.Item>
          <Form.Item
            name="characters"
            label="相关角色"
          >
            <TreeSelect
              treeData={getRoleTreeData()}
              placeholder="请选择相关角色"
              allowClear
              multiple
              treeDefaultExpandAll
              showSearch
              treeNodeFilterProp="title"
            />
          </Form.Item>
          <Form.Item
            name="storyLine"
            label="所属故事线"
            rules={[{ required: true, message: '请选择所属故事线' }]}
          >
            <Select>
              {storyLines
                .filter(line => line.worldview_id?.toString() === selectedWorld)
                .map(line => (
                  <Select.Option key={line.id} value={line.id?.toString()}>
                    {line.name}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
          <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} block>
              {isAddingEvent ? '创建事件' : '保存修改'}
            </Button>
          </div>
        </Form>
      ) : (
        <div style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>
          请选择一个事件查看详情
        </div>
      )}
    </div>
  )
}

export default EventEditPanel 