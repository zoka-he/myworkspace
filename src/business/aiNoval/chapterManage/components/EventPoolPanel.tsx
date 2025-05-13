import React from 'react'
import { Select, Space, Row, Col, Typography, Slider, Tag } from 'antd'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { Event, EventPool } from '../types'
import styles from './EventPoolPanel.module.scss'

const { Text } = Typography

interface EventPoolPanelProps {
  eventPool: EventPool
  selectedWorldContext: string
  selectedStoryLines: string[]
  timelineRange: [number, number]
  timelineAdjustment: [number, number]
  worldContexts: string[]
  storyLines: string[]
  onWorldContextChange: (value: string) => void
  onStoryLinesChange: (value: string[]) => void
  onTimelineRangeChange: (value: [number, number]) => void
  onTimelineAdjustmentChange: (value: [number, number]) => void
  onDragEnd: (result: any) => void
}

function EventPoolPanel({
  eventPool,
  selectedWorldContext,
  selectedStoryLines,
  timelineRange,
  timelineAdjustment,
  worldContexts,
  storyLines,
  onWorldContextChange,
  onStoryLinesChange,
  onTimelineRangeChange,
  onTimelineAdjustmentChange,
  onDragEnd
}: EventPoolPanelProps) {
  // 获取所有关联信息
  const getRelatedInfo = (events: Event[]) => {
    const locations = new Set<string>()
    const factions = new Set<string>()
    const characters = new Set<string>()

    events.forEach(event => {
      if (event.location) locations.add(event.location)
      if (event.faction) factions.add(event.faction)
      if (event.characters) {
        event.characters.forEach(char => characters.add(char))
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
      const worldContextMatch = selectedWorldContext === 'all' || event.worldContext === selectedWorldContext
      const storyLineMatch = selectedStoryLines.length === 0 || selectedStoryLines.includes(event.storyLine)
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
        {event.worldContext}
      </Text>
    </div>
  )

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={16} className={styles.filterSection}>
        <Col span={12}>
          <Select
            style={{ width: '100%' }}
            placeholder="选择世界观"
            value={selectedWorldContext}
            onChange={onWorldContextChange}
          >
            {worldContexts.map(context => (
              <Select.Option key={context} value={context}>
                {context === 'all' ? '全部世界观' : context}
              </Select.Option>
            ))}
          </Select>
        </Col>
        <Col span={12}>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="选择故事线"
            value={selectedStoryLines}
            onChange={onStoryLinesChange}
          >
            {storyLines.map(line => (
              <Select.Option key={line} value={line}>
                {line}
              </Select.Option>
            ))}
          </Select>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <div className={styles.timelineSlider}>
            <Text>时间线范围</Text>
            <Slider
              range
              value={timelineRange}
              onChange={onTimelineRangeChange}
              marks={{
                0: '开始',
                25: '25%',
                50: '50%',
                75: '75%',
                100: '结束'
              }}
            />
          </div>
        </Col>
        <Col span={12}>
          <div className={styles.timelineAdjustment}>
            <Text>时间线范围微调</Text>
            <Slider
              range
              value={timelineAdjustment}
              onChange={onTimelineAdjustmentChange}
              min={-50}
              max={50}
              marks={{
                '-50': '-50',
                '-25': '-25',
                0: '0',
                25: '25',
                50: '50'
              }}
            />
          </div>
        </Col>
      </Row>

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
                      key={event.id}
                      draggableId={event.id}
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
                      key={event.id}
                      draggableId={event.id}
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
    </Space>
  )
}

export default EventPoolPanel 