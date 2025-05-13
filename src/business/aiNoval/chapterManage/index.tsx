import React, { useState, useEffect } from 'react'
import { Card, Select, Space, Row, Col, Typography, Button, Input, message, Modal, Form, Radio } from 'antd'
import { DragDropContext } from 'react-beautiful-dnd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { mockNovels, mockEventPool } from './mockData'
import { Novel, Chapter, Event, EventPool } from './types'
import EventPoolPanel from './components/EventPoolPanel'
import styles from './index.module.scss'

const { Text } = Typography
const { TextArea } = Input

type ModuleType = 'event-pool' | 'chapter-skeleton' | 'chapter-generate'

function ChapterManage() {
  const [novels, setNovels] = useState<Novel[]>(mockNovels)
  const [selectedNovel, setSelectedNovel] = useState<string>('')
  const [selectedChapter, setSelectedChapter] = useState<string>('')
  const [eventPool, setEventPool] = useState<EventPool>(mockEventPool)
  const [selectedWorldContext, setSelectedWorldContext] = useState<string>('all')
  const [selectedStoryLines, setSelectedStoryLines] = useState<string[]>([])
  const [timelineRange, setTimelineRange] = useState<[number, number]>([0, 100])
  const [timelineAdjustment, setTimelineAdjustment] = useState<[number, number]>([0, 0])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null)
  const [activeModule, setActiveModule] = useState<ModuleType>('event-pool')

  // 获取所有世界观
  const worldContexts = ['all', ...new Set(eventPool.selected.concat(eventPool.candidate).map(event => event.worldContext))]

  // 获取所有故事线
  const storyLines = Array.from(new Set(eventPool.selected.concat(eventPool.candidate).map(event => event.storyLine)))

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

  const handleAddChapter = () => {
    setEditingChapter(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEditChapter = (chapter: Chapter) => {
    setEditingChapter(chapter)
    form.setFieldsValue(chapter)
    setIsModalVisible(true)
  }

  const handleDeleteChapter = (chapterId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个章节吗？',
      onOk: () => {
        setNovels(prevNovels =>
          prevNovels.map(novel => ({
            ...novel,
            chapters: novel.chapters.filter(chapter => chapter.id !== chapterId)
          }))
        )
        message.success('章节已删除')
      }
    })
  }

  const handleModalOk = () => {
    form.validateFields().then(values => {
      if (editingChapter) {
        // 编辑现有章节
        setNovels(prevNovels =>
          prevNovels.map(novel => ({
            ...novel,
            chapters: novel.chapters.map(chapter =>
              chapter.id === editingChapter.id ? { ...chapter, ...values } : chapter
            )
          }))
        )
        message.success('章节已更新')
      } else {
        // 添加新章节
        const newChapter: Chapter = {
          id: Date.now().toString(),
          title: values.title,
          seedPrompt: '',
          skeletonPrompt: '',
          events: []
        }
        setNovels(prevNovels =>
          prevNovels.map(novel =>
            novel.id === selectedNovel
              ? { ...novel, chapters: [...novel.chapters, newChapter] }
              : novel
          )
        )
        message.success('章节已添加')
      }
      setIsModalVisible(false)
    })
  }

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'event-pool':
        return (
          <EventPoolPanel
            eventPool={eventPool}
            selectedWorldContext={selectedWorldContext}
            selectedStoryLines={selectedStoryLines}
            timelineRange={timelineRange}
            timelineAdjustment={timelineAdjustment}
            worldContexts={worldContexts}
            storyLines={storyLines}
            onWorldContextChange={setSelectedWorldContext}
            onStoryLinesChange={setSelectedStoryLines}
            onTimelineRangeChange={setTimelineRange}
            onTimelineAdjustmentChange={setTimelineAdjustment}
            onDragEnd={handleDragEnd}
          />
        )
      case 'chapter-skeleton':
        return (
          <div className={styles.moduleContent}>
            <Text>章节骨架功能开发中...</Text>
          </div>
        )
      case 'chapter-generate':
        return (
          <div className={styles.moduleContent}>
            <Text>章节生成功能开发中...</Text>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className={styles.container}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Row gutter={16}>
          <Col span={8}>
            <Card 
              title={
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <Text>选择小说：</Text>
                  <Select
                    style={{ flex: 1 }}
                    placeholder="请选择小说"
                    value={selectedNovel || undefined}
                    onChange={setSelectedNovel}
                    allowClear
                    >
                    {novels.map(novel => (
                        <Select.Option key={novel.id} value={novel.id}>
                        {novel.title}
                        </Select.Option>
                    ))}
                    </Select>
                </div>
              }
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text strong>章节列表</Text>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddChapter}
                      disabled={!selectedNovel}
                    >
                      添加章节
                    </Button>
                  </Space>
                  <div className={styles.chapterList}>
                    {novels
                      .find(novel => novel.id === selectedNovel)
                      ?.chapters.map(chapter => (
                        <div key={chapter.id} className={styles.chapterItem}>
                          <Text>{chapter.title}</Text>
                          <Space>
                            <Button
                              type="text"
                              icon={<EditOutlined />}
                              onClick={() => handleEditChapter(chapter)}
                            />
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteChapter(chapter.id)}
                            />
                          </Space>
                        </div>
                      ))}
                  </div>
                </div>
              </Space>
            </Card>
          </Col>

          <Col span={16}>
            <Card
              title={
                <Radio.Group
                  value={activeModule}
                  onChange={e => setActiveModule(e.target.value)}
                  buttonStyle="solid"
                >
                  <Radio.Button value="event-pool">事件池管理</Radio.Button>
                  <Radio.Button value="chapter-skeleton">章节骨架</Radio.Button>
                  <Radio.Button value="chapter-generate">章节生成</Radio.Button>
                </Radio.Group>
              }
            >
              {renderModuleContent()}
            </Card>
          </Col>
        </Row>
      </DragDropContext>

      <Modal
        title={editingChapter ? '编辑章节' : '添加章节'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="章节标题"
            rules={[{ required: true, message: '请输入章节标题' }]}
          >
            <Input placeholder="请输入章节标题" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ChapterManage