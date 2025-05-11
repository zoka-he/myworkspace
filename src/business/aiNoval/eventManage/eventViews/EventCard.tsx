import React from 'react'
import { Card, Space, Tag } from 'antd'
import { UserOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { TimelineEvent, StoryLine } from '../mockData'

interface EventCardProps {
  event: TimelineEvent
  eventStoryLine?: StoryLine
  selectedEventId?: string
  onEventSelect: (event: TimelineEvent) => void
  onEventDelete: (eventId: string) => void
  showActions?: boolean
}

export function EventCard({
  event,
  eventStoryLine,
  selectedEventId,
  onEventSelect,
  onEventDelete,
  showActions = true
}: EventCardProps) {
  return (
    <Card
      key={event.id}
      size="small"
      style={{ marginBottom: '8px', cursor: 'pointer' }}
      onClick={() => onEventSelect(event)}
      className={selectedEventId === event.id ? 'ant-card-selected' : ''}
      actions={showActions ? [
        <EditOutlined key="edit" onClick={(e) => {
          e.stopPropagation()
          onEventSelect(event)
        }} />,
        <DeleteOutlined key="delete" onClick={(e) => {
          e.stopPropagation()
          onEventDelete(event.id)
        }} />
      ] : undefined}
    >
      <Card.Meta
        title={
          <Space>
            {event.title}
            <Tag color={eventStoryLine?.type === 'main' ? 'red' : 'blue'}>
              {eventStoryLine?.name}
            </Tag>
          </Space>
        }
        description={
          <Space direction="vertical" size="small">
            <div>{event.description}</div>
            <Space>
              <Tag color="blue">{event.faction}</Tag>
              <Tag color="green">{event.location}</Tag>
              {event.characters.map(char => (
                <Tag key={char} icon={<UserOutlined />}>{char}</Tag>
              ))}
            </Space>
          </Space>
        }
      />
    </Card>
  )
} 