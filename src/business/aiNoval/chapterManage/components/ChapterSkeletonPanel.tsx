import React, { useEffect, useState } from 'react'
import { Space, Typography, Button, Input, message, Form, Row, Col, Tag, Tooltip, Select } from 'antd'
import { PlusOutlined, DeleteOutlined, ReloadOutlined, EditOutlined, InfoCircleOutlined, CopyOutlined } from '@ant-design/icons'
import { IChapter, IWorldViewDataWithExtra, IGeoUnionData, IFactionDefData, IRoleData, ITimelineEvent } from '@/src/types/IAiNoval'
import styles from './ChapterSkeletonPanel.module.scss'
import { getTimelineEventByIds } from '../apiCalls'
import _ from 'lodash'
import { TimelineDateFormatter } from '@/src/business/aiNoval/common/novelDateUtils'

const { Text } = Typography
const { TextArea } = Input
const { Option } = Select

interface ChapterSkeletonPanelProps {
  selectedChapter: IChapter | null
  onChapterChange: () => void
  onRefresh: () => void
  onEditEventPool: () => void
  worldViewList: IWorldViewDataWithExtra[]
  geoUnionList: IGeoUnionData[]
  factionList: IFactionDefData[]
  roleList: IRoleData[]
  onUpdateWorldView: (worldViewId?: number | null) => void
}

interface ISkeletonItem {
  id: string
  content: string
  order: number
}

function ChapterSkeletonPanel({ 
  selectedChapter, 
  onChapterChange,
  onRefresh,
  onEditEventPool,
  worldViewList,
  geoUnionList,
  factionList,
  roleList,
  onUpdateWorldView
}: ChapterSkeletonPanelProps) {
  const [form] = Form.useForm()
  const [skeletonItems, setSkeletonItems] = useState<ISkeletonItem[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [eventList, setEventList] = useState<ITimelineEvent[]>([])
  const [relatedEventFactionIds, setRelatedEventFactionIds] = useState<number[]>([])
  const [relatedEventCharacterIds, setRelatedEventCharacterIds] = useState<number[]>([])
  const [relatedEventLocationIds, setRelatedEventLocationIds] = useState<string[]>([])

  // 合并 selectedChapter 相关的 useEffect
  useEffect(() => {
    // 填充事件相关信息
    const fillRelatedEventRelatedInfo = async () => {
      let relatedEventFactionIds = []
      let relatedEventCharacterIds = []
      let relatedEventLocationIds = []

      if (!selectedChapter?.event_ids) {
        setRelatedEventFactionIds([])
        setRelatedEventCharacterIds([])
        setRelatedEventLocationIds([])
        return
      }

      let timelineEvents = (await getTimelineEventByIds(selectedChapter.event_ids)).data || []
      setEventList(timelineEvents)

      relatedEventLocationIds = _.uniq(timelineEvents.map(event => event.location).filter(Boolean) as string[])
      relatedEventFactionIds = _.uniq(timelineEvents.map(event => event.faction_ids).flat().filter(Boolean) as number[])
      relatedEventCharacterIds = _.uniq(timelineEvents.map(event => event.role_ids).flat().filter(Boolean) as number[])

      setRelatedEventLocationIds(relatedEventLocationIds)
      setRelatedEventFactionIds(relatedEventFactionIds)
      setRelatedEventCharacterIds(relatedEventCharacterIds)
    }

    // 初始化表单数据
    if (selectedChapter) {
      form.setFieldsValue({
        geo_ids: selectedChapter.geo_ids || [],
        faction_ids: selectedChapter.faction_ids || [],
        role_ids: selectedChapter.role_ids || [],
        seed_prompt: selectedChapter.seed_prompt || ''
      })
    }

    fillRelatedEventRelatedInfo()


    if (selectedChapter?.worldview_id && selectedWorldView?.id !== selectedChapter?.worldview_id) {
      onUpdateWorldView(selectedChapter?.worldview_id || null)
    } 

  }, [selectedChapter, form])

  // 获取当前世界观信息
  const selectedWorldView = selectedChapter?.worldview_id 
    ? worldViewList.find(wv => wv.id === selectedChapter.worldview_id)
    : null

  // 获取关联信息
  const getRelatedInfo = () => {
    const locations = relatedEventLocationIds.map(id => 
      geoUnionList.find(geo => geo.code === id)?.name
    ).filter(Boolean) || []

    const factions = relatedEventFactionIds.map(id => 
      factionList.find(faction => faction.id === id)?.name
    ).filter(Boolean) || []

    const characters = relatedEventCharacterIds.map(id => 
      roleList.find(role => role.id === id)?.name
    ).filter(Boolean) || []

    return { locations, factions, characters }
  }

  // 处理刷新
  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      await onRefresh()
      message.success('刷新成功')
    } catch (error) {
      message.error('刷新失败')
    } finally {
      setRefreshing(false)
    }
  }

  // 添加新的骨架项
  const handleAddSkeletonItem = () => {
    const newItem: ISkeletonItem = {
      id: Date.now().toString(),
      content: '',
      order: skeletonItems.length + 1
    }
    setSkeletonItems([...skeletonItems, newItem])
  }

  // 删除骨架项
  const handleDeleteSkeletonItem = (id: string) => {
    setSkeletonItems(skeletonItems.filter(item => item.id !== id))
  }

  // 更新骨架项内容
  const handleSkeletonItemChange = (id: string, content: string) => {
    setSkeletonItems(skeletonItems.map(item =>
      item.id === id ? { ...item, content } : item
    ))
  }

  // 保存章节骨架
  const handleSaveSkeleton = async () => {
    if (!selectedChapter) return

    try {
      setLoading(true)
      // TODO: 实现保存骨架的API调用
      message.success('章节骨架保存成功')
      onChapterChange()
    } catch (error) {
      message.error('保存章节骨架失败')
    } finally {
      setLoading(false)
    }
  }

  // 从世界观复制关联信息
  const copyFromWorldView = (type: 'geo' | 'faction' | 'role') => {
    if (!selectedWorldView) {
      message.warning('请先选择世界观')
      return
    }

    let sourceData: (string | number)[] = []
    let emptyMessage = ''

    switch (type) {
      case 'geo':
        sourceData = relatedEventLocationIds
        emptyMessage = '世界观中暂无关联地点'
        break
      case 'faction':
        sourceData = relatedEventFactionIds
        emptyMessage = '世界观中暂无关联阵营'
        break
      case 'role':
        sourceData = relatedEventCharacterIds
        emptyMessage = '世界观中暂无关联角色'
        break
    }

    if (!sourceData.length) {
      message.warning(emptyMessage)
      return
    }

    const currentValues = form.getFieldsValue()
    let newValues = { ...currentValues }

    switch (type) {
      case 'geo':
        newValues.geo_ids = sourceData
        break
      case 'faction':
        newValues.faction_ids = sourceData
        break
      case 'role':
        newValues.role_ids = sourceData
        break
    }

    form.setFieldsValue(newValues)
    message.success('已从世界观复制关联信息')
  }

  // 保存章节关联信息
  const handleSaveChapterInfo = async () => {
    try {
      const values = await form.validateFields()
      if (!selectedChapter?.id) {
        message.warning('请先选择章节')
        return
      }

      // TODO: 调用API保存章节信息
      message.success('保存成功')
      onChapterChange()
    } catch (error) {
      message.error('保存失败')
    }
  }

  const { locations, factions, characters } = getRelatedInfo()

  // 渲染事件详情
  const renderEventDetail = (event: ITimelineEvent) => {
    const eventLocation = geoUnionList.find(geo => geo.code === event.location)?.name
    const eventFactions = event.faction_ids?.map(id => 
      factionList.find(faction => faction.id === id)?.name
    ).filter(Boolean) || []
    const eventCharacters = event.role_ids?.map(id => 
      roleList.find(role => role.id === id)?.name
    ).filter(Boolean) || []

    const handleCopyEvent = () => {
      const formattedDate = formatDate(event.date)
      const copyText = `${formattedDate}\n${event.title}\n${event.description}`
      navigator.clipboard.writeText(copyText)
        .then(() => message.success('已复制到剪贴板'))
        .catch(() => message.error('复制失败'))
    }

    return (
      <div className={styles.eventDetail}>
        <div className={styles.eventTitle}>
          <Space>
            {event.title}
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={handleCopyEvent}
              title="复制事件内容"
            />
          </Space>
        </div>
        <div className={styles.eventDescription}>{event.description}</div>
        {eventLocation && (
          <div className={styles.eventMeta}>
            <Text type="secondary">地点：</Text>
            <Tag color="blue">{eventLocation}</Tag>
          </div>
        )}
        {eventFactions.length > 0 && (
          <div className={styles.eventMeta}>
            <Text type="secondary">阵营：</Text>
            <Space wrap>
              {eventFactions.map((faction, index) => (
                <Tag key={index} color="green">{faction}</Tag>
              ))}
            </Space>
          </div>
        )}
        {eventCharacters.length > 0 && (
          <div className={styles.eventMeta}>
            <Text type="secondary">角色：</Text>
            <Space wrap>
              {eventCharacters.map((character, index) => (
                <Tag key={index} color="purple">{character}</Tag>
              ))}
            </Space>
          </div>
        )}
      </div>
    )
  }

  const formatDate = (date: number) => {
    if (!selectedWorldView) {
      return '时间点 ' + date
    }

    const timelineDateFormatter = TimelineDateFormatter.fromWorldViewWithExtra(selectedWorldView)
    return timelineDateFormatter.formatSecondsToDate(date)
  }

  return (
    <div className={styles.container}>
      {/* 世界观信息展示 */}
      <div className={styles.worldViewInfo}>
        {selectedWorldView ? (
          <>
            <div className={styles.worldViewTitle}>
              <Space>
                <Text strong>世界观：</Text>
                <Text>{selectedWorldView.title}</Text>
                <Button
                  type="link"
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  loading={refreshing}
                >
                  刷新
                </Button>
              </Space>
            </div>
            <div className={styles.relatedInfo}>
              <div className={styles.relatedInfoItem}>
                <Text strong>关联地点：</Text>
                <div className={styles.tagsContainer}>
                  {locations.length > 0 ? (
                    locations.map((location, index) => (
                      <Tag key={index} color="blue">{location}</Tag>
                    ))
                  ) : (
                    <Text type="secondary">暂无关联地点</Text>
                  )}
                </div>
              </div>
              <div className={styles.relatedInfoItem}>
                <Text strong>关联阵营：</Text>
                <div className={styles.tagsContainer}>
                  {factions.length > 0 ? (
                    factions.map((faction, index) => (
                      <Tag key={index} color="green">{faction}</Tag>
                    ))
                  ) : (
                    <Text type="secondary">暂无关联阵营</Text>
                  )}
                </div>
              </div>
              <div className={styles.relatedInfoItem}>
                <Text strong>关联角色：</Text>
                <div className={styles.tagsContainer}>
                  {characters.length > 0 ? (
                    characters.map((character, index) => (
                      <Tag key={index} color="purple">{character}</Tag>
                    ))
                  ) : (
                    <Text type="secondary">暂无关联角色</Text>
                  )}
                </div>
              </div>
              <div className={styles.relatedInfoItem}>
                <Text strong>关联事件：</Text>
                <div className={styles.eventsContainer}>
                  {eventList.length > 0 ? (
                    eventList.map((event, index) => (
                      <div key={index} className={styles.eventCard}>
                        <div className={styles.eventCardHeader}>
                          <div className={styles.eventCardTitle}>{event.title}</div>
                          <div className={styles.eventCardTimestamp}>
                            {formatDate(event.date)}
                          </div>
                        </div>
                        <div className={styles.eventCardDescription}>
                          <Space>
                            {event.description}
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={() => {
                                const formattedDate = formatDate(event.date)
                                const copyText = `${formattedDate}\n${event.title}\n${event.description}`
                                navigator.clipboard.writeText(copyText)
                                  .then(() => message.success('已复制到剪贴板'))
                                  .catch(() => message.error('复制失败'))
                              }}
                              title="复制事件内容"
                            />
                          </Space>
                        </div>
                      </div>
                    ))
                  ) : (
                    <Text type="secondary">暂无关联事件</Text>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.emptyWorldView}>
            <Space direction="vertical" align="center" style={{ width: '100%' }}>
              <Text type="secondary">请先编辑章节事件池，设置世界观和关联信息</Text>
              <Space>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={onEditEventPool}
                >
                  编辑事件池
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  loading={refreshing}
                >
                  刷新
                </Button>
              </Space>
            </Space>
          </div>
        )}
      </div>

      {/* 章节关联信息表单 */}
      <Form
        form={form}
        className={styles.chapterInfo}
        layout="vertical"
      >
        <div className={styles.formHeader}>
          <Text strong>章节关联信息</Text>
          <Button type="primary" onClick={handleSaveChapterInfo}>
            保存
          </Button>
        </div>

        <Form.Item
          label={
            <div className={styles.formItemLabel}>
              <Text strong>章节关联地点</Text>
              <Button
                type="link"
                icon={<CopyOutlined />}
                onClick={() => copyFromWorldView('geo')}
                disabled={!relatedEventLocationIds.length}
              >
                从世界观复制
              </Button>
            </div>
          }
          name="geo_ids"
        >
          <Select
            mode="multiple"
            placeholder="请选择关联地点"
            optionFilterProp="children"
            className={styles.multiSelect}
          >
            {geoUnionList.map(geo => (
              <Option key={geo.code} value={geo.code}>
                {geo.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label={
            <div className={styles.formItemLabel}>
              <Text strong>章节关联阵营</Text>
              <Button
                type="link"
                icon={<CopyOutlined />}
                onClick={() => copyFromWorldView('faction')}
                disabled={!relatedEventFactionIds.length}
              >
                从世界观复制
              </Button>
            </div>
          }
          name="faction_ids"
        >
          <Select
            mode="multiple"
            placeholder="请选择关联阵营"
            optionFilterProp="children"
            className={styles.multiSelect}
          >
            {factionList.map(faction => (
              <Option key={faction.id} value={faction.id}>
                {faction.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label={
            <div className={styles.formItemLabel}>
              <Text strong>章节关联角色</Text>
              <Button
                type="link"
                icon={<CopyOutlined />}
                onClick={() => copyFromWorldView('role')}
                disabled={!relatedEventCharacterIds.length}
              >
                从世界观复制
              </Button>
            </div>
          }
          name="role_ids"
        >
          <Select
            mode="multiple"
            placeholder="请选择关联角色"
            optionFilterProp="children"
            className={styles.multiSelect}
          >
            {roleList.map(role => (
              <Option key={role.id} value={role.id}>
                {role.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label={<Text strong>章节根提示词</Text>}
          name="seed_prompt"
        >
          <TextArea
            placeholder="请输入章节根提示词"
            autoSize={{ minRows: 8, maxRows: 15 }}
            className={styles.promptTextArea}
            showCount
            maxLength={2000}
          />
        </Form.Item>
      </Form>

      {/* 骨架操作按钮 */}
      <div className={styles.skeletonActions}>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddSkeletonItem}
          >
            添加骨架项
          </Button>
          <Button
            type="primary"
            onClick={handleSaveSkeleton}
            loading={loading}
          >
            保存骨架
          </Button>
        </Space>
      </div>

      <div className={styles.skeletonList}>
        {skeletonItems.map((item, index) => (
          <div key={item.id} className={styles.skeletonItem}>
            <Row gutter={16} align="middle">
              <Col span={1}>
                <Text type="secondary">{index + 1}.</Text>
              </Col>
              <Col span={22}>
                <TextArea
                  value={item.content}
                  onChange={(e) => handleSkeletonItemChange(item.id, e.target.value)}
                  placeholder="请输入骨架内容"
                  autoSize={{ minRows: 2, maxRows: 6 }}
                />
              </Col>
              <Col span={1}>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteSkeletonItem(item.id)}
                />
              </Col>
            </Row>
          </div>
        ))}
        {skeletonItems.length === 0 && (
          <div className={styles.emptyTip}>
            <Text type="secondary">暂无骨架项，请点击"添加骨架项"按钮开始创建</Text>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChapterSkeletonPanel 