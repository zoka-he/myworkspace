import React, { useState, useEffect } from 'react'
import { Layout, Menu, Tabs, Card, Button, Space, Modal, Form, Input, Select, DatePicker, Divider, Typography, Tag, Row, Col, Breadcrumb, TreeSelect, Slider } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, BookOutlined, EnvironmentOutlined, TeamOutlined, UserOutlined, HomeOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons'
import type { TabsProps } from 'antd'
import dayjs from 'dayjs'
import { StoryLineList } from './storyLineView'
import { UnifiedEventView, ViewType } from './eventViews/UnifiedEventView'
import { TIMELINE_CONFIG } from './eventViews/config'
import { IWorldViewData, IStoryLine, IFactionDefData, IRoleData, IGeoStarSystemData, IGeoStarData, IGeoPlanetData, ITimelineDef, IWorldViewDataWithExtra, ITimelineEvent } from '@/src/types/IAiNoval'
import * as worldviewApiCalls from '../worldViewManage/apiCalls'
import * as eventApiCalls from './apiCalls'
import factionApiCalls from '../factionManage/apiCalls'
import roleApiCalls from '../roleManage/apiCalls'
import { loadGeoTree, type IGeoTreeItem } from '../common/geoDataUtil'
import EventEditPanel from './components/EventEditPanel'


const { Header, Sider, Content } = Layout
const { Title } = Typography

// Define types
interface WorldView extends IWorldViewDataWithExtra {}

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

function EventManager() {
  const [selectedWorld, setSelectedWorld] = useState<string>('')
  const [viewType, setViewType] = useState<ViewType>('location')
  const [selectedStoryLine, setSelectedStoryLine] = useState<string>('')
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null)
  const [isStoryLineModalVisible, setIsStoryLineModalVisible] = useState(false)
  const [storyLines, setStoryLines] = useState<IStoryLine[]>([])
  const [worldViews, setWorldViews] = useState<WorldView[]>([])
  const [editForm] = Form.useForm()
  const [storyLineForm] = Form.useForm()
  const [editingStoryLine, setEditingStoryLine] = useState<IStoryLine | null>(null)
  const [isAddingEvent, setIsAddingEvent] = useState(false)
  const [isSubmittingStoryLine, setIsSubmittingStoryLine] = useState(false)
  const [deletingStoryLine, setDeletingStoryLine] = useState<IStoryLine | null>(null)
  const [factions, setFactions] = useState<IFactionDefData[]>([])
  const [roles, setRoles] = useState<IRoleData[]>([])
  const [geoTree, setGeoTree] = useState<IGeoTreeItem<IGeoStarSystemData>[]>([])
  const [timelineDef, setTimelineDef] = useState<ITimelineDef | null>(null)
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [secondsPerPixel, setSecondsPerPixel] = useState<number>(TIMELINE_CONFIG.SECONDS_PER_PIXEL)

  // Fetch world views when component mounts
  useEffect(() => {
    const fetchWorldViews = async () => {
      try {
        const response = await worldviewApiCalls.getWorldViewList({ page: 1, limit: 100 })
        if (response.data) {
          setWorldViews(response.data)
          // 如果世界观列表不为空且当前未选择世界观，则自动选择第一个
          if (response.data.length > 0 && !selectedWorld) {
            setSelectedWorld(response.data[0].id?.toString() || '')
          }
        }
      } catch (error) {
        console.error('Failed to fetch world views:', error)
      }
    }

    fetchWorldViews()
  }, [])

  // Update timeline definition when world view changes
  useEffect(() => {
    if (!selectedWorld) {
      setTimelineDef(null)
      return
    }

    const selectedWorldView = worldViews.find(world => world.id?.toString() === selectedWorld)
    if (selectedWorldView) {
      const timelineData: ITimelineDef = {
        id: selectedWorldView.id!,
        worldview_id: selectedWorldView.id!,
        epoch: selectedWorldView.tl_epoch!,
        start_seconds: selectedWorldView.tl_start_seconds!,
        hour_length_in_seconds: selectedWorldView.tl_hour_length_in_seconds!,
        day_length_in_hours: selectedWorldView.tl_day_length_in_hours!,
        month_length_in_days: selectedWorldView.tl_month_length_in_days!,
        year_length_in_months: selectedWorldView.tl_year_length_in_months!
      }
      setTimelineDef(timelineData)
    }
  }, [selectedWorld, worldViews])

  // Fetch storylines when selected world changes
  useEffect(() => {
    const fetchStoryLines = async () => {
      if (!selectedWorld) {
        setStoryLines([])
        return
      }

      try {
        const response = await eventApiCalls.getStoryLineList(Number(selectedWorld))
        if (response.data) {
          setStoryLines(response.data)
        }
      } catch (error) {
        console.error('Failed to fetch storylines:', error)
      }
    }

    fetchStoryLines()
  }, [selectedWorld])

  // Fetch factions when selected world changes
  useEffect(() => {
    const fetchFactions = async () => {
      if (!selectedWorld) {
        setFactions([])
        return
      }

      try {
        const response = await factionApiCalls.getFactionList(Number(selectedWorld))
        if (response.data) {
          setFactions(response.data)
        }
      } catch (error) {
        console.error('Failed to fetch factions:', error)
      }
    }

    fetchFactions()
  }, [selectedWorld])

  // Fetch roles when selected world changes
  useEffect(() => {
    const fetchRoles = async () => {
      if (!selectedWorld) {
        setRoles([])
        return
      }

      try {
        const response = await roleApiCalls.getRoleList(Number(selectedWorld))
        if (response.data) {
          setRoles(response.data)
        }
      } catch (error) {
        console.error('Failed to fetch roles:', error)
      }
    }

    fetchRoles()
  }, [selectedWorld])

  // 获取地理结构树
  useEffect(() => {
    const fetchGeoTree = async () => {
      if (!selectedWorld) {
        setGeoTree([])
        return
      }
      try {
        const tree = await loadGeoTree(Number(selectedWorld))
        setGeoTree(tree)
      } catch (error) {
        console.error('Failed to fetch geo tree:', error)
      }
    }
    fetchGeoTree()
  }, [selectedWorld])

  // Fetch events when selected world or story line changes
  useEffect(() => {
    const fetchEvents = async () => {
      if (!selectedWorld) {
        setEvents([])
        return
      }

      try {
        setIsLoadingEvents(true)
        const params = {
          worldview_id: Number(selectedWorld),
          story_line_id: selectedStoryLine ? Number(selectedStoryLine) : undefined
        }
        console.log('Fetching events with params:', params)
        const response = await eventApiCalls.getEventList(params)
        console.log('API response:', response)
        if (response.data) {
          console.log('Raw events data:', response.data)
          // 检查第一个事件的数据结构
          if (response.data.length > 0) {
            console.log('First event structure:', {
              id: response.data[0].id,
              title: response.data[0].title,
              description: response.data[0].description,
              date: response.data[0].date,
              location: response.data[0].location,
              faction_ids: response.data[0].faction_ids,
              role_ids: response.data[0].role_ids,
              story_line_id: response.data[0].story_line_id,
              worldview_id: response.data[0].worldview_id
            })
          }
          // Transform the API response data into the format expected by UnifiedEventView
          const transformedEvents = response.data.map((event: ITimelineEvent) => {
            // 确保 faction_ids 和 role_ids 是数组
            const factionIds = Array.isArray(event.faction_ids) ? event.faction_ids : []
            const roleIds = Array.isArray(event.role_ids) ? event.role_ids : []

            // 获取事件相关的派系和角色名称
            const factionNames = factionIds.map(id => {
              const faction = factions.find(f => f.id === id)
              console.log('Looking up faction:', id, 'Found:', faction)
              return faction?.name || id.toString()
            })

            const characterNames = roleIds.map(id => {
              const role = roles.find(r => r.id === id)
              console.log('Looking up role:', id, 'Found:', role)
              return role?.name || id.toString()
            })

            const transformed = {
              id: event.id?.toString() || '',
              title: event.title || '',
              description: event.description || '',
              date: event.date || 0,
              location: event.location || '',
              faction: factionNames,
              characters: characterNames,
              storyLine: event.story_line_id?.toString() || '',
              faction_ids: factionIds,
              role_ids: roleIds
            }
            console.log('Transformed event:', transformed)
            return transformed
          })
          console.log('Final transformed events:', transformedEvents)
          setEvents(transformedEvents)
        }
      } catch (error) {
        console.error('Failed to fetch events:', error)
      } finally {
        setIsLoadingEvents(false)
      }
    }

    fetchEvents()
  }, [selectedWorld, selectedStoryLine, factions, roles])

  const filteredEvents = events.filter(event => {
    const eventStoryLine = storyLines.find(sl => sl.id?.toString() === event.storyLine)
    console.log('Filtering event:', {
      ...event,
      faction_ids: event.faction_ids,
      role_ids: event.role_ids,
      storyLine: event.storyLine
    }, 'with storyLine:', eventStoryLine)
    return (!selectedWorld || eventStoryLine?.worldview_id?.toString() === selectedWorld) &&
           (!selectedStoryLine || event.storyLine === selectedStoryLine)
  })

  const handleEventSelect = (event: TimelineEvent) => {
    console.log('Selected event:', event) // 添加日志
    // 确保事件数据包含所有必要字段
    const selectedEventData: TimelineEvent = {
      ...event,
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
      faction: event.faction || [],
      characters: event.characters || [],
      storyLine: event.storyLine,
      faction_ids: event.faction_ids || [],
      role_ids: event.role_ids || []
    }
    setSelectedEvent(selectedEventData)
    setIsAddingEvent(false)
  }

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await eventApiCalls.deleteEvent(Number(eventId))
      // 刷新事件列表
      const params = {
        worldview_id: Number(selectedWorld),
        story_line_id: selectedStoryLine ? Number(selectedStoryLine) : undefined
      }
      const response = await eventApiCalls.getEventList(params)
      if (response.data) {
        setEvents(response.data)
      }
      // 如果删除的是当前选中的事件，清除选中状态
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(null)
        editForm.resetFields()
      }
    } catch (error) {
      console.error('Failed to delete event:', error)
    }
  }

  const timelineItems: TabsProps['items'] = [
    {
      key: 'location',
      label: '地点视图',
      children: (
        <UnifiedEventView
          key={`location-${refreshKey}`}
          events={filteredEvents.map(event => ({
            ...event,
            faction: event.faction_ids?.map(id => {
              const faction = factions.find(f => f.id === id)
              return faction?.name || id.toString()
            }) || [],
            characters: event.role_ids?.map(id => {
              const role = roles.find(r => r.id === id)
              return role?.name || id.toString()
            }) || []
          }))}
          storyLines={storyLines}
          selectedEventId={selectedEvent?.id}
          onEventSelect={handleEventSelect}
          onEventDelete={handleDeleteEvent}
          viewType={viewType}
          worldViews={worldViews}
          secondsPerPixel={secondsPerPixel}
          worldview_id={Number(selectedWorld)}
        />
      ),
    },
    {
      key: 'faction',
      label: '阵营视图',
      children: (
        <UnifiedEventView
          key={`faction-${refreshKey}`}
          events={filteredEvents.map(event => ({
            ...event,
            faction: event.faction_ids?.map(id => {
              const faction = factions.find(f => f.id === id)
              return faction?.name || id.toString()
            }) || [],
            characters: event.role_ids?.map(id => {
              const role = roles.find(r => r.id === id)
              return role?.name || id.toString()
            }) || []
          }))}
          storyLines={storyLines}
          selectedEventId={selectedEvent?.id}
          onEventSelect={handleEventSelect}
          onEventDelete={handleDeleteEvent}
          viewType={viewType}
          worldViews={worldViews}
          secondsPerPixel={secondsPerPixel}
          worldview_id={Number(selectedWorld)}
        />
      ),
    },
    {
      key: 'character',
      label: '角色视图',
      children: (
        <UnifiedEventView
          key={`character-${refreshKey}`}
          events={filteredEvents.map(event => ({
            ...event,
            faction: event.faction_ids?.map(id => {
              const faction = factions.find(f => f.id === id)
              return faction?.name || id.toString()
            }) || [],
            characters: event.role_ids?.map(id => {
              const role = roles.find(r => r.id === id)
              return role?.name || id.toString()
            }) || []
          }))}
          storyLines={storyLines}
          selectedEventId={selectedEvent?.id}
          onEventSelect={handleEventSelect}
          onEventDelete={handleDeleteEvent}
          viewType={viewType}
          worldViews={worldViews}
          secondsPerPixel={secondsPerPixel}
          worldview_id={Number(selectedWorld)}
        />
      ),
    },
  ]

  const handleWorldSelect = (worldId: string) => {
    setSelectedWorld(worldId)
    setSelectedStoryLine('') // 重置故事线选择
  }

  const handleStoryLineSelect = (storyLineId: string) => {
    setSelectedStoryLine(storyLineId)
  }

  const handleAddEvent = () => {
    setIsAddingEvent(true)
    setSelectedEvent(null)
  }

  const handleAddStoryLine = () => {
    setIsStoryLineModalVisible(true)
  }

  const handleEditStoryLine = (storyLine: IStoryLine) => {
    setEditingStoryLine(storyLine)
    storyLineForm.setFieldsValue(storyLine)
    setIsStoryLineModalVisible(true)
  }

  const handleStoryLineModalOk = async () => {
    try {
      setIsSubmittingStoryLine(true)
      const values = await storyLineForm.validateFields()
      const storyLineData: IStoryLine = {
        ...values,
        worldview_id: Number(selectedWorld),
        id: editingStoryLine?.id
      }

      await eventApiCalls.createOrUpdateStoryLine(storyLineData)
      
      // 关闭弹窗并重置表单
      setIsStoryLineModalVisible(false)
      setEditingStoryLine(null)
      storyLineForm.resetFields()

      // 刷新故事线列表
      const updatedResponse = await eventApiCalls.getStoryLineList(Number(selectedWorld))
      if (updatedResponse?.data) {
        setStoryLines(updatedResponse.data)
        // 如果正在编辑的故事线被选中，更新选中状态
        if (editingStoryLine?.id) {
          setSelectedStoryLine(editingStoryLine.id.toString())
        }
      }
    } catch (error) {
      console.error('Failed to save storyline:', error)
      // 可以在这里添加错误提示
    } finally {
      setIsSubmittingStoryLine(false)
    }
  }

  const handleDeleteStoryLine = async (storyLineId: string) => {
    const storyLine = storyLines.find(line => line.id?.toString() === storyLineId)
    if (storyLine) {
      setDeletingStoryLine(storyLine)
    }
  }

  const handleConfirmDeleteStoryLine = async () => {
    if (!deletingStoryLine?.id) return

    try {
      await eventApiCalls.deleteStoryLine(Number(deletingStoryLine.id))
      // 刷新故事线列表
      const response = await eventApiCalls.getStoryLineList(Number(selectedWorld))
      if (response?.data) {
        setStoryLines(response.data)
        // 如果删除的是当前选中的故事线，清除选中状态
        if (selectedStoryLine === deletingStoryLine.id.toString()) {
          setSelectedStoryLine('')
        }
      }
    } catch (error) {
      console.error('Failed to delete storyline:', error)
    } finally {
      setDeletingStoryLine(null)
    }
  }

  const handleEditPanelSave = async (values: any) => {
    try {
      console.log('Received form values:', values) // 添加日志
      const eventData: ITimelineEvent = {
        id: selectedEvent?.id ? Number(selectedEvent.id) : 0,
        title: values.title,
        description: values.description,
        date: values.date,
        location: values.location,
        faction_ids: values.faction?.map(Number) || [],
        role_ids: values.characters?.map(Number) || [],
        story_line_id: Number(values.storyLine),
        worldview_id: Number(selectedWorld)
      }

      console.log('Saving event data:', eventData) // 添加日志
      await eventApiCalls.createOrUpdateEvent(eventData)
      
      // 刷新事件列表
      const params = {
        worldview_id: Number(selectedWorld),
        story_line_id: selectedStoryLine ? Number(selectedStoryLine) : undefined
      }
      const response = await eventApiCalls.getEventList(params)
      if (response.data) {
        // Transform the API response data into the format expected by UnifiedEventView
        const transformedEvents = response.data.map((event: ITimelineEvent) => {
          // 确保 faction_ids 和 role_ids 是数组
          const factionIds = Array.isArray(event.faction_ids) ? event.faction_ids : []
          const roleIds = Array.isArray(event.role_ids) ? event.role_ids : []

          // 获取事件相关的派系和角色名称
          const factionNames = factionIds.map(id => {
            const faction = factions.find(f => f.id === id)
            return faction?.name || id.toString()
          })

          const characterNames = roleIds.map(id => {
            const role = roles.find(r => r.id === id)
            return role?.name || id.toString()
          })

          return {
            id: event.id?.toString() || '',
            title: event.title || '',
            description: event.description || '',
            date: event.date || 0,
            location: event.location || '',
            faction: factionNames,
            characters: characterNames,
            storyLine: event.story_line_id?.toString() || '',
            faction_ids: factionIds,
            role_ids: roleIds
          }
        })
        setEvents(transformedEvents)
        setRefreshKey(prev => prev + 1) // 强制视图刷新
      }

      // 关闭编辑面板
      setIsAddingEvent(false)
      setSelectedEvent(null)
      editForm.resetFields()
    } catch (error) {
      console.error('Failed to save event:', error)
    }
  }

  const handleClosePanel = () => {
    setIsAddingEvent(false)
    setSelectedEvent(null)
    editForm.resetFields()
  }

  const getCurrentWorld = () => {
    return worldViews.find(world => world.id?.toString() === selectedWorld)
  }

  const getCurrentStoryLine = () => {
    return storyLines.find(line => line.id?.toString() === selectedStoryLine)
  }

  const renderBreadcrumb = () => {
    const currentWorld = getCurrentWorld()
    const currentStoryLine = getCurrentStoryLine()

    return (
      <Breadcrumb>
        <Breadcrumb.Item>
          <HomeOutlined />
          <span>事件管理</span>
        </Breadcrumb.Item>
        {currentWorld && (
          <Breadcrumb.Item>
            <span>{currentWorld.title}</span>
          </Breadcrumb.Item>
        )}
        {currentStoryLine && (
          <Breadcrumb.Item>
            <Space>
              <BookOutlined />
              <span>{currentStoryLine.name}</span>
              <Tag color={currentStoryLine.type === 'main' ? 'red' : 'blue'}>
                {currentStoryLine.type === 'main' ? '主线' : '支线'}
              </Tag>
            </Space>
          </Breadcrumb.Item>
        )}
      </Breadcrumb>
    )
  }

  const handleViewTypeChange = (key: string) => {
    setViewType(key as ViewType)
  }

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

  const handleRefresh = async () => {
    if (!selectedWorld) return

    try {
      setIsLoadingEvents(true)
      const params = {
        worldview_id: Number(selectedWorld),
        story_line_id: selectedStoryLine ? Number(selectedStoryLine) : undefined
      }
      const response = await eventApiCalls.getEventList(params)
      if (response.data) {
        // Transform the API response data into the format expected by UnifiedEventView
        const transformedEvents = response.data.map((event: ITimelineEvent) => {
          // 获取事件相关的派系和角色名称
          const factionNames = event.faction_ids?.map(id => {
            const faction = factions.find(f => f.id === id)
            return faction?.name || id.toString()
          }) || []

          const characterNames = event.role_ids?.map(id => {
            const role = roles.find(r => r.id === id)
            return role?.name || id.toString()
          }) || []

          return {
            id: event.id?.toString() || '',
            title: event.title || '',
            description: event.description || '',
            date: event.date || 0,
            location: event.location || '',
            faction: factionNames,
            characters: characterNames,
            storyLine: event.story_line_id?.toString() || '',
            faction_ids: event.faction_ids,
            role_ids: event.role_ids
          }
        })
        setEvents(transformedEvents)
        setRefreshKey(prev => prev + 1)
      }
    } catch (error) {
      console.error('Failed to refresh events:', error)
    } finally {
      setIsLoadingEvents(false)
    }
  }

  return (
    <Layout style={{ height: '100%', padding: '0 0 10px 0' }}>
      <Sider width={250} theme="light" style={{ height: '100%', overflow: 'auto' }}>
        <div style={{ padding: '16px' }}>
          <Title level={5}>世界观选择</Title>
          <Select
            style={{ width: '100%', marginBottom: '16px' }}
            placeholder="请选择世界观"
            value={selectedWorld}
            onChange={handleWorldSelect}
          >
            {worldViews.map(world => (
              <Select.Option key={world.id} value={world.id?.toString()}>
                {world.title}
              </Select.Option>
            ))}
          </Select>

          <StoryLineList
            storyLines={storyLines}
            selectedWorld={selectedWorld}
            selectedStoryLine={selectedStoryLine}
            onStoryLineSelect={handleStoryLineSelect}
            onStoryLineEdit={handleEditStoryLine}
            onStoryLineDelete={handleDeleteStoryLine}
            onAddStoryLine={() => {
              if (!selectedWorld) {
                return
              }
              setEditingStoryLine(null)
              setIsStoryLineModalVisible(true)
            }}
            disabled={!selectedWorld}
          />
        </div>
      </Sider>

      <Layout style={{ height: '100%' }}>
        <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            {renderBreadcrumb()}
            {selectedStoryLine && (
              <Button onClick={() => setSelectedStoryLine('')}>
                清除故事线筛选
              </Button>
            )}
          </Space>
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleRefresh}
              loading={isLoadingEvents}
            >
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddEvent}>
              添加事件
            </Button>
          </Space>
        </Header>
        <Content style={{ padding: '16px 16px 32px 16px', height: 'calc(100% - 64px)', overflow: 'auto' }}>
          {selectedWorld ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ padding: '0 20px', marginBottom: '10px' }}>
                <Slider
                  min={TIMELINE_CONFIG.SCALE_RANGE.MIN}
                  max={TIMELINE_CONFIG.SCALE_RANGE.MAX}
                  value={secondsPerPixel}
                  onChange={setSecondsPerPixel}
                  tooltip={{
                    formatter: (value) => `1像素 = ${value}秒`
                  }}
                />
              </div>
              <Tabs items={timelineItems} onChange={handleViewTypeChange} />
            </Space>
          ) : (
            <div style={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center',
              color: '#999',
              fontSize: '16px'
            }}>
              <BookOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
              <div>请先选择一个世界观</div>
            </div>
          )}
        </Content>
      </Layout>

      <Sider width={350} theme="light" style={{ height: '100%', borderLeft: '1px solid #f0f0f0', overflow: 'auto' }}>
        <EventEditPanel
          selectedEvent={selectedEvent}
          isAddingEvent={isAddingEvent}
          onClose={handleClosePanel}
          onSave={handleEditPanelSave}
          storyLines={storyLines}
          selectedWorld={selectedWorld}
          geoTree={geoTree}
          factions={factions}
          roles={roles}
          timelineDef={timelineDef!}
        />
      </Sider>

      <Modal
        title={editingStoryLine ? '编辑故事线' : '添加故事线'}
        open={isStoryLineModalVisible}
        onOk={handleStoryLineModalOk}
        onCancel={() => {
          setIsStoryLineModalVisible(false)
          setEditingStoryLine(null)
          storyLineForm.resetFields()
        }}
        confirmLoading={isSubmittingStoryLine}
      >
        <Form form={storyLineForm} layout="vertical">
          <Form.Item
            name="name"
            label="故事线名称"
            rules={[{ required: true, message: '请输入故事线名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="故事线描述"
            rules={[{ required: true, message: '请输入故事线描述' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="type"
            label="故事线类型"
            rules={[{ required: true, message: '请选择故事线类型' }]}
          >
            <Select>
              <Select.Option value="main">主线剧情</Select.Option>
              <Select.Option value="side">支线剧情</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="删除确认"
        open={!!deletingStoryLine}
        onOk={handleConfirmDeleteStoryLine}
        onCancel={() => setDeletingStoryLine(null)}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除故事线 "{deletingStoryLine?.name}" 吗？</p>
        <p style={{ color: '#ff4d4f' }}>删除后将无法恢复，请谨慎操作。</p>
      </Modal>
    </Layout>
  )
}

export default EventManager
