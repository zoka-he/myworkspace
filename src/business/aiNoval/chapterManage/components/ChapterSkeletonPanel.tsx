import React, { useEffect, useState } from 'react'
import { Space, Typography, Button, Input, message, Form, Tag, Select, TreeSelect } from 'antd'
import { ReloadOutlined, EditOutlined, CopyOutlined, SortAscendingOutlined } from '@ant-design/icons'
import { IChapter, IWorldViewDataWithExtra, IGeoUnionData, IFactionDefData, IRoleData, ITimelineEvent, IGeoStarSystemData, IGeoGeographyUnitData, IGeoPlanetData, IGeoSatelliteData, IGeoStarData } from '@/src/types/IAiNoval'
import styles from './ChapterSkeletonPanel.module.scss'
import { getTimelineEventByIds, updateChapter, getChapterById, getChapterList } from '../apiCalls'
import _ from 'lodash'
import { TimelineDateFormatter } from '@/src/business/aiNoval/common/novelDateUtils'
import * as apiCalls from '../apiCalls'
import { loadGeoTree, type IGeoTreeItem } from '../../common/geoDataUtil'

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
  const [form] = Form.useForm()
  const [skeletonItems, setSkeletonItems] = useState<ISkeletonItem[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isReordering, setIsReordering] = useState(false)

  const [selectedChapter, setSelectedChapter] = useState<IChapter | null>(null)
  const [eventList, setEventList] = useState<ITimelineEvent[]>([])

  const [relatedEventFactionIds, setRelatedEventFactionIds] = useState<number[]>([])
  const [relatedEventCharacterIds, setRelatedEventCharacterIds] = useState<number[]>([])
  const [relatedEventLocationIds, setRelatedEventLocationIds] = useState<string[]>([])

  const [worldViewId, setWorldViewId] = useState<number | null>(null)
  const [worldViewList, setWorldViewList] = useState<IWorldViewDataWithExtra[]>([])
  const [geoUnionList, setGeoUnionList] = useState<IGeoUnionData[]>([])
  const [geoTree, setGeoTree] = useState<IGeoTreeItem<IGeoStarSystemData | IGeoStarData | IGeoPlanetData | IGeoSatelliteData | IGeoGeographyUnitData>[]>([])
  const [factionList, setFactionList] = useState<IFactionDefData[]>([])
  const [factionTree, setFactionTree] = useState<IFactionDefData[]>([])
  const [roleList, setRoleList] = useState<IRoleData[]>([])

  const [chapterList, setChapterList] = useState<IChapter[]>([])

  // 初始化数据
  useEffect(() => {
    reloadChapter();
    apiCalls.getWorldViewList().then((res) => {
      setWorldViewList(res.data);
    })
    reloadChapterList();
  }, [])
  
  useEffect(() => {
    reloadChapter();
  }, [selectedChapterId])

  useEffect(() => {
    if (worldViewId) {
      Promise.all([
        // loadGeoUnionList(worldViewId),
        loadGeoTree(worldViewId),
        apiCalls.loadFactionList(worldViewId),
        apiCalls.loadRoleList(worldViewId)
      ]).then(([geoTree, factionRes, roleRes]) => {
        // setGeoUnionList(geoUnionRes);
        setGeoTree(geoTree);
        setFactionList(factionRes);
        setRoleList(roleRes);
      })
    }
  }, [worldViewId])

  // 重新加载章节
  const reloadChapter = async () => {
    let chapter = null;

    if (selectedChapterId) {
      chapter = await getChapterById(selectedChapterId)
      // console.debug('Loaded chapter:', chapter);
    }

    setSelectedChapter(chapter)
    if (chapter?.worldview_id) {
      setWorldViewId(chapter.worldview_id);
    }

    return chapter;
  }

  useEffect(() => {
    reloadChapterList();
  }, [novelId])

  // 获取章节列表
  const reloadChapterList = async () => {
    if (novelId) {
      // console.debug('call reloadChapterList', novelId);
      const res = await getChapterList(novelId, 1, 500)
      // console.debug('reloadChapterList res', res);
      setChapterList(res.data)
    } else {
      setChapterList([])
    }
  }

  // 章节更新事件
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
        setEventList([]);
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

    fillRelatedEventRelatedInfo()

    if (selectedChapter?.worldview_id && selectedWorldView?.id !== selectedChapter?.worldview_id) {
      onUpdateWorldView(selectedChapter?.worldview_id || null)
    } 

  }, [selectedChapter])

  // 监听关联信息变化，更新表单
  useEffect(() => {
    if (selectedChapter) {
      console.debug('Updating form with chapter data:', selectedChapter);

      form.setFieldsValue({
        // geo_ids: (selectedChapter.geo_ids || []).map(item => { value: item }),
        geo_ids: selectedChapter.geo_ids || [],
        faction_ids: selectedChapter.faction_ids || [],
        role_ids: selectedChapter.role_ids || [],
        seed_prompt: selectedChapter.seed_prompt || '',
        related_chapter_ids: selectedChapter.related_chapter_ids || []
      })
    }
  }, [selectedChapter])

  // 当阵营列表更新时，自动构建阵营树
  useEffect(() => {
    if (!factionList.length) {
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

  }, [factionList])

  const findGeoTree = (codes: string[]): (IGeoStarSystemData | IGeoStarData | IGeoPlanetData | IGeoSatelliteData | IGeoGeographyUnitData)[] => {
    let result: (IGeoStarSystemData | IGeoStarData | IGeoPlanetData | IGeoSatelliteData | IGeoGeographyUnitData)[] = [];

    if (!codes.length) {
      return result;
    }

    
    function findInNodes(nodes?: IGeoTreeItem<IGeoStarSystemData | IGeoStarData | IGeoPlanetData | IGeoSatelliteData | IGeoGeographyUnitData>[]) {
      if (!nodes ||!nodes.length) {
        return;
      }

      for (const node of nodes) {
        if (codes.includes(node.key)) {
          result.push(node.data)
        }

        if (node.children) {
          findInNodes(node.children)
        }
      }
    }

    findInNodes(geoTree);

    return result;
  }

  // 获取当前世界观信息
  const selectedWorldView = selectedChapter?.worldview_id 
    ? worldViewList.find(wv => wv.id === selectedChapter.worldview_id)
    : null

  // 获取事件关联信息
  // TODO: 修正地理位置的获取方式
  const getRelatedInfo = () => {
    // const locations = relatedEventLocationIds.map(id => 
    //   geoUnionList.find(geo => geo.code === id)?.name
    // ).filter(Boolean) || []

    const locations = findGeoTree(relatedEventLocationIds);

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
      await reloadChapter()
      await reloadChapterList()
      message.success('刷新成功')
    } catch (error) {
      message.error('刷新失败')
    } finally {
      setRefreshing(false)
    }
  }

  // 从关联信息复制
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
    message.success('已从关联信息复制关联信息')
  }

  // 保存章节关联信息
  const handleSaveChapterInfo = async () => {
    try {
      const values = await form.validateFields()
      if (!selectedChapter?.id) {
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
        id: selectedChapter.id,
        geo_ids: processIds<string>(values.geo_ids),
        faction_ids: processIds<number>(values.faction_ids),
        role_ids: values.role_ids,
        seed_prompt: values.seed_prompt,
        related_chapter_ids: values.related_chapter_ids
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

  const { locations, factions, characters } = getRelatedInfo()

  // 渲染事件详情
  // const renderEventDetail = (event: ITimelineEvent) => {
  //   const eventLocation = geoUnionList.find(geo => geo.code === event.location)?.name
  //   const eventFactions = event.faction_ids?.map(id => 
  //     factionList.find(faction => faction.id === id)?.name
  //   ).filter(Boolean) || []
  //   const eventCharacters = event.role_ids?.map(id => 
  //     roleList.find(role => role.id === id)?.name
  //   ).filter(Boolean) || []

  //   const handleCopyEvent = () => {
  //     const formattedDate = formatDate(event.date)
  //     const copyText = `${formattedDate}\n${event.title}\n${event.description}`
  //     navigator.clipboard.writeText(copyText)
  //       .then(() => message.success('已复制到剪贴板'))
  //       .catch(() => message.error('复制失败'))
  //   }

  //   return (
  //     <div className={styles.eventDetail}>
  //       <div className={styles.eventTitle}>
  //         <Space>
  //           {event.title}
  //           <Button
  //             type="text"
  //             icon={<CopyOutlined />}
  //             onClick={handleCopyEvent}
  //             title="复制事件内容"
  //           />
  //         </Space>
  //       </div>
  //       <div className={styles.eventDescription}>{event.description}</div>
  //       {eventLocation && (
  //         <div className={styles.eventMeta}>
  //           <Text type="secondary">地点：</Text>
  //           <Tag color="blue">{eventLocation}</Tag>
  //         </div>
  //       )}
  //       {eventFactions.length > 0 && (
  //         <div className={styles.eventMeta}>
  //           <Text type="secondary">阵营：</Text>
  //           <Space wrap>
  //             {eventFactions.map((faction, index) => (
  //               <Tag key={index} color="green">{faction}</Tag>
  //             ))}
  //           </Space>
  //         </div>
  //       )}
  //       {eventCharacters.length > 0 && (
  //         <div className={styles.eventMeta}>
  //           <Text type="secondary">角色：</Text>
  //           <Space wrap>
  //             {eventCharacters.map((character, index) => (
  //               <Tag key={index} color="purple">{character}</Tag>
  //             ))}
  //           </Space>
  //         </div>
  //       )}
  //     </div>
  //   )
  // }

  // 格式化小说时间
  const formatDate = (date: number) => {
    if (!selectedWorldView) {
      return '时间点 ' + date
    }

    const timelineDateFormatter = TimelineDateFormatter.fromWorldViewWithExtra(selectedWorldView)
    return timelineDateFormatter.formatSecondsToDate(date)
  }

  // 添加关联上一章
  const handleAddPreviousChapter = () => {
    if (!chapterList.length) {
      message.warning('未加载到章节，请检查数据或代码')
      return
    }

    let currentChapterNumber = selectedChapter?.chapter_number;
    let currentChaoterVersion = selectedChapter?.version;

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
                    locations.map((location) => (
                      <Tag key={location.code} color="blue">{location.name}</Tag>
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
                disabled={!relatedEventLocationIds.length}
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
                disabled={!relatedEventFactionIds.length}
              >
                从关联信息复制
              </Button>
            </div>
          }
          name="faction_ids"
        >
          {/* <Select
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
          </Select> */}

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
                disabled={!relatedEventCharacterIds.length}
              >
                从关联信息复制
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
          label={<Text strong>章节提示词（在生成面板中，会根据双换行进行切分）</Text>}
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
      
    </div>
  )
}

export default ChapterSkeletonPanel 