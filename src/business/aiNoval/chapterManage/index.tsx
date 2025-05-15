import React, { useState, useEffect } from 'react'
import { Card, Select, Space, Row, Col, Typography, Button, Input, message, Modal, Form, Radio, Tag, Pagination } from 'antd'
import { DragDropContext } from 'react-beautiful-dnd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import { mockEventPool } from './mockData'
import { INovalData, ITimelineEvent, IChapter, IWorldViewDataWithExtra, IGeoUnionData } from '@/src/types/IAiNoval'
import { EventPool, ExtendedNovelData } from './types'
import EventPoolPanel from './components/EventPoolPanel'
import styles from './index.module.scss'
import * as chapterApi from './apiCalls'
import { loadGeoUnionList } from '../common/geoDataUtil'

const { Text } = Typography
const { TextArea } = Input

type ModuleType = 'event-pool' | 'chapter-skeleton' | 'chapter-generate'

function ChapterManage() {
  const [novels, setNovels] = useState<ExtendedNovelData[]>([])
  const [selectedNovel, setSelectedNovel] = useState<number | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<IChapter | null>(null)
  const [selectedWorldContext, setSelectedWorldContext] = useState<string>('all')
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [editingChapter, setEditingChapter] = useState<IChapter | null>(null)
  const [activeModule, setActiveModule] = useState<ModuleType>('event-pool')
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalChapters, setTotalChapters] = useState(0)
  const [worldViewList, setWorldViewList] = useState<IWorldViewDataWithExtra[]>([])
  const [selectedWorldView, setSelectedWorldView] = useState<IWorldViewDataWithExtra | null>(null)
  const [geoUnionList, setGeoUnionList] = useState<IGeoUnionData[]>([])
  const [factionList, setFactionList] = useState<IFactionData[]>([])
  const [roleList, setRoleList] = useState<IRoleData[]>([])

  // 组件挂载时，获取小说列表和世界观列表
  useEffect(() => {
    fetchNovels()
    fetchWorldViewList()
  }, [])

  // 当小说被选中时，刷新章节列表
  useEffect(() => {
    if (selectedNovel) {
      setSelectedChapter(null)
    }
  }, [selectedNovel])

  // 获取世界观列表
  const fetchWorldViewList = async () => {
    const response = await chapterApi.getWorldViewList()
    if (response.data) {
      setWorldViewList(response.data)
    }
  }

  // 获取小说列表
  const fetchNovels = async () => {
    try {
      setLoading(true)
      const response = await chapterApi.getNovelList()
      if (response.data) {
        const novelsWithChapters = response.data.map(novel => ({ ...novel, chapters: [] }))
        setNovels(novelsWithChapters)
        
        // 如果当前没有选中的小说，且获取到的小说列表不为空，则自动选中第一本小说
        if (!selectedNovel && novelsWithChapters.length > 0) {
          handleNovelChange(novelsWithChapters[0].id || null)
        } else if (selectedNovel) {
          // 如果当前有选中的小说，刷新其章节列表
          await fetchChapters(selectedNovel)
        }
      }
    } catch (error) {
      message.error('获取小说列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 获取章节列表
  const fetchChapters = async (novelId: number, page: number = currentPage, size: number = pageSize) => {
    try {
      setLoading(true)
      const response = await chapterApi.getChapterList(novelId, page, size)
      if (response.data) {
        setNovels(prevNovels =>
          prevNovels.map(novel =>
            novel.id === novelId
              ? { ...novel, chapters: response.data }
              : novel
          )
        )
        setTotalChapters(response.count)
      }
    } catch (error) {
      message.error('获取章节列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleNovelChange = (novelId: number | null) => {
    setSelectedNovel(novelId)
    setSelectedChapter(null)
    if (novelId) {
      fetchChapters(novelId)
    }
  }

  const handleAddChapter = () => {
    setEditingChapter(null)
    form.resetFields()
    setIsModalVisible(true)

    fetchMaxChapterNumber().then(data => {
      form.setFieldsValue({
        chapter_number: data + 1,
        version: 1,
      });
    });
  }

  const fetchMaxChapterNumber = async (): Promise<number> => {
    let maxChapterNumber = 0;

    if (selectedNovel) {
      maxChapterNumber = await chapterApi.getMaxChapterNumber(selectedNovel);
    }

    return maxChapterNumber;
  }

  const handleEditChapter = (chapter: IChapter) => {
    setEditingChapter(chapter)
    form.setFieldsValue({
      chapter_number: chapter.chapter_number,
      version: chapter.version,
      title: chapter.title,
    })
    setIsModalVisible(true)
  }

  

  const handleDeleteChapter = async (chapterId: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个章节吗？',
      onOk: async () => {
        try {
          await chapterApi.deleteChapter(chapterId)
          if (selectedNovel) {
            await fetchChapters(selectedNovel)
          }
          message.success('章节已删除')
        } catch (error) {
          message.error('删除章节失败')
        }
      }
    })
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      if (editingChapter) {
        // 编辑现有章节
        const updatedChapter = {
          ...editingChapter,
          ...values
        }
        await chapterApi.updateChapter(updatedChapter)
        if (selectedNovel) {
          await fetchChapters(selectedNovel)
        }
        message.success('章节已更新')
      } else {
        // 添加新章节
        const newChapter: IChapter = {
          novel_id: selectedNovel || undefined,
          chapter_number: values.chapter_number,
          version: values.version,
          title: values.title,
          content: values.content,
          seed_prompt: '',
          skeleton_prompt: '',
          event_ids: [],
          storyline_ids: [],
          geo_ids: [],
          faction_ids: [],
          role_ids: []
        }
        await chapterApi.addChapter(newChapter)
        if (selectedNovel) {
          await fetchChapters(selectedNovel)
        }
        message.success('章节已添加')
      }
      setIsModalVisible(false)
    } catch (error) {
      message.error('保存章节失败')
    }
  }

  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page)
    if (size) {
      setPageSize(size)
    }
    if (selectedNovel) {
      fetchChapters(selectedNovel, page, size || pageSize)
    }
  }

  // 世界观变更
  const handleWorldViewChange = (value?: number | null) => {
    if (!value) {
      setSelectedWorldView(null)
      setGeoUnionList([])
      setFactionList([])
      setRoleList([])
      return
    }

    let worldView = worldViewList.find(worldView => worldView.id === value) || null;
    if (!worldView) {
      setSelectedWorldView(null)
      setGeoUnionList([])
      setFactionList([])
      setRoleList([])
      return
    }

    setSelectedWorldView(worldView);

    Promise.all([
      loadGeoUnionList(worldView.id!),
      chapterApi.loadFactionList(worldView.id!),
      chapterApi.loadRoleList(worldView.id!),
    ]).then(([geoUnionList, factionList, roleList]) => {
      setGeoUnionList(geoUnionList)
      setFactionList(factionList)
      setRoleList(roleList)
    });
  }

  /**
   * 渲染右方面板内容
   * @returns 
   */
  const renderModuleContent = () => {
    switch (activeModule) {
      case 'event-pool':
        return (
          <EventPoolPanel
            selectedWorldContext={selectedWorldContext}
            worldViewList={worldViewList}
            selectedWorldViewId={selectedWorldView?.id}
            selectedChapter={selectedChapter}
            onWorldViewChange={handleWorldViewChange}
            geoUnionList={geoUnionList}
            factionList={factionList}
            roleList={roleList}
            onChapterChange={() => fetchChapters(selectedNovel || 0)}
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
      <Row gutter={16} className='f-fit-height'>
        <Col span={8} className='f-fit-height'>
          {/* 章节列表外框 */}
          <Card 
            className='f-fit-height'
            title={  // 章节列表title
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text>选择小说：</Text>
                <Select
                  style={{ flex: 1 }}
                  placeholder="请选择小说"
                  value={selectedNovel || undefined}
                  onChange={handleNovelChange}
                  allowClear
                  loading={loading}
                >
                  {novels.map(novel => (
                    <Select.Option key={novel.id} value={novel.id}>
                      {novel.title}
                    </Select.Option>
                  ))}
                </Select>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchNovels}
                  loading={loading}
                />
              </div>
            }
          >
            {/* 章节列表内容 */}
            {selectedNovel ? (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text strong>章节列表</Text>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddChapter}
                    >
                      添加章节
                    </Button>
                  </Space>
                  <div className={styles.chapterList}>
                    {novels
                      .find(novel => novel.id === selectedNovel)
                      ?.chapters.map(chapter => (
                        <div key={chapter.id} className={styles.chapterItem}>
                          <Space style={{ cursor: 'pointer' }} onClick={() => setSelectedChapter(chapter)}>
                            <Text type="secondary">第{chapter.chapter_number}章</Text>
                            <Text>{chapter.title}</Text>
                            <Tag color="green">v{chapter.version}</Tag>
                          </Space>
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
                              onClick={() => handleDeleteChapter(chapter.id || 0)}
                            />
                          </Space>
                        </div>
                      ))}
                  </div>
                  <div style={{ marginTop: 16, textAlign: 'right' }}>
                    <Pagination
                      current={currentPage}
                      pageSize={pageSize}
                      total={totalChapters}
                      onChange={handlePageChange}
                      showSizeChanger
                      showQuickJumper
                      showTotal={(total) => `共 ${total} 章`}
                    />
                  </div>
                </div>
              </Space>
            ) : (
              <div className={styles.selectPrompt}>
                <Text>请先选择小说</Text>
              </div>
            )}
          </Card>
        </Col>

        <Col span={16} className="f-fit-height">
          {/* 右方面板 */}
          <Card
            className="f-fit-height"
            title={  // 右方面板title
              <Space>
                { selectedChapter ? [
                  <Text>当前章节：</Text>, 
                  <Text>第{selectedChapter.chapter_number}章</Text>,
                  <Text>{selectedChapter.title}</Text>,
                  <Tag color='green'>v{selectedChapter.version}</Tag>
                  ] : null}
                <Radio.Group
                  value={activeModule}
                  onChange={e => setActiveModule(e.target.value)}
                  buttonStyle="solid"
                >
                  <Radio.Button value="event-pool">事件池管理</Radio.Button>
                  <Radio.Button value="chapter-skeleton">章节骨架</Radio.Button>
                  <Radio.Button value="chapter-generate">章节生成</Radio.Button>
                </Radio.Group>
              </Space>
            }
          >
            {selectedNovel && selectedChapter ? (
              /* 右方面板内容 */
              renderModuleContent()
            ) : (
              <div className={styles.selectPrompt}>
                <Text>请先选择小说和章节</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 添加章节modal */}
      <Modal
        title={editingChapter ? '编辑章节' : '添加章节'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        width={800}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="chapter_number"
            label="章节号"
            rules={[{ required: true, message: '请输入章节号' }]}
          >
            <Input type="number" placeholder="请输入章节号" />
          </Form.Item>
          <Form.Item
            name="version"
            label="版本号"
            rules={[{ required: true, message: '请输入版本号' }]}
          >
            <Input type="number" placeholder="请输入版本号" />
          </Form.Item>
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