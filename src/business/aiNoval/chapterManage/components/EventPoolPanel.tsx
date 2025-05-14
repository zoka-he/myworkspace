import React, { useEffect, useState } from 'react'
import { Select, Space, Row, Col, Typography, Slider, Tag, Button, Modal, Form, Radio, Input, InputNumber, message } from 'antd'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { EventPool } from '../types'
import styles from './EventPoolPanel.module.scss'
import { IChapter, IStoryLine, IWorldViewDataWithExtra, ITimelineEvent } from '@/src/types/IAiNoval'
import { TimelineDateFormatter } from '../../common/novelDateUtils'
import { EditOutlined, ReloadOutlined } from '@ant-design/icons'
import * as apiCalls from '../apiCalls'

const { Text } = Typography

type Event = ITimelineEvent

interface EventPoolPanelProps {
  selectedWorldContext: string
  worldViewList: IWorldViewDataWithExtra[]
  selectedWorldViewId?: number | null
  selectedChapter?: IChapter | null,
  onWorldViewChange: (value?: number | null) => void
}

function EventPoolPanel({
  selectedWorldContext,
  worldViewList,
  selectedWorldViewId,
  selectedChapter,
  onWorldViewChange,
}: EventPoolPanelProps) {
  const [timelineStart, setTimelineStart] = useState(0)
  const [timelineEnd, setTimelineEnd] = useState(100)
  const [selectedWorldView, setSelectedWorldView] = useState<IWorldViewDataWithExtra | null>(null)
  const [isTimelineModalVisible, setIsTimelineModalVisible] = useState(false)
  const [timelineForm] = Form.useForm()
  const [timelineType, setTimelineType] = useState<'start' | 'end'>('start')
  const [storyLineList, setStoryLineList] = useState<IStoryLine[]>([])
  const [selectedStoryLineIds, setSelectedStoryLineIds] = useState<number[]>([])
  const [timelineAdjustment, setTimelineAdjustment] = useState<[number, number]>([0, 100])
  const [loading, setLoading] = useState(false)
  const [eventPool, setEventPool] = useState<EventPool>({ selected: [], candidate: [] })

  // 监听父组件变更
  useEffect(() => {
    let selectedWorldView = null;

    if (selectedWorldViewId) {
      selectedWorldView = worldViewList.find(worldView => worldView.id === selectedWorldViewId) ?? null;
    }

    setSelectedWorldView(selectedWorldView);
  }, [selectedWorldViewId, worldViewList]);

  // 监听故事线变更
  useEffect(() => {
    if (selectedWorldView?.te_max_seconds) {
      setTimelineStart(selectedWorldView?.te_max_seconds - 30 * 24 * 3600);
      setTimelineEnd(selectedWorldView?.te_max_seconds);
    } else {
      setTimelineStart(0);
      setTimelineEnd(100);
    }

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

  useEffect(() => {
    if (selectedChapter) {
      if (selectedChapter?.storyline_ids?.length) {
        setSelectedStoryLineIds(selectedChapter.storyline_ids)
      } else {
        setSelectedStoryLineIds(storyLineList.map(line => line.id))
      }

      if (timelineEnd) {
        // 设置范围为最后30天
        setTimelineStart(selectedChapter.event_line_start1 || timelineEnd - 30 * 24 * 3600)
        setTimelineEnd(selectedChapter.event_line_end1 || timelineEnd)
      } else {
        setTimelineStart(selectedChapter.event_line_start1 || 0)
        setTimelineEnd(selectedChapter.event_line_end1 || 100)
      }
      setTimelineAdjustment([selectedChapter.event_line_start2 || 0, selectedChapter.event_line_end2 || 100])
    }
  }, [selectedChapter])

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

  // 加载事件
  const loadEvents = async () => {
    if (!selectedWorldView?.id) {
      message.warning('请先选择世界观')
      return
    }

    try {
      setLoading(true)
      const response = await apiCalls.getTimelineEventList(
        selectedWorldView.id,
        timelineAdjustment[0],
        timelineAdjustment[1]
      )

      if (response.data) {
        if (response.data.length > 10) {
          message.warning('时间段内事件密集，建议缩小筛选范围')
        }
        
        // 更新事件池
        setEventPool({
          selected: eventPool.selected,
          candidate: response.data
        })
      }
    } catch (error) {
      message.error('加载事件失败')
    } finally {
      setLoading(false)
    }
  }

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
    const factions = new Set<string>()
    const characters = new Set<string>()

    events.forEach(event => {
      if (event.location) locations.add(event.location)
      if (event.faction_ids) {
        event.faction_ids.forEach(id => factions.add(id.toString()))
      }
      if (event.role_ids) {
        event.role_ids.forEach(id => characters.add(id.toString()))
      }
    })

    return {
      locations: Array.from(locations),
      factions: Array.from(factions),
      characters: Array.from(characters)
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
              <Tag key={location} color="blue">{location}</Tag>
            ))}
          </Space>
        </div>
        <div className={styles.relatedInfoItem}>
          <Text strong>关联阵营：</Text>
          <Space wrap>
            {factions.map(faction => (
              <Tag key={faction} color="green">{faction}</Tag>
            ))}
          </Space>
        </div>
        <div className={styles.relatedInfoItem}>
          <Text strong>关联角色：</Text>
          <Space wrap>
            {characters.map(character => (
              <Tag key={character} color="purple">{character}</Tag>
            ))}
          </Space>
        </div>
      </div>
    )
  }

  // 根据筛选条件过滤事件
  const filterEvents = (events: Event[]) => {
    return events.filter(event => {
      const worldContextMatch = selectedWorldContext === 'all' || event.worldview_id.toString() === selectedWorldContext
      const storyLineMatch = selectedStoryLineIds.length === 0 || selectedStoryLineIds.includes(event.story_line_id)
      return worldContextMatch && storyLineMatch
    })
  }

  const renderEventCard = (event: Event) => (
    <div className={styles.eventCard}>
      <Text strong>{event.title}</Text>
      <Text type="secondary" className="block">
        {event.description}
      </Text>
      <Text type="secondary" className="text-xs">
        {event.worldview_id}
      </Text>
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

  // 渲染事件线设置
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={16} className={styles.filterSection}>
        <Col span={8}>
          <Select
            style={{ width: '100%' }}
            placeholder="选择世界观"
            value={selectedWorldViewId}
            allowClear
            onClear={() => onWorldViewChange(null)}
            onChange={onWorldViewChange}
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

      <Space className="f-flex-row">
        <Text>时间范围微调：</Text>
        <Slider
          style={{ width: 'calc(100vw - 1400px)', margin: '0 70px' }}
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
        <Button type="primary" icon={<ReloadOutlined />} onClick={loadEvents} loading={loading}>加载事件</Button>
      </Space>

      <DragDropContext onDragEnd={handleDragEnd}>
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
      </DragDropContext>

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
  )
}

export default EventPoolPanel 