import React from 'react'
import { Card, Button, Space, Typography, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, BookOutlined } from '@ant-design/icons'
import { IStoryLine } from '@/src/types/IAiNoval'

const { Title } = Typography

interface StoryLineListProps {
  storyLines: IStoryLine[]
  selectedWorld: string
  selectedStoryLine: string
  onStoryLineSelect: (id: string) => void
  onStoryLineEdit: (storyLine: IStoryLine) => void
  onStoryLineDelete: (id: string) => void
  onAddStoryLine: () => void
  disabled?: boolean
}

export function StoryLineList({
  storyLines,
  selectedWorld,
  selectedStoryLine,
  onStoryLineSelect,
  onStoryLineEdit,
  onStoryLineDelete,
  onAddStoryLine,
  disabled = false
}: StoryLineListProps) {
  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <Title level={5}>故事线管理</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          size="small"
          onClick={onAddStoryLine}
          disabled={disabled}
        />
      </div>
      <div style={{ height: 'calc(100vh - 300px)', overflow: 'auto' }}>
        {storyLines
          .filter(line => line.worldview_id?.toString() === selectedWorld)
          .map(storyLine => (
            <Card
              key={storyLine.id}
              size="small"
              style={{ 
                marginBottom: '4px',
                cursor: 'pointer'
              }}
              bodyStyle={{ 
                padding: '8px 12px'
              }}
              actions={[
                <Button 
                  type="text" 
                  size="small" 
                  icon={<EditOutlined />} 
                  onClick={(e) => {
                    e.stopPropagation()
                    onStoryLineEdit(storyLine)
                  }}
                  style={{ padding: '0 4px' }}
                />,
                <Button 
                  type="text" 
                  size="small" 
                  icon={<DeleteOutlined />} 
                  onClick={(e) => {
                    e.stopPropagation()
                    onStoryLineDelete(storyLine.id?.toString() || '')
                  }}
                  style={{ padding: '0 4px' }}
                />
              ]}
              onClick={() => onStoryLineSelect(storyLine.id?.toString() || '')}
              className={selectedStoryLine === storyLine.id?.toString() ? 'ant-card-selected' : ''}
            >
              <Card.Meta
                title={
                  <Space size="small">
                    <BookOutlined />
                    <span>{storyLine.name}</span>
                    <Tag color={storyLine.type === 'main' ? 'red' : 'blue'} style={{ margin: 0 }}>
                      {storyLine.type === 'main' ? '主线' : '支线'}
                    </Tag>
                  </Space>
                }
                description={
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666',
                    marginTop: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {storyLine.description}
                  </div>
                }
              />
            </Card>
          ))}
      </div>
    </div>
  )
} 