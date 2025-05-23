import React, { useEffect, useState } from 'react'
import { Select, Space, Row, Col, Typography, Slider, Tag, Button, Modal, Form, Radio, Input, InputNumber, message, Alert } from 'antd'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { EventPool } from '../types'
import styles from './EventPoolPanel.module.scss'
import { IChapter, IStoryLine, IWorldViewDataWithExtra, ITimelineEvent, IGeoUnionData, IFactionDefData, IRoleData } from '@/src/types/IAiNoval'
import { TimelineDateFormatter } from '../../common/novelDateUtils'
import { EditOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import * as apiCalls from '../apiCalls'

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
  geoUnionList,
  factionList,
  roleList,
  // onWorldViewChange,
  onChapterChange
}: EventPoolPanelProps) {
  // 时间线开始时间
  const [timelineStart, setTimelineStart] = useState(0)

  // 时间线结束时间
  const [timelineEnd, setTimelineEnd] = useState(100)

  // 时间线模态框是否可见
  const [isTimelineModalVisible, setIsTimelineModalVisible] = useState(false)

  // 时间线表单
  const [timelineForm] = Form.useForm()

  // 时间线类型
  const [timelineType, setTimelineType] = useState<'start' | 'end'>('start')

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
  }, [selectedWorldView])

  // 监听章节变更，包括初始化
  useEffect(() => {
    loadChapterData();
  }, [isFirstLoad, selectedChapterId])

  // 初始化数据
  const initData = async () => {
    const worldViewList = (await apiCalls.getWorldViewList())?.data;
    setWorldViewList(worldViewList);

    if (selectedChapter?.worldview_id) {
      const selectedWorldView = worldViewList.find(worldView => worldView.id === selectedChapter.worldview_id);
      setSelectedWorldView(selectedWorldView || null);
      setSelectedWorldViewId(selectedWorldView?.id || null);
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
      return;
    }

    const chapterData = await apiCalls.getChapterById(selectedChapterId);
    setSelectedChapter(chapterData);
    
    if (!chapterData) {
      console.debug('chapterData is null')
      return
    }

    // 设置关联世界观，注意还要设置ID，antd专用
    if (!chapterData?.worldview_id) {
      console.debug('chapterData?.worldview_id is null')
      setSelectedWorldView(null)
      setSelectedWorldViewId(null)
    } else {
      console.debug('chapterData?.worldview_id is not null')
      setSelectedWorldView(worldViewList.find(worldView => worldView.id === chapterData.worldview_id) || null)
      setSelectedWorldViewId(chapterData.worldview_id)
    }

    // 设置关联故事线
    if (chapterData?.storyline_ids?.length) {
      setSelectedStoryLineIds(chapterData.storyline_ids)
    } else {
      setSelectedStoryLineIds(storyLineList.map(line => line.id))
    }

    // 计算章节时间范围，并同步到时间线范围
    let [timelineAdjustmentStart, timelineAdjustmentEnd] = calculateAndSyncChapterDateRange(chapterData);

    // 加载章节事件
    loadChapterEvents([timelineAdjustmentStart, timelineAdjustmentEnd], chapterData.event_ids)
  }

  // 加载章节事件
  const loadChapterEvents = async (requestDateRange?: [number, number], chapterEventIds?: number[]) => {
    if (!selectedWorldView?.id) {
      // message.warning('请先选择世界观')
      return
    }

    if (!requestDateRange) {
      // 如果未指定请求日期范围，则使用时间线范围
      console.debug('requestDateRange is null, use timelineAdjustment: ', timelineAdjustment)
      requestDateRange = [timelineAdjustment[0], timelineAdjustment[1]]
    }

    try {
      setLoading(true)
      const response = await apiCalls.getTimelineEventList(
        selectedWorldView.id,
        requestDateRange[0],
        requestDateRange[1]
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
          selected: selectedEvents,
          candidate: candidateEvents
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
      event_line_start1: timelineStart,
      event_line_end1: timelineEnd,
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
      <Text strong>{event.title}&nbsp;</Text>
      <Text type="secondary" className="block">
        {event.description}
      </Text>
      {/* <Text type="secondary" className="text-xs">
        {event.worldview_id}
      </Text> */}
    </div>
  )

  const handleTimelineModalOk = () => {
    timelineForm.validateFields().then(values => {
      const { era, year, month, day } = values

      let totalSeconds = 0;
      if (selectedWorldView) {
        const timeUtil = TimelineDateFormatter.fromWorldViewWithExtra(selectedWorldView);
        totalSeconds = timeUtil.dateDataToSeconds({ 
          isBC: era === 'BC', 
          year, 
          month, 
          day, 
          hour: 0,
          minute: 0,
          second: 0
        });
      } else {
        totalSeconds = (era === 'BC' ? -1 : 1) * (
          year * 365 + 
          month * 30 + 
          day
        )
      }
      
      if (timelineType === 'start') {
        setTimelineStart(totalSeconds)
      } else {
        setTimelineEnd(totalSeconds)
      }
      
      setIsTimelineModalVisible(false)
      timelineForm.resetFields()
    })
  }

  // 显示时间线模态框
  const showTimelineModal = (type: 'start' | 'end') => {
    setTimelineType(type)
    const currentValue = type === 'start' ? timelineStart : timelineEnd
    
    let isBC = currentValue < 0
    let absValue = Math.abs(currentValue)
    let year = Math.floor(absValue / 365)
    let month = Math.floor((absValue % 365) / 30)
    let day = absValue % 30

    if (selectedWorldView) {
      const timeUtil = TimelineDateFormatter.fromWorldViewWithExtra(selectedWorldView);
      let dateStruct = timeUtil.secondsToDateData(currentValue)
      isBC = dateStruct.isBC
      year = dateStruct.year
      month = dateStruct.month
      day = dateStruct.day
    }

    timelineForm.setFieldsValue({
      era: isBC ? 'BC' : 'AD',
      year,
      month,
      day
    })
    setIsTimelineModalVisible(true)
  }

  // 如果未选择世界观，则只显示选择器
  if (!selectedWorldView) {
    return (
      <div>
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
        </Row>
        <Alert style={{ margin: '10px 0' }} message="请先选择世界观" type="warning" />
      </div>
    )
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
            <Select
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
            </Select>
          </Col>
        </Row>

        {/* 事件线设置 */}
        <Space>
          <Text>时间线范围：</Text>
          <Text>{renderNovelDate(timelineStart)}</Text>
          <Button icon={<EditOutlined />} type="link" onClick={() => showTimelineModal('start')}>更改起点</Button> - 
          <Text>{renderNovelDate(timelineEnd)}</Text>
          <Button icon={<EditOutlined />} type="link" onClick={() => showTimelineModal('end')}>更改终点</Button>
        </Space>

        <div className="f-flex-row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Text>时间范围微调：</Text>
          <div style={{ flex: 1, margin: '0 70px', padding: '20px 0 0', height: 30 }}>
            <Slider
              style={{ width: '100%', margin: '-10px 0 0' }}
              range
              value={timelineAdjustment}
              onChange={(value) => {setTimelineAdjustment(value as [number, number])}}
              min={timelineStart || 0}
              max={timelineEnd || 100}
              marks={{
                [timelineStart || 0]: renderNovelDate(timelineStart || 0),
                0: '0',
                [timelineEnd || 100]: renderNovelDate(timelineEnd || 100)
              }}
              tooltip={{ formatter: (value) => renderNovelDate(value) }}
            />
          </div>
          <Button type="primary" icon={<ReloadOutlined />} onClick={() => loadChapterData()} loading={loading}>加载事件</Button>
          <Button icon={<SaveOutlined />} onClick={saveChapterSetting} loading={loading}>保存配置和事件到章节</Button>
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
              {renderRelatedInfo(eventPool.selected)}
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
              {renderRelatedInfo(eventPool.candidate)}
            </div>
          </Col>
        </Row>

        {/* 事件线设置窗口 */}
        <Modal
          title={timelineType === 'start' ? '更改起点' : '更改终点'}
          open={isTimelineModalVisible}
          onOk={handleTimelineModalOk}
          onCancel={() => {
            setIsTimelineModalVisible(false)
            timelineForm.resetFields()
          }}
        >
          <Form form={timelineForm} layout="inline">
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
      </Space>
    </DragDropContext>
  )
}

export default EventPoolPanel 