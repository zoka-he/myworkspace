import React, { useEffect, useState } from 'react'
import { Select, Space, Row, Col, Typography, Slider, Tag, Button, Modal, Form, Radio, Input, InputNumber, message, Alert, Divider, Checkbox } from 'antd'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { EventPool } from '../types'
import styles from './EventPoolPanel.module.scss'
import { IChapter, IStoryLine, IWorldViewDataWithExtra, ITimelineEvent, IGeoUnionData, IFactionDefData, IRoleData } from '@/src/types/IAiNoval'
import { TimelineDateFormatter } from '../../common/novelDateUtils'
import { EditOutlined, ReloadOutlined, SaveOutlined, CopyOutlined } from '@ant-design/icons'
import * as apiCalls from '../apiCalls'
import { useChapterContext } from '../chapterContext'
import { useWorldViewContext } from '../WorldViewContext'

const { Text } = Typography

type Event = ITimelineEvent

// 新增：时间线范围编辑 Modal 组件
const TimelineRangeModal = React.forwardRef(({
  onOk,
  onCancel,
  form,
  onChangeTimeline,
  eventPool
}: {
  onOk: () => void
  onCancel: () => void
  form: any
  // selectedWorldView: IWorldViewDataWithExtra | null
  onChangeTimeline: (type: 'start' | 'end', value: number | null) => void
  eventPool: EventPool
}, ref) => {
  const { worldViewData } = useWorldViewContext();

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
      if (worldViewData) {
        const timeUtil = TimelineDateFormatter.fromWorldViewWithExtra(worldViewData)
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
  }, [visible, initialSeconds, worldViewData, form])

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
    if (worldViewData) {
      const timeUtil = TimelineDateFormatter.fromWorldViewWithExtra(worldViewData)
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
    if (worldViewData) {
      if (worldViewData.te_max_seconds) {
        lastDateSeconds = worldViewData.te_max_seconds - days * 24 * 3600
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
    if (worldViewData) {
      let secondsPerHour = worldViewData.tl_hour_length_in_seconds || 3600;
      let hoursPerDay = worldViewData.tl_day_length_in_hours || 24;
      let daysPerMonth = worldViewData.tl_month_length_in_days || 30;
      let monthsPerYear = worldViewData.tl_year_length_in_months || 12;
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
      lastDateSeconds = (worldViewData.te_max_seconds || 0) - userDiffValue * secondsOfUnit;
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
    handleApplyUserDiff(unit)
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
            <Form.Item name="month" rules={[{ required: true, type: 'number', min: 1, max: worldViewData?.tl_year_length_in_months || 12 }]} noStyle>
              <InputNumber type="number" min={1} max={worldViewData?.tl_year_length_in_months || 12} placeholder="月" style={{ width: 60 }} />
            </Form.Item>
            <Form.Item name="day" rules={[{ required: true, type: 'number', min: 1, max: worldViewData?.tl_month_length_in_days || 30 }]} noStyle>
              <InputNumber type="number" min={1} max={worldViewData?.tl_month_length_in_days || 30} placeholder="日" style={{ width: 60 }} />
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

interface EventPoolPanelProps {
  onChapterChange: (chapterId: number | null) => void
}

function EventPoolPanel(props: EventPoolPanelProps) {
  const { state: chapterContext } = useChapterContext();
  const { 
    worldViewList, 
    worldViewId, 
    setContextWorldViewId,
    worldViewData, 
    checkWorldViewDataAndRetry,
  } = useWorldViewContext();

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

  // 是否加载中
  const [loading, setLoading] = useState(false)

  // 事件池
  const [eventPool, setEventPool] = useState<EventPool>({ selected: [], candidate: [] })

  const [showLocations, setShowLocations] = useState(true)
  const [showFactions, setShowFactions] = useState(false)
  const [showCharacters, setShowCharacters] = useState(true)

  // 新增：时间线范围编辑 Modal 组件
  const timelineModalRef = React.useRef<{ open: (type: 'start' | 'end', seconds: number | null) => void }>(null)
  function showTimelineModal(type: 'start' | 'end', seconds: number | null) {
    timelineModalRef.current?.open(type, seconds)
  }

  // 初始加载，加载完毕后触发isFirstLoad完成事件
  useEffect(() => {
    initData();
    // setIsFirstLoad(false);
  }, [])

  // 监听世界观变更
  useEffect(() => {
    if (worldViewData?.te_max_seconds) {
      setTimelineStart(worldViewData?.te_max_seconds - 7 * 24 * 3600);
      setTimelineEnd(worldViewData?.te_max_seconds);
    } else {
      setTimelineStart(0);
      setTimelineEnd(100);
    }

    // 加载故事线列表
    if (worldViewData?.id) {
      apiCalls.getStoryLineList(worldViewData.id).then(res => {
        setStoryLineList(res.data)
        if (!chapterContext?.storyline_ids?.length) {
          setSelectedStoryLineIds(res.data.map(line => line.id))
        }
      })
    } else {
      setStoryLineList([])
      setSelectedStoryLineIds([])
    }

  }, [worldViewData])

  // 监听章节变更，包括初始化
  useEffect(() => {
    if (chapterContext?.id) {
      checkWorldViewDataAndRetry();
      applyChapterData();
    } 
  }, [chapterContext?.id, worldViewData?.id])

  // 初始化数据
  const initData = async () => {

    if (chapterContext?.id) {
      const chapterData = await apiCalls.getChapterById(chapterContext.id);
      if (chapterData?.worldview_id) {
        const selectedWorldView = worldViewList?.find(worldView => worldView.id === chapterData.worldview_id);
        setContextWorldViewId(selectedWorldView?.id || null);
      }
    } else {
      setContextWorldViewId(null);
    } 
  }

  // 注意：TS参数不能同时有"?"和默认值，需用"="并在函数内处理默认
  const applyChapterData = async (chapterData?: IChapter | null) => {
    if (chapterData === undefined || chapterData === null) {
      chapterData = chapterContext;
    }
    // console.debug('applyChapterData --> 第一步', chapterData);

    // 检查章节ID，如果为空，则清除事件表
    if (!chapterData?.id) {
      console.debug('chapterData?.id is null')
      setEventPool({ selected: [], candidate: [] });
      return;
    }

    // console.debug('applyChapterData --> 第二步', chapterData);

    // 检查关联世界观，如果为空，则清除事件表
    if (!chapterData?.worldview_id && !worldViewData?.id) {
      console.debug('chapterData?.worldview_id and worldViewData?.id is null')
      setEventPool({ selected: [], candidate: [] })
      return;
    } 

    // console.debug('applyChapterData --> 第三步', chapterData);

    if (chapterData.worldview_id !== worldViewData?.id) {
      setContextWorldViewId(chapterData.worldview_id || worldViewData?.id || null)
    }

    // console.debug('applyChapterData --> 第四步', chapterData);

    // 设置关联故事线
    if (chapterContext?.storyline_ids?.length) {
      setSelectedStoryLineIds(chapterContext.storyline_ids)
    } else {
      setSelectedStoryLineIds(storyLineList.map(line => line.id))
    }

    // console.debug('applyChapterData --> 第五步', chapterData);

    if (chapterData.event_line_start1) {
      setTimelineStart(chapterData.event_line_start1)
    }

    if (chapterData.event_line_end1) {
      setTimelineEnd(chapterData.event_line_end1)
    }

    // console.debug('applyChapterData --> 第六步', chapterData);

    // 联动章节更新事件，防止重复更新，延时10ms等待世界观context完成更新
    loadChapterEvents(chapterData.worldview_id, chapterData?.event_ids, chapterData.event_line_start1, chapterData.event_line_end1)

    // console.debug('applyChapterData --> 第七步', chapterData);
  }

  // 加载章节事件
  const loadChapterEvents = async (worldViewId?: number | null, chapterEventIds?: number[], _timelineStart?: number | null, _timelineEnd?: number | null) => {

    if (!worldViewId) {
      if (chapterContext?.worldview_id) { // 首先尝试获取章节的世界观id
        worldViewId = chapterContext.worldview_id;
      } else if (worldViewData?.id) { // 其次尝试获取世界观context的世界观id
        worldViewId = worldViewData.id;
      } else { // 最后提示选择世界观
        message.warning('请先选择世界观')
        return
      }
    }

    if (!chapterEventIds) {
      chapterEventIds = chapterContext?.event_ids || [];
    }

    if (!_timelineStart) {
      _timelineStart = timelineStart || 0;
    }
    if (!_timelineEnd) {
      _timelineEnd = timelineEnd || new Date().getTime() / 1000;
    }

    try {
      setLoading(true)

      // 如果时间线范围小于24小时，则将时间线范围设置为24小时
      let realEnd = _timelineEnd;
      if (_timelineEnd && _timelineStart && _timelineEnd - _timelineStart < 24 * 3600) {
        realEnd = _timelineStart + 24 * 3600;
      }

      const response = await apiCalls.getTimelineEventList(
        worldViewId,
        _timelineStart,
        realEnd
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

  const loadByNovelIdAndChapterId = async (novel_id?: number | null, chapter_number?: number | null) => {
    const chapterData = await apiCalls.getChapter({ novel_id, chapter_number });
    if (chapterData) {
      applyChapterData(chapterData);
    } else {
      message.error('章节数据不存在，请检查章节编号是否严格按照顺序！')
    }
  }

  const handleLoadFromPreviousChapter = async () => {
    if (!chapterContext?.novel_id || !chapterContext?.chapter_number) {
      message.error('章节基础数据存在问题，无法推算上一章节！')
      return
    }
    const novelId = chapterContext.novel_id;
    loadByNovelIdAndChapterId(novelId, chapterContext.chapter_number - 1);
  }

  const handleTimelineChange = (type: 'start' | 'end', value: number | null) => {
    let _timelineStart = timelineStart;
    let _timelineEnd = timelineEnd;
    if (type === 'start' && typeof value === 'number') {
      setTimelineStart(value)
      _timelineStart = value;
    } else if (type === 'end' && typeof value === 'number') {
      setTimelineEnd(value)
      _timelineEnd = value;
    }
    loadChapterEvents(chapterContext?.worldview_id, chapterContext?.event_ids, _timelineStart, _timelineEnd)
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

  const saveChapterSetting = async () => {
    if (!chapterContext?.id) {
      message.warning('请先选择章节')
      return
    }

    if (!worldViewData?.id) {
      message.warning('请先选择世界观')
      return
    }

    const settingParams = {
      id: chapterContext.id,
      worldview_id: worldViewData.id,
      storyline_ids: selectedStoryLineIds,
      event_ids: eventPool.selected.map(event => event.id),
      event_line_start1: timelineStart === null ? undefined : timelineStart,
      event_line_end1: timelineEnd === null ? undefined : timelineEnd,
    }

    try {
      await apiCalls.updateChapter(settingParams);
      // console.debug('saveChapterSetting --> settingParams', settingParams);
      message.success('保存章节参数成功')
      props.onChapterChange(chapterContext.id)
    } catch (error) {
      message.error('保存章节参数失败')
    }
  }

  

  // 根据筛选条件过滤事件
  const filterEvents = (events: Event[]) => {
    return events.filter(event => {
      const storyLineMatch = selectedStoryLineIds.length === 0 || selectedStoryLineIds.includes(event.story_line_id)
      return storyLineMatch
    })
  }

  

  // 渲染事件线设置
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row gutter={16} className={styles.filterSection}>
          <Col span={8}>
            <Select
              style={{ width: '100%' }}
              placeholder="选择世界观"
              value={worldViewId}
              allowClear
              onClear={() => setContextWorldViewId(null)}
              onChange={setContextWorldViewId}
            >
              {worldViewList?.map(context => (
                <Select.Option key={context.id} value={context.id}>
                  {context.title}
                </Select.Option>
              )) || []}
            </Select>
          </Col>
          <Col span={16}>
            <Space>
            <Text>时间线范围：</Text>
              <Button icon={<EditOutlined />} type="link" onClick={() => showTimelineModal('start', timelineStart)}>{timelineStart !== null ? renderNovelDate(timelineStart, worldViewData) : '不限'}</Button> - 
              <Button icon={<EditOutlined />} type="link" onClick={() => showTimelineModal('end', timelineEnd)}>{timelineEnd !== null ? renderNovelDate(timelineEnd, worldViewData) : '不限'}</Button>
            </Space>
            
          </Col>
        </Row>

        

        <div className="f-flex-row" style={{ width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Space>
            <Space.Compact>
              <Button type="primary" icon={<ReloadOutlined />} onClick={() => loadChapterEvents()} loading={loading}>加载事件</Button>
              <Space.Addon>
                <Checkbox checked={showLocations} onChange={() => setShowLocations(!showLocations)}>显示地点</Checkbox>
              </Space.Addon>
              <Space.Addon>
                <Checkbox checked={showFactions} onChange={() => setShowFactions(!showFactions)}>显示阵营</Checkbox>
              </Space.Addon>
              <Space.Addon>
                <Checkbox checked={showCharacters} onChange={() => setShowCharacters(!showCharacters)}>显示角色</Checkbox>
              </Space.Addon>
            </Space.Compact>
            <Button type="default" icon={<CopyOutlined />} onClick={() => handleLoadFromPreviousChapter()}>从上一章继承</Button>
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
                            <EventCard event={event} showLocations={showLocations} showFactions={showFactions} showCharacters={showCharacters} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
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
                            <EventCard event={event} showLocations={showLocations} showFactions={showFactions} showCharacters={showCharacters} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </Col>
        </Row>

        {/* 事件线设置窗口 */}
        <TimelineRangeModal
          ref={timelineModalRef}
          onOk={() => {}}
          onCancel={() => timelineForm.resetFields()}
          form={timelineForm}
          onChangeTimeline={(type, value) => handleTimelineChange(type, value)}
          eventPool={eventPool}
        />
      </Space>
    </DragDropContext>
  )
}

export default EventPoolPanel;


// 渲染时间点
const renderNovelDate = (date?: number, worldViewData?: IWorldViewDataWithExtra | null) => {

  if (!date) {
    date = 0;
  }

  if (!worldViewData) {
    return '时间点：' + date;
  }

  const util = TimelineDateFormatter.fromWorldViewWithExtra(worldViewData);
  return util.formatSecondsToDate(date);
}

interface EventCardProps {
  event: Event
  showLocations?: boolean
  showFactions?: boolean
  showCharacters?: boolean
}

function EventCard(props: EventCardProps) {
  const { event, showLocations, showFactions, showCharacters } = props;
  const { worldViewData } = useWorldViewContext();
  const { geoUnionList, factionList, roleList } = useWorldViewContext();

  let location: React.ReactNode = null;
  let factions: React.ReactNode[] = [];
  let characters: React.ReactNode[] = [];

  if (event?.location) {
    let name = geoUnionList?.find(geoUnion => geoUnion.code === event.location)?.name;
    if (name) {
      location = <Tag key={location} color="blue">{name}</Tag>
    } else {
      console.debug('location未找到对应地点：', geoUnionList, event.location)
    }
  }

  if (event?.faction_ids.length > 0) {
    factions = event.faction_ids.map(faction => {
      const factionItem = factionList?.find(item => item.id === faction);
      return <Tag key={faction} color="green">{factionItem?.name}</Tag>
    })
  }

  if (event?.role_ids.length > 0) {
    characters = event.role_ids.map(role => {
      const roleItem = roleList?.find(item => item.id === role);
      return <Tag key={role} color="purple">{roleItem?.name}</Tag>
    })
  }

  const showRelatedInfo = showLocations || showFactions || showCharacters;

  return (
    <div className={styles.eventCard}>
      <div style={{ display: 'flex', gap: 5 }}>
        <Tag>{renderNovelDate(event.date, worldViewData)}</Tag>
        <Text strong>{event.title}&nbsp;</Text>
      </div>
      <Text type="secondary" className="block">
        {event.description}
      </Text>
      <div className={styles.relatedInfo} style={{ display: showRelatedInfo ? 'block' : 'none' }}>
        <div className={styles.relatedInfoItem} style={{ display: showLocations ? 'block' : 'none' }}>
          <Text strong>关联地点：</Text>
          <Space wrap>{location}</Space>
        </div>
        <div className={styles.relatedInfoItem} style={{ display: showFactions ? 'block' : 'none' }}>
          <Text strong>关联阵营：</Text>
          <Space wrap>
            {factions}
          </Space>
        </div>
        <div className={styles.relatedInfoItem} style={{ display: showCharacters ? 'block' : 'none' }}>
          <Text strong>关联角色：</Text>
          <Space wrap>
            {characters}
          </Space>
        </div>
      </div>
    </div>
  )
}
