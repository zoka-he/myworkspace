import React, { useEffect, useState } from 'react'
import { Select, Space, Row, Col, Typography, Slider, Tag, Button, Modal, Form, Radio, Input, InputNumber, message, Alert, Divider } from 'antd'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { EventPool } from '../types'
import styles from './EventPoolPanel.module.scss'
import { IChapter, IStoryLine, IWorldViewDataWithExtra, ITimelineEvent, IGeoUnionData, IFactionDefData, IRoleData } from '@/src/types/IAiNoval'
import { TimelineDateFormatter } from '../../common/novelDateUtils'
import { EditOutlined, ReloadOutlined, SaveOutlined, CopyOutlined } from '@ant-design/icons'
import * as apiCalls from '../apiCalls'
import { loadGeoUnionList } from '../../common/geoDataUtil'

const { Text } = Typography

type Event = ITimelineEvent

interface EventPoolPanelProps {
  // selectedWorldContext: string
  worldViewList: IWorldViewDataWithExtra[],
  // selectedWorldViewId?: number | null
  selectedChapterId?: number | null,
  geoUnionList: IGeoUnionData[],
  factionList: IFactionDefData[],
  roleList: IRoleData[],
  // onWorldViewChange: (value?: number | null) => void
  onChapterChange: (value?: IChapter | null) => void
}

// 新增：时间线范围编辑 Modal 组件
const TimelineRangeModal = React.forwardRef(({
  onOk,
  onCancel,
  form,
  selectedWorldView,
  onChangeTimeline,
  eventPool
}: {
  onOk: () => void
  onCancel: () => void
  form: any
  selectedWorldView: IWorldViewDataWithExtra | null
  onChangeTimeline: (type: 'start' | 'end', value: number | null) => void
  eventPool: EventPool
}, ref) => {
  const [visible, setVisible] = useState(false)
  const [type, setType] = useState<'start' | 'end'>('start')
  const [initialSeconds, setInitialSeconds] = useState<number | null>(null)
  const [userDiffValue, setUserDiffValue] = useState<number | null>(null)
  const [userDiffUnit, setUserDiffUnit] = useState<'day' | 'week' | 'month' | 'year'>('day')
  
  // 暴露给父组件的接口
  React.useImperativeHandle(ref, () => ({
    open: (type: 'start' | 'end', seconds: number | null) => {
      setType(type)
      setInitialSeconds(seconds)
      setVisible(true)
    }
  }))
  React.useEffect(() => {
    if (!visible) return
    let isBC = null
    let year = null
    let month = null
    let day = null
    if (initialSeconds) {
      isBC = initialSeconds < 0
      if (selectedWorldView) {
        const timeUtil = TimelineDateFormatter.fromWorldViewWithExtra(selectedWorldView)
        let dateStruct = timeUtil.secondsToDateData(initialSeconds)
        isBC = dateStruct.isBC
        year = dateStruct.year
        month = dateStruct.month
        day = dateStruct.day
      } else {
        isBC = initialSeconds < 0
        let absValue = Math.abs(initialSeconds)
        year = Math.floor(absValue / 365)
        month = Math.floor((absValue % 365) / 30)
        day = absValue % 30
      }
    }
    form.setFieldsValue({
      era: isBC ? 'BC' : 'AD',
      year,
      month,
      day
    })
  }, [visible, initialSeconds, selectedWorldView, form])

  async function handleOk() {
    let { era, year, month, day } = form.getFieldsValue()
    if (!year && !month && !day) {
      onChangeTimeline(type, null)
      onOk()
      form.resetFields()
      setVisible(false)
      return;
    }

    await form.validateFields()

    let totalSeconds = 0
    if (selectedWorldView) {
      const timeUtil = TimelineDateFormatter.fromWorldViewWithExtra(selectedWorldView)
      totalSeconds = timeUtil.dateDataToSeconds({
        isBC: era === 'BC',
        year,
        month,
        day,
        hour: 0,
        minute: 0,
        second: 0
      })
    } else {
      totalSeconds = (era === 'BC' ? -1 : 1) * (
        year * 365 +
        month * 30 +
        day
      )
    }

    if (type === 'start') {
      const minDate = Math.min(...eventPool.selected.map(event => event.date))
      if (totalSeconds > minDate) {
        totalSeconds = minDate - 1000
        message.warning('时间线起点晚于某个已选事件，已按最早事件设置')
      }
    }

    if (type === 'end') {
      const maxDate = Math.max(...eventPool.selected.map(event => event.date))
      if (totalSeconds < maxDate) {
        totalSeconds = maxDate + 1000
        message.warning('时间线终点早于某个已选事件，已按最晚事件设置')
      }
    } 

    onChangeTimeline(type, totalSeconds)
    onOk()
    form.resetFields()
    setVisible(false)
  }

  function handleUnlimited() {
    setInitialSeconds(null)
  }

  function handleSetByLastDays(days: number) {
    let lastDateSeconds;
    if (selectedWorldView) {
      if (selectedWorldView.te_max_seconds) {
        lastDateSeconds = selectedWorldView.te_max_seconds - days * 24 * 3600
      } else {
        lastDateSeconds = null
      }
    } else {
      const now = new Date()
      const lastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      lastDateSeconds = lastDate.getTime() / 1000
    }
    setInitialSeconds(lastDateSeconds)
  }

  function handleApplyUserDiff(_userDiffUnit: 'day' | 'week' | 'month' | 'year' = userDiffUnit) {
    if (!userDiffValue) {
      message.warning('请输入用户调整单位数量')
      return
    }

    if (!_userDiffUnit) {
      message.warning('请选择用户调整单位')
      return
    }
    
    let lastDateSeconds: number = 0;
    let secondsOfUnit = 0;
    if (selectedWorldView) {
      let secondsPerHour = selectedWorldView.tl_hour_length_in_seconds || 3600;
      let hoursPerDay = selectedWorldView.tl_day_length_in_hours || 24;
      let daysPerMonth = selectedWorldView.tl_month_length_in_days || 30;
      let monthsPerYear = selectedWorldView.tl_year_length_in_months || 12;
      switch (_userDiffUnit) {
        case 'day':
          secondsOfUnit = hoursPerDay * secondsPerHour
          break
        case 'week':
          secondsOfUnit = 7 * hoursPerDay * secondsPerHour
          break
        case 'month':
          secondsOfUnit = daysPerMonth * hoursPerDay * secondsPerHour
          break
        case 'year':
          secondsOfUnit = monthsPerYear * daysPerMonth * hoursPerDay * secondsPerHour
          break
      }
      lastDateSeconds = (selectedWorldView.te_max_seconds || 0) - userDiffValue * secondsOfUnit;
    } else {
      switch (_userDiffUnit) {
        case 'day':
          secondsOfUnit = 24 * 3600
          break
        case 'week':
          secondsOfUnit = 7 * 24 * 3600
          break
        case 'month':
          secondsOfUnit = 30 * 24 * 3600
          break
        case 'year':
          secondsOfUnit = 365 * 24 * 3600
          break
      }

      const now = new Date()
      const lastDate = new Date(now.getTime() - userDiffValue * secondsOfUnit * 1000)
      lastDateSeconds = lastDate.getTime() / 1000
    }

    setInitialSeconds(lastDateSeconds)
  }

  function handleSetUserDiffUnitAndApply(unit: 'day' | 'week' | 'month' | 'year') {
    setUserDiffUnit(unit)
    handleApplyUserDiff()
  }

  return (
    <Modal
      title={type === 'start' ? '更改起点' : '更改终点'}
      open={visible}
      onOk={handleOk}
      onCancel={() => {
        onCancel()
        setVisible(false)
      }}
    >
      <div className='f-flex-two-side'>
        <Space>
          <Button onClick={() => handleSetByLastDays(7)}>末7天</Button>
          <Button onClick={() => handleSetByLastDays(30)}>末30天</Button>
          <Button onClick={() => handleSetByLastDays(180)}>末180天</Button>
        </Space>
        <Space>
          <Button onClick={handleUnlimited}>不限</Button>
        </Space>
      </div>
      <div style={{ marginTop: 10 }}>
        <Space>
          <Text>末</Text>
          {/* <Space.Compact> */}
            <InputNumber type="number" min={0} placeholder="用户调整" style={{ width: 80 }} value={userDiffValue} onChange={(value) => setUserDiffValue(value)} />
            <Button onClick={() => handleSetUserDiffUnitAndApply('day')}>天</Button>
            <Button onClick={() => handleSetUserDiffUnitAndApply('week')}>周</Button>
            <Button onClick={() => handleSetUserDiffUnitAndApply('month')}>月</Button>
            <Button onClick={() => handleSetUserDiffUnitAndApply('year')}>年</Button>
          {/* </Space.Compact> */}
          {/* <Text>-&gt;</Text> */}
          {/* <Button onClick={handleApplyUserDiff}>应用</Button> */}
        </Space>
      </div>
      <Divider />
      <Form form={form} layout="inline">
        <Form.Item name="era" label="纪元" rules={[{ required: true }]}> 
          <Radio.Group>
            <Radio value="BC">公元前</Radio>
            <Radio value="AD">公元</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="日期" style={{ marginBottom: 0 }}>
          <Space>
            <Form.Item name="year" rules={[{ required: true, type: 'number', min: 0 }]} noStyle>
              <InputNumber type="number" min={0} placeholder="年" style={{ width: 80 }} />
            </Form.Item>
            <Form.Item name="month" rules={[{ required: true, type: 'number', min: 1, max: selectedWorldView?.tl_year_length_in_months || 12 }]} noStyle>
              <InputNumber type="number" min={1} max={selectedWorldView?.tl_year_length_in_months || 12} placeholder="月" style={{ width: 60 }} />
            </Form.Item>
            <Form.Item name="day" rules={[{ required: true, type: 'number', min: 1, max: selectedWorldView?.tl_month_length_in_days || 30 }]} noStyle>
              <InputNumber type="number" min={1} max={selectedWorldView?.tl_month_length_in_days || 30} placeholder="日" style={{ width: 60 }} />
            </Form.Item>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
})

/*
1.加载流程（初始化）：
  1.1 加载世界观列表
  1.2 加载章节数据
  1.3 加载章节关联故事线
  1.4 计算章节时间范围
  1.5 加载章节关联事件

2.加载流程（章节变更）：
  2.1 加载章节数据
  2.2 加载章节关联故事线
  2.3 计算章节时间范围
  2.4 加载章节关联事件 

*/

function EventPoolPanel({
  // selectedWorldContext,
  // worldViewList,
  // selectedWorldViewId,
  selectedChapterId,
  // geoUnionList,
  // factionList,
  // roleList,
  // onWorldViewChange,
  onChapterChange
}: EventPoolPanelProps) {
  // 时间线开始时间
  const [timelineStart, setTimelineStart] = useState<number | null>(null)

  // 时间线结束时间
  const [timelineEnd, setTimelineEnd] = useState<number | null>(null)

  // 时间线表单
  const [timelineForm] = Form.useForm()

  // 故事线列表
  const [storyLineList, setStoryLineList] = useState<IStoryLine[]>([])

  // 当前选中的故事线ID列表
  const [selectedStoryLineIds, setSelectedStoryLineIds] = useState<number[]>([])

  // 时间线范围（微调）
  const [timelineAdjustment, setTimelineAdjustment] = useState<[number, number]>([0, 100])

  // 是否加载中
  const [loading, setLoading] = useState(false)

  // 事件池
  const [eventPool, setEventPool] = useState<EventPool>({ selected: [], candidate: [] })

  // 是否是第一次加载
  const [isFirstLoad, setIsFirstLoad] = useState(true)

  // 世界观列表
  const [worldViewList, setWorldViewList] = useState<IWorldViewDataWithExtra[]>([])

  // 当前选中的世界观
  const [selectedWorldView, setSelectedWorldView] = useState<IWorldViewDataWithExtra | null>(null)

  // 当前选中的世界观ID，选择器专用，fuck antd
  const [selectedWorldViewId, setSelectedWorldViewId] = useState<number | null>(null)

  // 当前选中的章节
  const [selectedChapter, setSelectedChapter] = useState<IChapter | null>(null)

  // 关联地点列表
  const [geoUnionList, setGeoUnionList] = useState<IGeoUnionData[]>([])

  // 关联阵营列表
  const [factionList, setFactionList] = useState<IFactionDefData[]>([])

  // 关联角色列表
  const [roleList, setRoleList] = useState<IRoleData[]>([])

  // 新增：时间线范围编辑 Modal 组件
  const timelineModalRef = React.useRef<{ open: (type: 'start' | 'end', seconds: number | null) => void }>(null)
  function showTimelineModal(type: 'start' | 'end', seconds: number | null) {
    timelineModalRef.current?.open(type, seconds)
  }

  // 初始加载，加载完毕后触发isFirstLoad完成事件
  useEffect(() => {
    initData();
    setIsFirstLoad(false);
  }, [])

  // 监听世界观ID变更（选择器专属事件）
  useEffect(() => {
    if (!selectedWorldViewId) {
      setSelectedWorldView(null);
      return;
    }

    const selectedWorldView = worldViewList.find(worldView => worldView.id === selectedWorldViewId);
    setSelectedWorldView(selectedWorldView || null);
  }, [selectedWorldViewId]);

  // 监听世界观变更
  useEffect(() => {
    if (selectedWorldView?.te_max_seconds) {
      setTimelineStart(selectedWorldView?.te_max_seconds - 7 * 24 * 3600);
      setTimelineEnd(selectedWorldView?.te_max_seconds);
    } else {
      setTimelineStart(0);
      setTimelineEnd(100);
    }

    // 加载故事线列表
    if (selectedWorldView?.id) {
      apiCalls.getStoryLineList(selectedWorldView.id).then(res => {
        setStoryLineList(res.data)
        if (!selectedChapter?.storyline_ids?.length) {
          setSelectedStoryLineIds(res.data.map(line => line.id))
        }
      })
    } else {
      setStoryLineList([])
      setSelectedStoryLineIds([])
    }

    // // 如果当前有选中的章节，重新加载事件
    // if (selectedChapter?.id && selectedWorldView?.id) {
    //   const [timelineAdjustmentStart, timelineAdjustmentEnd] = calculateAndSyncChapterDateRange(selectedChapter);
    //   loadChapterEvents(selectedChapter.event_ids);
    // }

    // 加载备选地点
    if (selectedWorldView?.id) {
      loadGeoUnionList(selectedWorldView.id).then(res => {
        setGeoUnionList(res);
      })
    } else {
      setGeoUnionList([]);
    }

    // 加载备选阵营
    if (selectedWorldView?.id) {
      apiCalls.loadFactionList(selectedWorldView.id).then(res => {
        setFactionList(res);
      })
    } else {
      setFactionList([]);
    }

    // 加载备选角色
    if (selectedWorldView?.id) {
      apiCalls.loadRoleList(selectedWorldView.id).then(res => {
        setRoleList(res);
      })
    } else {
      setRoleList([]);
    }


  }, [selectedWorldView])

  // 监听章节变更，包括初始化
  useEffect(() => {
    if (selectedChapterId) {
      loadChapterData();
    } else {
      // 清空事件池
      setEventPool({ selected: [], candidate: [] });
      setSelectedChapter(null);
    }
  }, [selectedChapterId])

  useEffect(() => {
    console.debug('selectedChapter?.event_ids: ', selectedChapter?.event_ids);
    loadChapterEvents(selectedChapter?.event_ids)
  }, [timelineStart, timelineEnd, selectedChapter])

  // 初始化数据
  const initData = async () => {
    const worldViewList = (await apiCalls.getWorldViewList())?.data;

    // 加载关联地点
    setWorldViewList(worldViewList);

    if (selectedChapterId) {
      const chapterData = await apiCalls.getChapterById(selectedChapterId);
      if (chapterData?.worldview_id) {
        const selectedWorldView = worldViewList.find(worldView => worldView.id === chapterData.worldview_id);
        setSelectedWorldView(selectedWorldView || null);
        setSelectedWorldViewId(selectedWorldView?.id || null);
      }
    } else {
      setSelectedWorldView(null);
      setSelectedWorldViewId(null);
    } 
  }

  const loadChapterData = async () => {
    console.debug('loadChapterData --> ', selectedChapter);

    if (!selectedChapterId) {
      console.debug('selectedChapterId is null');
      setSelectedChapter(null);
      setEventPool({ selected: [], candidate: [] });
      return;
    }

    const chapterData = await apiCalls.getChapterById(selectedChapterId);
    setSelectedChapter(chapterData);
    
    if (!chapterData) {
      console.debug('chapterData is null')
      setEventPool({ selected: [], candidate: [] });
      return
    }

    // 设置关联世界观，注意还要设置ID，antd专用
    if (!chapterData?.worldview_id) {
      console.debug('chapterData?.worldview_id is null')
      setSelectedWorldView(null)
      setSelectedWorldViewId(null)
      setEventPool({ selected: [], candidate: [] })
    } else {
      console.debug('chapterData?.worldview_id is not null')
      const newWorldView = worldViewList.find(worldView => worldView.id === chapterData.worldview_id) || null;
      setSelectedWorldView(newWorldView)
      setSelectedWorldViewId(chapterData.worldview_id)

      // 设置关联故事线
      if (chapterData?.storyline_ids?.length) {
        setSelectedStoryLineIds(chapterData.storyline_ids)
      } else {
        setSelectedStoryLineIds(storyLineList.map(line => line.id))
      }

      if (chapterData.event_line_start1) {
        setTimelineStart(chapterData.event_line_start1)
      }

      if (chapterData.event_line_end1) {
        setTimelineEnd(chapterData.event_line_end1)
      }

      setEventPool({
        selected: [],
        candidate: []
      })

      // 加载章节事件
      // loadChapterEvents(chapterData.event_ids)
    }
  }

  // 加载章节事件
  const loadChapterEvents = async (chapterEventIds?: number[]) => {
    if (!selectedWorldView?.id) {
      // message.warning('请先选择世界观')
      return
    }

    // if (!requestDateRange) {
    //   // 如果未指定请求日期范围，则使用时间线范围
    //   console.debug('requestDateRange is null, use timelineAdjustment: ', timelineAdjustment)
    //   requestDateRange = [timelineAdjustment[0], timelineAdjustment[1]]
    // }

    try {
      setLoading(true)

      // 如果时间线范围小于24小时，则将时间线范围设置为24小时
      let realEnd = timelineEnd;
      if (timelineEnd && timelineStart && timelineEnd - timelineStart < 24 * 3600) {
        realEnd = timelineStart + 24 * 3600;
      }

      const response = await apiCalls.getTimelineEventList(
        selectedWorldView.id,
        timelineStart,
        realEnd
        // requestDateRange[0],
        // requestDateRange[1]
      )

      if (response.data) {
        if (response.data.length > 10) {
          message.warning('时间段内事件密集，建议缩小筛选范围')
        }
        
        // 如果有章节的event_ids，则使用它作为已选事件，否则保留当前已选事件
        const selectedEvents = chapterEventIds && Array.isArray(chapterEventIds)
          ? response.data.filter(event => chapterEventIds.includes(event.id))
          : eventPool.selected.filter(selectedEvent => 
              response.data.some(newEvent => newEvent.id === selectedEvent.id)
            )
        
        // 过滤掉已经在已选事件中的事件作为候选事件
        const selectedEventIds = new Set(selectedEvents.map(event => event.id))
        const candidateEvents = response.data.filter(event => !selectedEventIds.has(event.id))
        
        // 更新事件池
        setEventPool({
          selected: selectedEvents.sort((a, b) => b.date - a.date),
          candidate: candidateEvents.sort((a, b) => b.date - a.date)
        })
      }
    } catch (error) {
      message.error('加载事件失败')
    } finally {
      setLoading(false)
    }
  }

  const calculateAndSyncChapterDateRange = (chapterData: IChapter) => {
    if (!chapterData) {
      setTimelineStart(0)
      setTimelineEnd(100)

      setTimelineAdjustment([0, 100])

      return [0, 100];
    }

    let timelineStart = 0;
    let timelineEnd = 100;

    if (chapterData.event_line_start1) {
      timelineStart = chapterData.event_line_start1
    } else if (selectedWorldView?.te_max_seconds) {
      timelineStart = selectedWorldView.te_max_seconds - 7 * 24 * 3600;
    }

    if (chapterData.event_line_end1) {
      timelineEnd = chapterData.event_line_end1
    } else if (selectedWorldView?.te_max_seconds) {
      timelineEnd = selectedWorldView.te_max_seconds;
    }

    setTimelineStart(timelineStart)
    setTimelineEnd(timelineEnd)

    let timelineAdjustmentStart = timelineStart;
    let timelineAdjustmentEnd = timelineEnd;

    if (chapterData.event_line_start2) {
      timelineAdjustmentStart = chapterData.event_line_start2
    }

    if (chapterData.event_line_end2) {
      timelineAdjustmentEnd = chapterData.event_line_end2
    }

    setTimelineAdjustment([timelineAdjustmentStart, timelineAdjustmentEnd])

    return [timelineAdjustmentStart, timelineAdjustmentEnd];
      
  }

  const handleDragEnd = (result: any) => {
    const { source, destination } = result

    if (!destination) return

    if (source.droppableId === destination.droppableId) {
      // 在同一事件池内重新排序
      const pool = source.droppableId === 'event-pool-selected' ? 'selected' : 'candidate'
      const events = Array.from(eventPool[pool])
      const [removed] = events.splice(source.index, 1)
      events.splice(destination.index, 0, removed)

      setEventPool({
        ...eventPool,
        [pool]: events
      })
    } else {
      // 在不同事件池之间移动
      const sourcePool = source.droppableId === 'event-pool-selected' ? 'selected' : 'candidate'
      const destPool = destination.droppableId === 'event-pool-selected' ? 'selected' : 'candidate'
      
      const sourceEvents = Array.from(eventPool[sourcePool])
      const destEvents = Array.from(eventPool[destPool])
      const [removed] = sourceEvents.splice(source.index, 1)
      destEvents.splice(destination.index, 0, removed)

      setEventPool({
        ...eventPool,
        [sourcePool]: sourceEvents,
        [destPool]: destEvents
      })
    }
  }

  // 渲染时间点
  const renderNovelDate = (date: number = 0) => {
    if (!selectedWorldView) {
      return '时间点：' + date;
    }

    const util = TimelineDateFormatter.fromWorldViewWithExtra(selectedWorldView);
    return util.formatSecondsToDate(date);
  }

  // 获取所有关联信息
  const getRelatedInfo = (events: Event[]) => {
    const locations = new Set<string>()
    const factions = new Set<number>()
    const characters = new Set<number>()

    events.forEach(event => {
      // console.log('moved event ---> ', event)
      if (event.location) locations.add(event.location)
      if (event.faction_ids) {
        event.faction_ids.forEach(id => factions.add(id))
      }
      if (event.role_ids) {
        event.role_ids.forEach(id => characters.add(id))
      }
    })

    return {
      locations: Array.from(locations),
      factions: Array.from(factions),
      characters: Array.from(characters)
    }
  }

  const saveChapterSetting = async () => {
    if (!selectedChapter) {
      message.warning('请先选择章节')
      return
    }

    if (!selectedWorldView?.id) {
      message.warning('请先选择世界观')
      return
    }

    const settingParams = {
      id: selectedChapter.id,
      worldview_id: selectedWorldView.id,
      storyline_ids: selectedStoryLineIds,
      event_ids: eventPool.selected.map(event => event.id),
      event_line_start1: timelineStart === null ? undefined : timelineStart,
      event_line_end1: timelineEnd === null ? undefined : timelineEnd,
      event_line_start2: timelineAdjustment[0],
      event_line_end2: timelineAdjustment[1]
    }

    try {
      await apiCalls.updateChapter(settingParams);
      message.success('保存章节参数成功')

      // 通知父组件章节数据已更新
      if (onChapterChange) {
        onChapterChange(selectedChapter)
      }
    } catch (error) {
      message.error('保存章节参数失败')
    }
  }

  // 渲染关联信息预览
  const renderRelatedInfo = (events: Event[]) => {
    const { locations, factions, characters } = getRelatedInfo(events)
    
    return (
      <div className={styles.relatedInfo}>
        <div className={styles.relatedInfoItem}>
          <Text strong>关联地点：</Text>
          <Space wrap>
            {locations.map(location => (
              <Tag key={location} color="blue">{geoUnionList.find(geoUnion => geoUnion.code === location)?.name}</Tag>
            ))}
          </Space>
        </div>
        <div className={styles.relatedInfoItem}>
          <Text strong>关联阵营：</Text>
          <Space wrap>
            {factions.map(faction => {
              const factionItem = factionList.find(item => item.id === faction);
              return <Tag key={faction} color="green">{factionItem?.name}</Tag>
            })}
          </Space>
        </div>
        <div className={styles.relatedInfoItem}>
          <Text strong>关联角色：</Text>
          <Space wrap>
            {characters.map(character => (
              <Tag key={character} color="purple">{roleList.find(role => role.id === character)?.name}</Tag>
            ))}
          </Space>
        </div>
      </div>
    )
  }

  // 根据筛选条件过滤事件
  const filterEvents = (events: Event[]) => {
    return events.filter(event => {
      const storyLineMatch = selectedStoryLineIds.length === 0 || selectedStoryLineIds.includes(event.story_line_id)
      return storyLineMatch
    })
  }

  // 渲染事件卡片
  const renderEventCard = (event: Event) => (
    <div className={styles.eventCard}>
      <div style={{ display: 'flex', gap: 5 }}>
        <Tag>{renderNovelDate(event.date)}</Tag>
        <Text strong>{event.title}&nbsp;</Text>
      </div>
      <Text type="secondary" className="block">
        {event.description}
      </Text>
      {renderRelatedInfo([event])}
    </div>
  )

  

  // 渲染事件线设置
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row gutter={16} className={styles.filterSection}>
          <Col span={8}>
            <Select
              style={{ width: '100%' }}
              placeholder="选择世界观"
              value={selectedWorldViewId}
              allowClear
              onClear={() => setSelectedWorldViewId(null)}
              onChange={setSelectedWorldViewId}
            >
              {worldViewList.map(context => (
                <Select.Option key={context.id} value={context.id}>
                  {context.title}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={16}>
            {/* <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="选择故事线"
              value={selectedStoryLineIds.map(id => id.toString())}
              onChange={(values: string[]) => setSelectedStoryLineIds(values.map(v => parseInt(v)))}
            >
              {storyLineList.map(line => (
                <Select.Option key={line.id} value={line.id.toString()}>
                  {line.name}
                </Select.Option>
              ))}
            </Select> */}
            <Space>
            <Text>时间线范围：</Text>
              <Button icon={<EditOutlined />} type="link" onClick={() => showTimelineModal('start', timelineStart)}>{timelineStart !== null ? renderNovelDate(timelineStart) : '不限'}</Button> - 
              <Button icon={<EditOutlined />} type="link" onClick={() => showTimelineModal('end', timelineEnd)}>{timelineEnd !== null ? renderNovelDate(timelineEnd) : '不限'}</Button>
            </Space>
            
          </Col>
        </Row>

        

        <div className="f-flex-row" style={{ width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Space>
              <Button type="primary" icon={<ReloadOutlined />} onClick={() => loadChapterEvents()} loading={loading}>加载事件</Button>
              <Button type="primary" icon={<CopyOutlined />} disabled>从上一章继承（未实现）</Button>
          </Space>
          
          {/* 章节基础信息操作 */}
          <Space align="end">
            <Button icon={<SaveOutlined />} onClick={saveChapterSetting} loading={loading}>保存配置和事件到章节</Button>
          </Space>
        </div>

        <Row gutter={16}>
          <Col span={12}>
            <div className={styles.eventPoolContainer}>
              <Text strong>已选事件</Text>
              <Droppable droppableId="event-pool-selected">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={styles.eventPool}
                  >
                    {filterEvents(eventPool.selected).map((event, index) => (
                      <Draggable
                        key={event.id.toString()}
                        draggableId={event.id.toString()}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            {renderEventCard(event)}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              {/* {renderRelatedInfo(eventPool.selected)} */}
            </div>
          </Col>

          <Col span={12}>
            <div className={styles.eventPoolContainer}>
              <Text strong>备选事件</Text>
              <Droppable droppableId="event-pool-candidate">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={styles.eventPool}
                  >
                    {filterEvents(eventPool.candidate).map((event, index) => (
                      <Draggable
                        key={event.id.toString()}
                        draggableId={event.id.toString()}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            {renderEventCard(event)}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              {/* {renderRelatedInfo(eventPool.candidate)} */}
            </div>
          </Col>
        </Row>

        {/* 事件线设置窗口 */}
        <TimelineRangeModal
          ref={timelineModalRef}
          onOk={() => {}}
          onCancel={() => {
            timelineForm.resetFields()
          }}
          form={timelineForm}
          selectedWorldView={selectedWorldView}
          onChangeTimeline={(type, value) => {
            if (type === 'start') setTimelineStart(value)
            else setTimelineEnd(value)
          }}
          eventPool={eventPool}
        />
      </Space>
    </DragDropContext>
  )
}




export default EventPoolPanel 