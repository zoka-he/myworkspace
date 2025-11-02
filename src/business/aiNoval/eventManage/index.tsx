import React, { useState, useEffect } from 'react'
import { Layout, Menu, Tabs, Card, Button, Space, Modal, Form, Input, Select, DatePicker, Divider, Typography, Tag, Row, Col, Breadcrumb, TreeSelect, Slider, InputNumber, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, BookOutlined, EnvironmentOutlined, TeamOutlined, UserOutlined, HomeOutlined, CloseOutlined, ReloadOutlined, ClockCircleOutlined } from '@ant-design/icons'
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
import _ from 'lodash'
import { TimelineDateFormatter } from '../common/novelDateUtils'
import { useSelector } from 'react-redux'
import { IRootState } from '@/src/store'


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
  const [logSecondsPerPixel, setLogSecondsPerPixel] = useState<number>(Math.log(TIMELINE_CONFIG.SECONDS_PER_PIXEL))
  const [isUpdatingFromLog, setIsUpdatingFromLog] = useState(false)

  const [timelineStart, setTimelineStart] = useState<number | null>(null)
  const [timelineEnd, setTimelineEnd] = useState<number | null>(null)

  const [timeRange, setTimeRange] = useState<[number | null, number | null] | null>(null)
  const [isTimeRangeModalVisible, setIsTimeRangeModalVisible] = useState(false)
  const [timeRangeForm] = Form.useForm()
  const [dateFormatter, setDateFormatter] = useState<TimelineDateFormatter | null>(null)

  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedFactions, setSelectedFactions] = useState<string[]>([])
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([])

  const theme = useSelector((state: IRootState) => state.themeSlice.currentTheme)

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

  // 获取事件
  const fetchEvents = async () => {
    if (!selectedWorld) {
      setEvents([])
      return
    }

    try {
      setIsLoadingEvents(true)
      const params = {
        worldview_id: Number(selectedWorld),
        story_line_id: selectedStoryLine ? Number(selectedStoryLine) : undefined,
        start_date: timeRange ? timeRange[0] : undefined,
        end_date: timeRange ? timeRange[1] : undefined
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
          return transformed
        })
        setEvents(transformedEvents)
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setIsLoadingEvents(false)
    }
  }

  // 当条件更新时，加载事件
  useEffect(() => {
    fetchEvents()
  }, [selectedWorld, selectedStoryLine, factions, roles, timeRange])

  // 处理双向转换
  useEffect(() => {
    if (isUpdatingFromLog) {
      const newSecondsPerPixel = Math.exp(logSecondsPerPixel)
      if (newSecondsPerPixel !== secondsPerPixel) {
        setSecondsPerPixel(newSecondsPerPixel)
      }
    } else {
      const newLogValue = Math.log(secondsPerPixel)
      if (newLogValue !== logSecondsPerPixel) {
        setLogSecondsPerPixel(newLogValue)
      }
    }
  }, [logSecondsPerPixel, secondsPerPixel, isUpdatingFromLog])

  const handleLogScaleChange = (value: number | null) => {
    if (value !== null) {
      setIsUpdatingFromLog(true)
      setLogSecondsPerPixel(value)
    }
  }

  const handleLinearScaleChange = (value: number | null) => {
    if (value !== null) {
      setIsUpdatingFromLog(false)
      setSecondsPerPixel(value)
    }
  }

  const filteredEvents = events.filter(event => {
    const eventStoryLine = storyLines.find(sl => sl.id?.toString() === event.storyLine)
    const matchesWorld = !selectedWorld || eventStoryLine?.worldview_id?.toString() === selectedWorld
    const matchesStoryLine = !selectedStoryLine || event.storyLine === selectedStoryLine
    const matchesLocation = selectedLocations.length === 0 || selectedLocations.includes(event.location)
    const matchesFaction = selectedFactions.length === 0 || event.faction_ids?.some(id => selectedFactions.includes(id.toString()))
    const matchesCharacter = selectedCharacters.length === 0 || event.role_ids?.some(id => selectedCharacters.includes(id.toString()))
    
    return matchesWorld && matchesStoryLine && matchesLocation && matchesFaction && matchesCharacter
  })

  const handleEventSelect = (event: TimelineEvent) => {
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
        // setEvents(response.data)
        // setRefreshKey(prev => prev + 1) // 强制视图刷新

        fetchEvents();
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

  const unifiedEventViewWrapperStyle = {
    height: 'calc(100vh - 250px)',
    width: '100%',
    overflow: 'auto'
  }

  const timelineItems: TabsProps['items'] = [
    {
      key: 'location',
      label: '地点视图',
      children: (
        <div style={unifiedEventViewWrapperStyle}>
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
            enableHeightLimit={false}
            worldview_id={Number(selectedWorld)}
          />
        </div>
      ),
    },
    {
      key: 'faction',
      label: '阵营视图',
      children: (
        <div style={unifiedEventViewWrapperStyle}>
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
            enableHeightLimit={false}
            worldview_id={Number(selectedWorld)}
          />
        </div>
      ),
    },
    {
      key: 'character',
      label: '角色视图',
      children: (
        <div style={unifiedEventViewWrapperStyle}>
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
            enableHeightLimit={false}
            worldview_id={Number(selectedWorld)}
          />
        </div>
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

  // 保存故事线
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

  // 保存事件
  const handleEditPanelSave = async (values: any) => {
    try {
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
        // setEvents(transformedEvents)
        // setRefreshKey(prev => prev + 1) // 强制视图刷新

        fetchEvents();
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
        // setEvents(transformedEvents)
        // setRefreshKey(prev => prev + 1)

        fetchEvents();
      }
    } catch (error) {
      console.error('Failed to refresh events:', error)
    } finally {
      setIsLoadingEvents(false)
    }
  }

  // Update date formatter when timeline definition changes
  useEffect(() => {
    if (timelineDef) {
      setDateFormatter(new TimelineDateFormatter(timelineDef))
    } else {
      setDateFormatter(null)
    }
  }, [timelineDef])

  const handleTimeRangeEdit = () => {
    if (timeRange) {
      timeRangeForm.setFieldsValue({
        startIsBC: timeRange[0] !== null ? dateFormatter?.isBC(timeRange[0]) : undefined,
        startYear: timeRange[0] !== null ? dateFormatter?.getYear(timeRange[0]) : undefined,
        startMonth: timeRange[0] !== null ? dateFormatter?.getMonth(timeRange[0]) : undefined,
        startDay: timeRange[0] !== null ? dateFormatter?.getDay(timeRange[0]) : undefined,
        endIsBC: timeRange[1] !== null ? dateFormatter?.isBC(timeRange[1]) : undefined,
        endYear: timeRange[1] !== null ? dateFormatter?.getYear(timeRange[1]) : undefined,
        endMonth: timeRange[1] !== null ? dateFormatter?.getMonth(timeRange[1]) : undefined,
        endDay: timeRange[1] !== null ? dateFormatter?.getDay(timeRange[1]) : undefined
      })
    }
    setIsTimeRangeModalVisible(true)
  }

  const handleQuickSelectTimeRange = (days: number | 'unlimited_start' | 'unlimited_end') => {
    let selectedWorldData = worldViews.find(world => world.id?.toString() === selectedWorld)
    if (!selectedWorldData) {
      message.error('请先选择一个世界观！')
      return
    }

    if (!selectedWorldData.te_max_seconds) {
      message.error('世界观无最晚时间，可能没有设置事件，无法执行快捷计算！')
      return
    }

    let dateFormatter = TimelineDateFormatter.fromWorldViewWithExtra(selectedWorldData)

    if (days === 'unlimited_start') {
      // 不限制开始时间，只设置结束时间
      timeRangeForm.setFieldsValue({
        startIsBC: undefined,
        startYear: undefined,
        startMonth: undefined,
        startDay: undefined,
      })
    } else if (days === 'unlimited_end') {
      // 不限制结束时间，只设置开始时间
      timeRangeForm.setFieldsValue({
        endIsBC: undefined,
        endYear: undefined,
        endMonth: undefined,
        endDay: undefined
      })
    } else {
      // 保持原有的时间范围计算逻辑
      const endSeconds = selectedWorldData.te_max_seconds
      const startSeconds = endSeconds - (days * 24 * 60 * 60)

      const endDateData = dateFormatter.secondsToDateData(endSeconds)
      const startDateData = dateFormatter.secondsToDateData(startSeconds)

      timeRangeForm.setFieldsValue({
        startIsBC: startDateData.isBC,
        startYear: startDateData.year,
        startMonth: startDateData.month,
        startDay: startDateData.day,
        endIsBC: endDateData.isBC,
        endYear: endDateData.year,
        endMonth: endDateData.month,
        endDay: endDateData.day
      })
    }
  }

  const handleTimeRangeModalOk = async () => {
    try {
      const values = await timeRangeForm.validateFields()
      if (dateFormatter) {
        let startSeconds: number | undefined
        let endSeconds: number | undefined

        // 处理开始时间
        if (values.startIsBC !== undefined && values.startYear !== undefined && 
            values.startMonth !== undefined && values.startDay !== undefined) {
          const startDateStr = values.startIsBC ? '公元前' : '公元'
          const startDate = `${startDateStr}${values.startYear}年${values.startMonth}月${values.startDay}日`
          startSeconds = dateFormatter.dateToSeconds(startDate)
        }

        // 处理结束时间
        if (values.endIsBC !== undefined && values.endYear !== undefined && 
            values.endMonth !== undefined && values.endDay !== undefined) {
          const endDateStr = values.endIsBC ? '公元前' : '公元'
          const endDate = `${endDateStr}${values.endYear}年${values.endMonth}月${values.endDay}日`
          endSeconds = dateFormatter.dateToSeconds(endDate)
        }

        // 如果开始时间和结束时间都为空，则清除时间范围
        if (startSeconds === undefined && endSeconds === undefined) {
          setTimeRange(null)
        } else {
          // 如果只有一个时间点，则只使用该时间点进行筛选
          // 使用 null 来表示未设置的时间点
          setTimeRange([startSeconds ?? null, endSeconds ?? null] as [number | null, number | null])
        }
      }
      setIsTimeRangeModalVisible(false)
    } catch (error) {
      console.error('Failed to save time range:', error)
    }
  }

  const handleTimeRangeModalCancel = () => {
    setIsTimeRangeModalVisible(false)
    timeRangeForm.resetFields()
  }

  const handleClearTimeRange = () => {
    setTimeRange(null)
  }

  const handleClearStartDate = () => {
    timeRangeForm.setFieldsValue({
      startIsBC: undefined,
      startYear: undefined,
      startMonth: undefined,
      startDay: undefined
    })
  }

  const handleClearEndDate = () => {
    timeRangeForm.setFieldsValue({
      endIsBC: undefined,
      endYear: undefined,
      endMonth: undefined,
      endDay: undefined
    })
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

      {/* 中部面板 */}
      <Layout style={{ height: '100%' }}>
        {/* 中部面板头部 */}
        <Header style={{ 
          background: theme === 'light' ? '#fff' : '#222', 
          padding: '0 16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Space>
            {renderBreadcrumb()}
            {selectedStoryLine && (
              <Button onClick={() => setSelectedStoryLine('')}>
                清除故事线筛选
              </Button>
            )}
          </Space>
          <Space>
            <ClockCircleOutlined />
            <span>时间范围：</span>
            {timeRange && dateFormatter ? (
              <Space>
                {timeRange[0] !== null ? (
                  <span>{dateFormatter.formatSecondsToDate(timeRange[0])}</span>
                ) : (
                  <span>不限</span>
                )}
                <span>至</span>
                {timeRange[1] !== null ? (
                  <span>{dateFormatter.formatSecondsToDate(timeRange[1])}</span>
                ) : (
                  <span>不限</span>
                )}
                <Button type="link" icon={<EditOutlined />} onClick={handleTimeRangeEdit} />
                <Button type="link" icon={<CloseOutlined />} onClick={handleClearTimeRange} />
              </Space>
            ) : (
              <Button type="link" onClick={handleTimeRangeEdit}>设置时间范围</Button>
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

        {/* 中部面板内容 */}
        <Content style={{ padding: '16px 16px 0px 16px', height: 'calc(100% - 4px)', overflow: 'auto' }}>
          {selectedWorld ? (
            <Layout style={{ height: '100%' }}>
              <Header style={{ background: '#fff0', padding: '0 16px', height: '40px', lineHeight: '40px' }}>
                <div style={{ padding: '0 20px', marginBottom: '10px' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <label htmlFor="secondsPerPixel">时间轴缩放：</label>
                    <Slider
                      id="secondsPerPixel"
                      style={{ flex: 1, margin: '0 20px' }}
                      step={0.01}
                      min={Math.log(TIMELINE_CONFIG.SCALE_RANGE.MIN)}
                      max={Math.log(TIMELINE_CONFIG.SCALE_RANGE.MAX)}
                      value={logSecondsPerPixel}
                      onChange={handleLogScaleChange}
                    />
                    <span>1像素 = </span>
                    <InputNumber
                      min={TIMELINE_CONFIG.SCALE_RANGE.MIN}
                      max={TIMELINE_CONFIG.SCALE_RANGE.MAX}
                      value={secondsPerPixel}
                      onChange={handleLinearScaleChange}
                    />
                    <span>秒</span>
                  </div>
                </div>
              </Header>
              <Content>
                <Tabs items={timelineItems} onChange={handleViewTypeChange} />
              </Content>
            </Layout>
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

      <Sider width={350} theme="light" style={{ height: '100%', borderLeft: `1px solid var(--bg-lv2)`, overflow: 'auto' }}>
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

      {/* 故事线编辑模态框 */}
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

      {/* 删除确认模态框 */}
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

      {/* 时间范围设置模态框 */}
      <Modal
        title="设置时间范围"
        open={isTimeRangeModalVisible}
        onOk={handleTimeRangeModalOk}
        onCancel={handleTimeRangeModalCancel}
        width={600}
      >
        <Form form={timeRangeForm} layout="vertical">
          <div style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Typography.Text strong>快捷选择：</Typography.Text>
                <Button onClick={() => handleQuickSelectTimeRange(7)}>末7天</Button>
                <Button onClick={() => handleQuickSelectTimeRange(30)}>末30天</Button>
                <Button onClick={() => handleQuickSelectTimeRange(180)}>末180天</Button>
              </Space>
              <Space>
                <Typography.Text strong>特殊模式：</Typography.Text>
                <Button onClick={() => handleQuickSelectTimeRange('unlimited_start')}>不限制开始时间</Button>
                <Button onClick={() => handleQuickSelectTimeRange('unlimited_end')}>不限制结束时间</Button>
              </Space>
            </Space>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Typography.Text strong>开始时间</Typography.Text>
              <Button type="link" size="small" onClick={handleClearStartDate}>清空</Button>
            </div>
            <Row gutter={8}>
              <Col span={6}>
                <Form.Item
                  name="startIsBC"
                  rules={[
                    {
                      validator: async (_, value) => {
                        const year = timeRangeForm.getFieldValue('startYear')
                        const month = timeRangeForm.getFieldValue('startMonth')
                        const day = timeRangeForm.getFieldValue('startDay')
                        if ((value === undefined) !== (year === undefined && month === undefined && day === undefined)) {
                          throw new Error('请完整填写时间')
                        }
                      }
                    }
                  ]}
                >
                  <Select placeholder="公元前后">
                    <Select.Option value={true}>公元前</Select.Option>
                    <Select.Option value={false}>公元</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="startYear"
                  rules={[
                    {
                      validator: async (_, value) => {
                        if (value !== undefined) {
                          if (value <= 0) {
                            throw new Error('年份必须大于0')
                          }
                          const isBC = timeRangeForm.getFieldValue('startIsBC')
                          const month = timeRangeForm.getFieldValue('startMonth')
                          const day = timeRangeForm.getFieldValue('startDay')
                          if (isBC === undefined || month === undefined || day === undefined) {
                            throw new Error('请完整填写时间')
                          }
                        }
                      }
                    }
                  ]}
                >
                  <InputNumber style={{ width: '100%' }} placeholder="年" min={1} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="startMonth"
                  rules={[
                    {
                      validator: async (_, value) => {
                        if (value !== undefined) {
                          if (value < 1 || value > (timelineDef?.year_length_in_months || 12)) {
                            throw new Error(`月份必须在1-${timelineDef?.year_length_in_months || 12}之间`)
                          }
                          const isBC = timeRangeForm.getFieldValue('startIsBC')
                          const year = timeRangeForm.getFieldValue('startYear')
                          const day = timeRangeForm.getFieldValue('startDay')
                          if (isBC === undefined || year === undefined || day === undefined) {
                            throw new Error('请完整填写时间')
                          }
                        }
                      }
                    }
                  ]}
                >
                  <InputNumber style={{ width: '100%' }} placeholder="月" min={1} max={timelineDef?.year_length_in_months || 12} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="startDay"
                  rules={[
                    {
                      validator: async (_, value) => {
                        if (value !== undefined) {
                          if (value < 1 || value > (timelineDef?.month_length_in_days || 30)) {
                            throw new Error(`日期必须在1-${timelineDef?.month_length_in_days || 30}之间`)
                          }
                          const isBC = timeRangeForm.getFieldValue('startIsBC')
                          const year = timeRangeForm.getFieldValue('startYear')
                          const month = timeRangeForm.getFieldValue('startMonth')
                          if (isBC === undefined || year === undefined || month === undefined) {
                            throw new Error('请完整填写时间')
                          }
                        }
                      }
                    }
                  ]}
                >
                  <InputNumber style={{ width: '100%' }} placeholder="日" min={1} max={timelineDef?.month_length_in_days || 30} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Typography.Text strong>结束时间</Typography.Text>
              <Button type="link" size="small" onClick={handleClearEndDate}>清空</Button>
            </div>
            <Row gutter={8}>
              <Col span={6}>
                <Form.Item
                  name="endIsBC"
                  rules={[
                    {
                      validator: async (_, value) => {
                        const year = timeRangeForm.getFieldValue('endYear')
                        const month = timeRangeForm.getFieldValue('endMonth')
                        const day = timeRangeForm.getFieldValue('endDay')
                        if ((value === undefined) !== (year === undefined && month === undefined && day === undefined)) {
                          throw new Error('请完整填写时间')
                        }
                      }
                    }
                  ]}
                >
                  <Select placeholder="公元前后">
                    <Select.Option value={true}>公元前</Select.Option>
                    <Select.Option value={false}>公元</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="endYear"
                  rules={[
                    {
                      validator: async (_, value) => {
                        if (value !== undefined) {
                          if (value <= 0) {
                            throw new Error('年份必须大于0')
                          }
                          const isBC = timeRangeForm.getFieldValue('endIsBC')
                          const month = timeRangeForm.getFieldValue('endMonth')
                          const day = timeRangeForm.getFieldValue('endDay')
                          if (isBC === undefined || month === undefined || day === undefined) {
                            throw new Error('请完整填写时间')
                          }
                        }
                      }
                    }
                  ]}
                >
                  <InputNumber style={{ width: '100%' }} placeholder="年" min={1} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="endMonth"
                  rules={[
                    {
                      validator: async (_, value) => {
                        if (value !== undefined) {
                          if (value < 1 || value > (timelineDef?.year_length_in_months || 12)) {
                            throw new Error(`月份必须在1-${timelineDef?.year_length_in_months || 12}之间`)
                          }
                          const isBC = timeRangeForm.getFieldValue('endIsBC')
                          const year = timeRangeForm.getFieldValue('endYear')
                          const day = timeRangeForm.getFieldValue('endDay')
                          if (isBC === undefined || year === undefined || day === undefined) {
                            throw new Error('请完整填写时间')
                          }
                        }
                      }
                    }
                  ]}
                >
                  <InputNumber style={{ width: '100%' }} placeholder="月" min={1} max={timelineDef?.year_length_in_months || 12} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="endDay"
                  rules={[
                    {
                      validator: async (_, value) => {
                        if (value !== undefined) {
                          if (value < 1 || value > (timelineDef?.month_length_in_days || 30)) {
                            throw new Error(`日期必须在1-${timelineDef?.month_length_in_days || 30}之间`)
                          }
                          const isBC = timeRangeForm.getFieldValue('endIsBC')
                          const year = timeRangeForm.getFieldValue('endYear')
                          const month = timeRangeForm.getFieldValue('endMonth')
                          if (isBC === undefined || year === undefined || month === undefined) {
                            throw new Error('请完整填写时间')
                          }
                        }
                      }
                    }
                  ]}
                >
                  <InputNumber style={{ width: '100%' }} placeholder="日" min={1} max={timelineDef?.month_length_in_days || 30} />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Form>
      </Modal>
    </Layout>
  )
}

export default EventManager
