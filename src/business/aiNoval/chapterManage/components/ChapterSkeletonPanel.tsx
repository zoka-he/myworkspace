import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Space, Typography, Button, Input, message, Form, Tag, Select, TreeSelect, Row, Col, GetRef, Divider, Affix } from 'antd'
import { ReloadOutlined, EditOutlined, CopyOutlined, SortAscendingOutlined, RobotOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { IChapter, IWorldViewDataWithExtra, IGeoUnionData, IFactionDefData, IRoleData, ITimelineEvent, IGeoStarSystemData, IGeoGeographyUnitData, IGeoPlanetData, IGeoSatelliteData, IGeoStarData } from '@/src/types/IAiNoval'
import styles from './ChapterSkeletonPanel.module.scss'
import { getTimelineEventByIds, updateChapter, getChapterById, getChapterList } from '../apiCalls'
import _, { divide } from 'lodash'
import { TimelineDateFormatter } from '@/src/business/aiNoval/common/novelDateUtils'
import * as apiCalls from '../apiCalls'
import { loadGeoTree, transfromGeoUnionToGeoTree, type IGeoTreeItem } from '../../common/geoDataUtil'
import { ModalProvider, showGenSkeletonModal, useGenSkeletonModal } from './GenSkeletonModal'
import GenRolePanel from './GenRolePanel'
import copyToClip from '@/src/utils/common/copy'
import PromptTools from './PromptTools'
import AttentionRefModal from './AttentionRefModal'
import { useWorldViewContext } from '../WorldViewContext'
import { useChapterContext } from '../chapterContext'

const { Text } = Typography
const { TextArea } = Input
const { Option } = Select

interface ChapterSkeletonPanelProps {
  selectedChapterId?: number | null
  novelId?: number | null
  onChapterChange: () => void
  onRefresh: () => void
  onEditEventPool: () => void
  onUpdateWorldView: (worldViewId?: number | null) => void
}

interface ISkeletonItem {
  id: string
  content: string
  order: number
}

function ChapterSkeletonPanel({ 
  selectedChapterId, 
  novelId,
  onChapterChange,
  onEditEventPool,
  onUpdateWorldView
}: ChapterSkeletonPanelProps) {
  const { state: chapterContext, forceUpdateChapter } = useChapterContext();
  const { worldViewData, geoUnionList, factionList, roleList } = useWorldViewContext();

  const [form] = Form.useForm()
  
  const [refreshing, setRefreshing] = useState(false)
  const [isReordering, setIsReordering] = useState(false)

  const [eventList, setEventList] = useState<ITimelineEvent[]>([])

  const [geoTree, setGeoTree] = useState<IGeoTreeItem<IGeoStarSystemData | IGeoStarData | IGeoPlanetData | IGeoSatelliteData | IGeoGeographyUnitData>[]>([])
  const [factionTree, setFactionTree] = useState<IFactionDefData[]>([])

  const [chapterList, setChapterList] = useState<IChapter[]>([])
  const [isGenRoleModalVisible, setIsGenRoleModalVisible] = useState(false)
  const [isAttentionRefModalVisible, setIsAttentionRefModalVisible] = useState(false)

  const promptTextAreaRef = useRef<GetRef<typeof Input.TextArea> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLElement | null>(null)

  // 获取事件关联信息
  const locations = chapterContext?.geo_ids || [];
  const factions = chapterContext?.faction_ids || []
  const characters = chapterContext?.role_ids || []

  // 查找滚动容器（Card 的 body）
  useEffect(() => {
    if (containerRef.current) {
      // 向上查找最近的 .ant-card-body 元素
      let parent = containerRef.current.parentElement
      while (parent) {
        if (parent.classList.contains('ant-card-body')) {
          scrollContainerRef.current = parent
          break
        }
        parent = parent.parentElement
      }
    }
  }, [])

  useEffect(() => {
    if (geoUnionList) {
      setGeoTree(transfromGeoUnionToGeoTree(geoUnionList)); 
    } else {
      setGeoTree([]);
    }
  }, [geoUnionList])

  // 重新加载章节
  const reloadCurrentChapter = async () => {
    if (chapterContext?.id) {
      await forceUpdateChapter(chapterContext.id);
    }
  }

  useEffect(() => {
    reloadFullChapterList();
  }, [chapterContext?.novel_id])

  // 获取章节列表
  const reloadFullChapterList = async () => {
    if (chapterContext?.novel_id) {
      const res = await getChapterList(chapterContext.novel_id, 1, 500)
      setChapterList(res.data)
    } else {
      setChapterList([])
    }
  }

  
  // 当章节数据变更时，获取事件关联信息
  useEffect(() => {
    (async () => {
      if (!chapterContext?.event_ids?.length) {
        setEventList([]);
        return;
      }

      let timelineEvents = (await getTimelineEventByIds(chapterContext.event_ids)).data || []
      setEventList(timelineEvents);
    })();
  }, [chapterContext])

  // 监听关联信息变化，更新表单
  useEffect(() => {
    if (chapterContext) {
      console.debug('Updating form with chapter data:', chapterContext);

      // 应用章节数据
      form.setFieldsValue({
        geo_ids: chapterContext.geo_ids || [],
        faction_ids: chapterContext.faction_ids || [],
        role_ids: chapterContext.role_ids || [],
        seed_prompt: chapterContext.seed_prompt || '',
        related_chapter_ids: chapterContext.related_chapter_ids || [],
        skeleton_prompt: chapterContext.skeleton_prompt || '',
        extra_settings: chapterContext.extra_settings || '',
        attension: chapterContext.attension || ''
      })
    }
  }, [chapterContext])

  // 当阵营列表更新时，自动构建阵营树
  useEffect(() => {
    if (!factionList || !factionList.length) {
      setFactionTree([]);
      return;
    }

    const result: IFactionDefData[] = [];

    const factionMap = new Map(); 
    factionList.forEach(item => {
      factionMap.set(item.id, { key: item.id, title: item.name, data: item, children: [] })
    });

    factionList.forEach(item => {
      if (item.parent_id) {
        const parent = factionMap.get(item.parent_id);
        const child = factionMap.get(item.id);
        if (parent && child) {
          parent.children.push(child);
        }
      } else {
        result.push(factionMap.get(item.id));
      }
    });

    setFactionTree(result);

  }, [])

  
  

  // 处理刷新
  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      await reloadCurrentChapter()
      await reloadFullChapterList()
      message.success('刷新成功')
    } catch (error) {
      message.error('刷新失败')
    } finally {
      setRefreshing(false)
    }
  }

  // 从关联信息复制
  const copyFromWorldView = (type: 'geo' | 'faction' | 'role') => {
    if (!worldViewData) {
      message.warning('请先选择世界观')
      return
    }

    let sourceData: (string | number)[] = []
    let emptyMessage = ''

    switch (type) {
      case 'geo':
        sourceData = Array.from(locations)
        emptyMessage = '世界观中暂无关联地点'
        break
      case 'faction':
        sourceData = Array.from(factions)
        emptyMessage = '世界观中暂无关联阵营'
        break
      case 'role':
        sourceData = Array.from(characters)
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
    message.success('已从关联信息复制关联信息')
  }

  // 保存章节关联信息
  const handleSaveChapterInfo = async () => {
    try {
      const values = await form.validateFields()
      if (!chapterContext?.id) {
        message.warning('请先选择章节')
        return
      }

      // 处理飘忽不定的树选择器值，fuck antd
      const processTreeSelectValue = <T extends string | number>(value: T | { value: T }): T => {
        if (typeof value === 'string') {
          return value;
        }

        if (typeof value === 'number') {
          return value;
        }

        return value.value;
      }

      // 处理异常值
      const processIds = <T extends string | number>(value: T[] | { value: T }[] | T | undefined): T[] => {
        if (!value) {
          return [];
        }

        if (value instanceof Array) {
          return value.map(processTreeSelectValue<T>)
        } else {
          return [];
        }
      }

      let updateObject: IChapter = {
        id: chapterContext.id,
        geo_ids: processIds<string>(values.geo_ids),
        faction_ids: processIds<number>(values.faction_ids),
        role_ids: values.role_ids,
        seed_prompt: values.seed_prompt,
        related_chapter_ids: values.related_chapter_ids,
        skeleton_prompt: values.skeleton_prompt,
        attension: values.attension,
        extra_settings: values.extra_settings
      };

      // console.debug('updateObject', updateObject);

      await updateChapter(updateObject);

      // TODO: 调用API保存章节信息
      message.success('保存成功')
      onChapterChange()
    } catch (error) {
      console.error('保存失败', error);
      message.error('保存失败：' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  // 格式化小说时间
  const formatDate = (date: number) => {
    if (!worldViewData) {
      return '时间点 ' + date
    }

    const timelineDateFormatter = TimelineDateFormatter.fromWorldViewWithExtra(worldViewData)
    return timelineDateFormatter.formatSecondsToDate(date)
  }

  // 添加关联上一章
  const handleAddPreviousChapter = () => {
    if (!chapterList.length) {
      message.warning('未加载到章节，请检查数据或代码')
      return
    }

    let currentChapterNumber = chapterContext?.chapter_number;
    let currentChaoterVersion = chapterContext?.version;

    if (!currentChapterNumber || !currentChaoterVersion) {
      message.warning('当前章节号或版本号缺失，请检查数据或代码')
      return
    }

    let previousChapter = chapterList.find(chapter => chapter.chapter_number === currentChapterNumber! - 1 && chapter.version === currentChaoterVersion)
    if (!previousChapter) {
      message.warning('未找到上一章节，请确认不是第一章、不是故事线第一张，再检查数据或代码');
      return
    }
    
    // 假如上一章不在列表中，加入列表
    const currentValues = form.getFieldsValue()
    const relatedChapters = currentValues.related_chapter_ids || []
    if (!relatedChapters.includes(previousChapter.id)) {
      relatedChapters.push(previousChapter.id)
    }

    // 按章节id排序
    const sortedChapters = [...relatedChapters].sort((a, b) => a - b)
    
    // 更新表单值
    form.setFieldsValue({
      related_chapter_ids: sortedChapters
    })

  }

  // 处理章节重排序
  const handleReorderChapters = () => {
    const currentValues = form.getFieldsValue()
    const relatedChapters = currentValues.related_chapter_ids || []
    
    if (relatedChapters.length <= 1) {
      message.warning('请先选择多个相关章节')
      return
    }

    setIsReordering(true)
    
    // 获取选中章节的详细信息
    const selectedChapters = relatedChapters.map((chapterId: number) => 
      chapterList.find(chapter => chapter.id === chapterId)
    ).filter((chapter: IChapter | undefined): chapter is IChapter => 
      chapter !== undefined && typeof chapter.chapter_number === 'number'
    )

    // 按章节号排序
    const sortedChapters = [...selectedChapters].sort((a, b) => a.chapter_number - b.chapter_number)
    
    // 更新表单值
    form.setFieldsValue({
      related_chapter_ids: sortedChapters.map(chapter => chapter.id)
    })

    message.success('已按章节号重新排序')
    setIsReordering(false)
  }


  return (
    <div ref={containerRef} className={styles.container}>
      <ModalProvider>
        {/* 世界观信息展示 */}
        <div className={styles.worldViewInfo}>
          {worldViewData ? (
            <>
              <div className={styles.worldViewTitle}>
                <Space>
                  <Text strong>世界观：</Text>
                  <Text>{worldViewData.title}</Text>
                  <Button type="link" icon={<ReloadOutlined />} onClick={handleRefresh} loading={refreshing}>
                    刷新
                  </Button>
                </Space>
              </div>

              <div className={styles.relatedInfo}>
                <div className={styles.relatedInfoItem}>
                  <Text strong>关联地点：</Text>
                  <div className={styles.tagsContainer}>
                    {locations.length > 0 ? (
                      locations.map((code) => (
                        <LocationTag key={code} code={code} />
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
                        <FactionTag key={index} faction={faction} />
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
                        <CharacterTag key={index} character={character} />
                      ))
                    ) : (
                      <Text type="secondary">暂无关联角色</Text>
                    )}
                  </div>
                </div>

                {/* <div className={styles.relatedInfoItem}>
                  <Text strong>关联事件：</Text>
                  <div className={styles.eventsContainer}>
                    {eventList.length > 0 ? (
                      eventList.map((event, index) => (
                        <EventTag key={index} event={event} />
                      ))
                    ) : (
                      <Text type="secondary">暂无关联事件</Text>
                    )}
                  </div>
                </div> */}
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

          <Form.Item label={
              <div className={styles.formItemLabel}>
                <Text strong>相关章节</Text>
                <Button
                  type="link"
                  icon={<CopyOutlined />}
                  onClick={handleAddPreviousChapter}
                >
                  关联上一章
                </Button>
                <Button
                  type="link"
                  icon={<SortAscendingOutlined />}
                  onClick={handleReorderChapters}
                  loading={isReordering}
                >
                  重排序
                </Button>
              </div>
            } name="related_chapter_ids">
            <Select
              mode="multiple"
              placeholder="请选择相关章节"
              optionFilterProp="children"
              className={styles.multiSelect}
            >
              { chapterList.reverse().map(chapter => (
                <Select.Option value={chapter.id}>{chapter.chapter_number} {chapter.title} : v{chapter.version}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label={
              <div className={styles.formItemLabel}>
                <Text strong>章节关联地点</Text>
                <Button
                  type="link"
                  icon={<CopyOutlined />}
                  onClick={() => copyFromWorldView('geo')}
                  disabled={!locations?.length}
                >
                  从关联信息复制
                </Button>
              </div>
            }
            name="geo_ids"
          >
            <TreeSelect
              treeData={geoTree || []}
              placeholder="请选择发生地点"
              allowClear
              treeDefaultExpandAll
              showSearch
              treeNodeFilterProp="title"
              multiple
              treeCheckable
              treeCheckStrictly={true}
              showCheckedStrategy={TreeSelect.SHOW_ALL}
              fieldNames={{label:'title', value: 'key'}}    // fuck antd
            >
            </TreeSelect>
          </Form.Item>

          <Form.Item
            label={
              <div className={styles.formItemLabel}>
                <Text strong>章节关联阵营</Text>
                <Button
                  type="link"
                  icon={<CopyOutlined />}
                  onClick={() => copyFromWorldView('faction')}
                  disabled={!factions?.length}
                >
                  从关联信息复制
                </Button>
              </div>
            }
            name="faction_ids"
          >
            <TreeSelect
              treeData={factionTree || []}
              placeholder="请选择关联阵营"
              allowClear
              treeDefaultExpandAll
              showSearch
              treeNodeFilterProp="title"
              multiple
              treeCheckable
              treeCheckStrictly={true}
              showCheckedStrategy={TreeSelect.SHOW_ALL}
              fieldNames={{label:'title', value: 'key'}}    // fuck antd
            >
            </TreeSelect>
          </Form.Item>

          <Form.Item
            label={
              <div className={styles.formItemLabel}>
                <Text strong>章节关联角色</Text>
                <Button
                  type="link"
                  icon={<CopyOutlined />}
                  onClick={() => copyFromWorldView('role')}
                  disabled={!characters?.length}
                >
                  从关联信息复制
                </Button>
                <Button
                  type="link"
                  icon={<RobotOutlined />}
                  onClick={() => setIsGenRoleModalVisible(true)}
                >
                  获取人设灵感
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
              {(roleList || []).map(role => (
                <Option key={role.id} value={role.id}>
                  {role.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          

          <div>
            <Text strong>注意事项：</Text>
            <Button type="link" icon={<InfoCircleOutlined />} onClick={() => setIsAttentionRefModalVisible(true)}>注意事项参考模板</Button>
          </div>
          <Form.Item label={null} name="attension">
            <TextArea autoSize={{ minRows: 1 }} />
          </Form.Item>

          <div>
            <Text strong>额外设置：(慎用，会触发全库检索，产生巨大耗时，建议先切换GPU)。</Text>
          </div>
          <Form.Item label={null} name="extra_settings">
            <TextArea autoSize={{ minRows: 1 }} />
          </Form.Item>

          <Divider size='large'/>
          <Row gutter={8}>
            <Col span={6}>
              <Affix offsetTop={12} target={() => scrollContainerRef.current || window}>
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>关联事件</Text>
                  </div>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {eventList.length > 0 ? (
                      eventList.map((event, index) => (
                        <EventTag key={index} event={event} />
                      ))
                    ) : (
                      <Text type="secondary">暂无关联事件</Text>
                    )}
                  </Space>
                </div>
              </Affix>
            </Col>
            <Col span={18}>
              <div className="f-flex-two-side f-fit-width" style={{marginBottom: 12}}>
                <Text strong>章节提示词</Text>
                <Space>
                  <Button size="small" type="primary" onClick={handleSaveChapterInfo}>保存</Button>
                  <Button size="small" type="primary" danger onClick={() => handleSaveChapterInfo()}>保存并覆盖实际配置</Button>
                </Space>
              </div>
              
              <div className="f-flex-row">
                <div className="f-flex-1">
                  <Form.Item
                    label={null}
                    name="seed_prompt"
                  >
                    <TextArea
                      ref={promptTextAreaRef}
                      placeholder="请输入章节根提示词"
                      autoSize={{ minRows: 22 }}
                      className={styles.promptTextArea}
                      showCount
                    />
                  </Form.Item>
                </div>
                <div style={{ marginLeft: 10 }}>
                  <Affix offsetTop={12} target={() => scrollContainerRef.current || window}>
                    <PromptTools
                      promptTextArea={promptTextAreaRef?.current}
                      layout="vertical"
                      onChange={(prompt) => {
                        form.setFieldsValue({
                          seed_prompt: prompt
                        });
                      }}
                    />
                  </Affix>
                </div>
              </div>
            </Col>
          </Row>
        </Form>

      </ModalProvider>

      <GenRolePanel
          open={isGenRoleModalVisible}
          onCancel={() => setIsGenRoleModalVisible(false)}
          onOk={() => {}}
          worldviewId={worldViewData?.id}
          title="生成角色人设建议"
          width="80vw"
          rootPrompt={() => form.getFieldsValue()['seed_prompt']}
        />

      <AttentionRefModal
        isVisible={isAttentionRefModalVisible}
        onClose={() => setIsAttentionRefModalVisible(false)}
        content={''}
      />

    </div>
  )
}

function FactionTag({ faction }: { faction: number }) {
  const { factionList } = useWorldViewContext();
  const factionItem = factionList?.find(item => item.id === faction);
  return <Tag color="green">{factionItem?.name}</Tag>
}

function CharacterTag({ character }: { character: number }) {
  const { roleList } = useWorldViewContext();
  const characterItem = roleList?.find(item => item.id === character);
  return <Tag color="purple">{characterItem?.name}</Tag>
}

function LocationTag({ code }: { code: string }) {
  const { geoUnionList } = useWorldViewContext();
  const locationItem = geoUnionList?.find(item => item.code === code);
  return <Tag color="blue">{locationItem?.name}</Tag>
}

function formatDate(date: number, worldViewData?: IWorldViewDataWithExtra | null) {
  if (!worldViewData) {
    return '时间点 ' + date
  }

  const timelineDateFormatter = TimelineDateFormatter.fromWorldViewWithExtra(worldViewData)
  return timelineDateFormatter.formatSecondsToDate(date)
}

function EventTag({ event }: { event: ITimelineEvent }) {

  const { worldViewData } = useWorldViewContext();

  return (
    <div className={styles.eventCard}>
      <div className={styles.eventCardHeader}>
        <div className={styles.eventCardTitle}>{event.title}</div>
        <div className={styles.eventCardTimestamp}>
          {formatDate(event.date, worldViewData)}
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
              const formattedDate = formatDate(event.date, worldViewData)
              const copyText = `${formattedDate}\n${event.title}\n${event.description}`
              try {
                copyToClip(copyText)
                message.success('已复制到剪贴板')
              } catch (error) {
                console.error('handleCopyEvent error -> ', error)
                message.error('复制失败')
              }
            }}
            title="复制事件内容"
          />
        </Space>
      </div>
    </div>
  )
}

export default ChapterSkeletonPanel 