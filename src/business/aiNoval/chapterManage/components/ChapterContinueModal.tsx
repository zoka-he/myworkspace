import React, { useEffect, useState, useRef } from 'react'
import { Modal, Button, Space, message, Row, Col, Form, Select, Checkbox, Divider, Input, Tag, Typography, Card } from 'antd'
import { CopyOutlined, EditOutlined, RedoOutlined, RobotOutlined } from '@ant-design/icons'
import { IChapter } from '@/src/types/IAiNoval'
import * as chapterApi from '../apiCalls'
import styles from './ChapterContinuePanel.module.scss'
import * as apiCalls from '../apiCalls'
import TextArea from 'antd/es/input/TextArea'

interface ChapterContinueModalProps {
  selectedChapterId: number | undefined
  isVisible: boolean
  onClose: () => void
  onChapterChange: () => void
}

interface ChapterStripReport {
  state: 'pending' | 'processing' | 'completed'
  chapterNumber: number
  chapterTitle: string
  version: number
  id?: number
  originalContent?: string
  strippedContent?: string
}

interface ContentViewModalProps {
  isVisible: boolean
  onClose: () => void
  content: string
  chapterInfo: {
    chapterNumber: number
    chapterTitle: string
    version: number
  } | null
  type: 'original' | 'stripped'
}

function ContentViewModal({ isVisible, onClose, content, chapterInfo, type }: ContentViewModalProps) {
  const modalTitle = chapterInfo 
    ? `${chapterInfo.chapterNumber} ${chapterInfo.chapterTitle} (v${chapterInfo.version}) - ${type === 'original' ? '原文' : '缩写'}`
    : ''

  return (
    <Modal
      title={modalTitle}
      open={isVisible}
      onCancel={onClose}
      width={'60vw'}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
    >
      <div style={{ 
        maxHeight: '60vh', 
        overflow: 'auto',
        padding: '16px',
        backgroundColor: '#fafafa',
        borderRadius: '4px'
      }}>
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
          {content}
        </Typography.Paragraph>
      </div>
    </Modal>
  )
}

function ChapterContinueModal({ selectedChapterId, isVisible, onClose, onChapterChange }: ChapterContinueModalProps) {
  const [continuedContent, setContinuedContent] = useState('')
  const [isContinuing, setIsContinuing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [form] = Form.useForm()

  const [selectedChapter, setSelectedChapter] = useState<any | null>(null)
  const [novelId, setNovelId] = useState<number | undefined>(undefined)
  const [chapterList, setChapterList] = useState<IChapter[]>([])
  const [relatedChapterIds, setRelatedChapterIds] = useState<number[]>([])
  const [seedPrompt, setSeedPrompt] = useState<string>('')
  const [roleNames, setRoleNames] = useState<string>('')
  const [factionNames, setFactionNames] = useState<string>('')
  const [geoNames, setGeoNames] = useState<string>('')

  // 是否参考本章已有内容
  const [isReferSelf, setIsReferSelf] = useState<boolean>(true)

  // 是否缩写本章
  const [isStripSelf, setIsStripSelf] = useState<boolean>(false)

  // 是否继续编写
  const [keepGoing, setKeepGoing] = useState<boolean>(false)
  const keepGoingRef = useRef<boolean>(false)

  // 更新 keepGoing 时同步更新 ref
  useEffect(() => {
    keepGoingRef.current = keepGoing
  }, [keepGoing])

  const [stripReportList, setStripReportList] = useState<ChapterStripReport[]>([])

  // Add new state for content viewing modals
  const [isOriginalModalVisible, setIsOriginalModalVisible] = useState(false)
  const [isStrippedModalVisible, setIsStrippedModalVisible] = useState(false)
  const [viewingContent, setViewingContent] = useState('')
  const [viewingChapterInfo, setViewingChapterInfo] = useState<{
    chapterNumber: number
    chapterTitle: string
    version: number
  } | null>(null)

  // 初始化
  useEffect(() => {
    reloadChapter();
  }, [])

  useEffect(() => {
    reloadChapter();
  }, [selectedChapterId])

  const reloadChapter = async () => {
    if (selectedChapterId) {
      const res = await apiCalls.getContinueInfo(selectedChapterId)
      console.info('reloadChapter ----------------> ', res);
      setSelectedChapter(res || null)
    }
  }

  // 填充章节数据
  useEffect(() => {
    if (selectedChapter) {
      setNovelId(selectedChapter.novel_id)
      setRelatedChapterIds(selectedChapter?.related_chapter_ids?.split(',').map(s => s.trim()).filter(s => s.length > 0).map(_.toNumber) || [])
      setSeedPrompt(selectedChapter.skeleton_prompt || selectedChapter.seed_prompt || '')
      setRoleNames(selectedChapter?.actual_roles || selectedChapter?.role_names || '')
      setFactionNames(selectedChapter?.actual_factions || selectedChapter?.faction_names || '')
      setGeoNames(selectedChapter?.actual_locations || selectedChapter?.geo_names || '')
    }
  }, [selectedChapter])

  

  // 获取章节列表
  useEffect(() => {
    if (novelId) {
      apiCalls.getChapterList(novelId).then(res => {
        const ret = res.data;
        if (ret && ret.length > 0) {
          setChapterList(ret.reverse())
        } else {
          setChapterList([])
        }
      })
    }
  }, [novelId])

  // 处理AI续写
  const handleContinue = async () => {
    if (!selectedChapter) return
    if (relatedChapterIds.length === 0 && !isReferSelf) return

    try {

      // 第一步：设置状态，关闭所有编辑权限
      setIsContinuing(true)
      setIsLoading(true)
      setContinuedContent('')
      setKeepGoing(true)

      // 第二步：加载所有关联章节内容
      const preparedChapterList: ChapterStripReport[] = [];
      for (const chapterId of relatedChapterIds) {
        const res = await apiCalls.getChapterById(chapterId);
        preparedChapterList.push({
          state: 'pending',
          chapterNumber: res.chapter_number || 0,
          chapterTitle: res.title || '',
          version: res.version || 0,
          id: res.id,
          originalContent: res.content || '',
          strippedContent: ''
        });
      }

      if (isReferSelf) {
        preparedChapterList.push({
          state: isStripSelf ? 'pending' : 'completed',
          chapterNumber: selectedChapter.chapter_number || 0,
          chapterTitle: selectedChapter.title || '',
          version: selectedChapter.version || 0,
          id: selectedChapter.id,
          originalContent: selectedChapter.content || '',
          strippedContent: isStripSelf ? '' : selectedChapter.content || ''
        })
      }

      // 激活显示
      setStripReportList(preparedChapterList)

      // 第三步：缩写关联章节（长耗时步骤，设计跳出逻辑）
      let chapterIndex = 0;
      for (const chapter of preparedChapterList) {
        if (chapter.state === 'pending') {
          // 更新状态为处理中
          setStripReportList(prevList => {
            const newList = [...prevList];
            newList[chapterIndex] = { ...chapter, state: 'processing' };
            return newList;
          });

          const text = await chapterApi.stripChapterBlocking(chapter.id || 0)
          
          // 更新状态为已完成
          setStripReportList(prevList => {
            const newList = [...prevList];
            newList[chapterIndex] = { 
              ...chapter, 
              state: 'completed',
              strippedContent: text 
            };
            return newList;
          });

          if (!keepGoingRef.current) {
            throw new Error('用户已停止续写')
          }
        }

        chapterIndex++;
      }

      // 第四步：使用AI续写
      if (!keepGoingRef.current) {
        throw new Error('用户已停止续写')
      }


      // const text = await chapterApi.continueChapterBlocking(selectedChapter.id || 0)
      // setContinuedContent(text)

    } catch (error: any) {
      console.error('continueChapter error -> ', error)
      message.error('续写失败，原因：' + error.message)
    } finally {
      setIsContinuing(false)
      setIsLoading(false)
      setKeepGoing(false)
    }
  }

  const handleStoreActualPrompt = async () => {
    if (!selectedChapterId) {
      message.error('章节id为空，请检查程序或数据状态')
      return;
    }

    try {
      setIsLoading(true)
      await chapterApi.updateChapter({
        id: selectedChapterId,
        actual_roles: roleNames,
        actual_factions: factionNames,
        actual_locations: geoNames,
        skeleton_prompt: seedPrompt
      })  
      message.success('存储成功')
    } catch (error) {
      console.error('storeActualPrompt error -> ', error)
      message.error('存储失败')
    } finally {
      reloadChapter();
      setIsLoading(false)
    }
  }

  // 重置提示词
  const handleResetPrompt = (field: string) => {
    switch (field) {
      case 'role_names':
        setRoleNames(selectedChapter?.role_names || '')
        break;
        
      case 'faction_names':
        setFactionNames(selectedChapter?.faction_names || '')
        break;

      case 'geo_names':
        setGeoNames(selectedChapter?.geo_names || '')
        break;

      case 'seed_prompt':
        setSeedPrompt(selectedChapter?.seed_prompt || '')
        break;

      case 'actual_roles':
        setRoleNames(selectedChapter?.actual_roles || '')
        break;

      case 'actual_factions':
        setFactionNames(selectedChapter?.actual_factions || '')
        break;

      case 'actual_locations':
        setGeoNames(selectedChapter?.actual_locations || '')
        break;

      case 'skeleton_prompt':
        setSeedPrompt(selectedChapter?.skeleton_prompt || '')
        break;
    }
  }

  // 优化提示词
  const handleOptimizePrompt = async (target: string) => {

    let startTime = new Date().getTime();

    let prompt = '';

    switch (target) {
      case 'roles':
        prompt = roleNames;
        break;

      case 'factions':
        prompt = factionNames;
        break;

      case 'locations':
        prompt = geoNames;
        break;

      default:
        message.error('无效的提取目标：' + target + '，请检查程序状态')
        return;
    }

    try {
      setIsLoading(true)
      message.info('优化中...')

      // 从提示词中提取目标数据
      let src_text = seedPrompt;

      let res = await chapterApi.pickFromText(target, src_text)
      console.debug('handleOptimizePrompt -> ', res);

      let itemSet = new Set<string>();

      if (prompt && prompt.length > 0) {
        prompt.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0).forEach((s: string) => itemSet.add(s));
      }

      if (res && res.length > 0) {
        res.split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0).forEach((s: string) => itemSet.add(s));
      }

      
      switch (target) {
        case 'roles':
          setRoleNames(Array.from(itemSet).join(','));
          break;

        case 'factions':
          setFactionNames(Array.from(itemSet).join(','));
          break;

        case 'locations':
          setGeoNames(Array.from(itemSet).join(','));
          break;
      }

      let endTime = new Date().getTime(); 
      let costTime = (endTime - startTime) / 1000;

      message.success('优化成功，耗时：' + costTime.toFixed(2) + '秒')
    } catch (error) {
      console.error('handleOptimizePrompt error -> ', error)
      message.error('优化失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 复制续写内容
  const handleCopyContinued = () => {
    navigator.clipboard.writeText(continuedContent)
      .then(() => message.success('续写内容已复制到剪贴板'))
      .catch(() => message.error('复制失败'))
  }

  // 应用续写内容
  const handleApplyContinued = async () => {
    if (!selectedChapter || !continuedContent) return

    try {
      setIsLoading(true)
      await chapterApi.updateChapter({
        id: selectedChapter.id,
        content: selectedChapter.content + '\n\n' + continuedContent
      })
      message.success('续写内容已添加')
      onClose()
      onChapterChange()
    } catch (error) {
      message.error('添加续写内容失败')
    } finally {
      setIsLoading(false)
    }
  }

  // Add handlers for content viewing
  const handleViewOriginal = (content: string, chapterInfo: ChapterStripReport) => {
    setViewingContent(content)
    setViewingChapterInfo({
      chapterNumber: chapterInfo.chapterNumber,
      chapterTitle: chapterInfo.chapterTitle,
      version: chapterInfo.version
    })
    setIsOriginalModalVisible(true)
  }

  const handleViewStripped = (content: string, chapterInfo: ChapterStripReport) => {
    setViewingContent(content)
    setViewingChapterInfo({
      chapterNumber: chapterInfo.chapterNumber,
      chapterTitle: chapterInfo.chapterTitle,
      version: chapterInfo.version
    })
    setIsStrippedModalVisible(true)
  }

  const modalTitle = selectedChapter ? `AI续写 - 当前第 ${selectedChapter.chapter_number} 章: ${selectedChapter.title}，版本：v${selectedChapter.version}` : 'AI续写'

  return (
    <>
      <Modal
        title={modalTitle}
        open={isVisible}
        onCancel={onClose}
        width={'80vw'}
        footer={
          <div className={styles.footer}>
            <Row gutter={16}>
              <Col span={12}>
                <Button onClick={handleStoreActualPrompt}>存储提示词集</Button>
              </Col>
              <Col span={12}>
                <Button key="copy" icon={<CopyOutlined />} onClick={handleCopyContinued}>
                  复制续写内容
                </Button>

                <Button 
                  key="apply" 
                  type="primary" 
                  onClick={handleApplyContinued}
                  loading={isLoading}
                  disabled={!continuedContent}
                >
                  应用续写
                </Button>,
                <Button key="close" onClick={onClose}>
                  关闭
                </Button>
              </Col>
            </Row>
          </div>}
      >
        <div className={styles.continueContent}>
          <Row gutter={16}>
            <Col span={12}>
                <div>
                  <Button icon={<RedoOutlined/>} onClick={reloadChapter}>刷新</Button>
                </div>

                <Divider orientation="left">前序章节</Divider>

                <Select
                  mode="multiple"
                  placeholder="请选择前序章节"
                  style={{ width: '100%' }}
                  allowClear
                  value={relatedChapterIds}
                  onChange={(value) => setRelatedChapterIds(value)}
                >
                  {chapterList.map(chapter => (
                    <Select.Option key={chapter.id} value={chapter.id}>
                      {chapter.chapter_number} {chapter.title || '未命名章节'} : v{chapter.version}
                    </Select.Option>
                  ))}
                </Select>

                <Divider orientation="left">提示词</Divider>

                <div className={styles.prompt_title}>
                  <div>
                    <span>角色提示词：</span>
                    { roleNames === selectedChapter?.role_names ? <Tag color="blue">初始值</Tag> : null }
                    { roleNames === selectedChapter?.actual_roles ?  <Tag color="green">存储值</Tag> : null }
                    { (roleNames !== selectedChapter?.role_names && roleNames !== selectedChapter?.actual_roles) ?  <Tag color="red">已修改</Tag> : null }
                  </div>
                  <div>
                    <Button size="small" disabled={isLoading} onClick={() => handleOptimizePrompt('roles')}>AI优化</Button>
                    <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('role_names')}>复原初始值</Button>
                    <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('actual_roles')}>复原存储值</Button>
                  </div>
                </div>
                <div>
                  <TextArea autoSize={{ minRows: 1 }} disabled={isLoading} value={roleNames} onChange={(e) => setRoleNames(e.target.value)} />
                </div>

                <div className={styles.prompt_title}>
                  <div>
                    <span>阵营提示词：</span>
                    { factionNames === selectedChapter?.faction_names ? <Tag color="blue">初始值</Tag> : null }
                    { factionNames === selectedChapter?.actual_factions ?  <Tag color="green">存储值</Tag> : null }
                    { (factionNames !== selectedChapter?.faction_names && factionNames !== selectedChapter?.actual_factions) ?  <Tag color="red">已修改</Tag> : null }
                  </div>
                  <div>
                    <Button size="small" disabled={isLoading} onClick={() => handleOptimizePrompt('factions')}>AI优化</Button>
                    <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('faction_names')}>复原初始值</Button>
                    <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('actual_factions')}>复原存储值</Button>
                  </div>
                </div>
                <div>
                  <TextArea autoSize={{ minRows: 1 }} disabled={isLoading} value={factionNames} onChange={(e) => setFactionNames(e.target.value)} />
                </div>

                <div className={styles.prompt_title}>
                  <div>
                    <span>地理提示词：</span>
                    { geoNames === selectedChapter?.geo_names ? <Tag color="blue">初始值</Tag> : null }
                    { geoNames === selectedChapter?.actual_locations ?  <Tag color="green">存储值</Tag> : null }
                    { (geoNames !== selectedChapter?.geo_names && geoNames !== selectedChapter?.actual_locations) ?  <Tag color="red">已修改</Tag> : null }
                  </div>
                  <div>
                    <Button size="small" disabled={isLoading} onClick={() => handleOptimizePrompt('locations')}>AI优化</Button>
                    <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('geo_names')}>复原初始值</Button>
                    <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('actual_locations')}>复原存储值</Button>
                  </div>
                </div>
                <div>
                  <TextArea autoSize={{ minRows: 1 }} disabled={isLoading} value={geoNames} onChange={(e) => setGeoNames(e.target.value)} />
                </div>

                <div className={styles.prompt_title}>
                  <div>
                    <span>章节提示词：</span>
                    { seedPrompt === selectedChapter?.seed_prompt ? <Tag color="blue">初始值</Tag> : null }
                    { seedPrompt === selectedChapter?.skeleton_prompt ?  <Tag color="green">存储值</Tag> : null }
                    { (seedPrompt !== selectedChapter?.seed_prompt && seedPrompt !== selectedChapter?.skeleton_prompt) ?  <Tag color="red">已修改</Tag> : null }
                  </div>
                  <div>
                    <Button size="small" disabled={isLoading} onClick={() => handleOptimizePrompt('seed_prompt')}>AI优化</Button>
                    <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('seed_prompt')}>复原初始值</Button>
                    <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('skeleton_prompt')}>复原存储值</Button>
                  </div>
                </div>
                <div>
                  <TextArea
                    disabled={isLoading}
                    autoSize={{ minRows: 19 }}
                    value={seedPrompt}
                    onChange={(e) => setSeedPrompt(e.target.value)}
                  />
                </div>
            </Col>

            <Col span={12}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  { isContinuing ? (
                    <Button
                      type="primary"
                      danger
                      icon={<RobotOutlined />}
                      onClick={() => setKeepGoing(false)}
                      loading={!keepGoing}
                    >
                      终止续写
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      icon={<RobotOutlined />}
                      onClick={handleContinue}
                      loading={isContinuing}
                    >
                      使用AI续写
                    </Button>
                  )}

                  <Checkbox checked={isReferSelf} onChange={(e) => setIsReferSelf(e.target.checked)}>参考本章已有内容</Checkbox>
                  <Checkbox checked={isStripSelf} onChange={(e) => setIsStripSelf(e.target.checked)}>缩写本章</Checkbox>
                </Space>
                <div className={styles.continuedText}>
                  {isContinuing ? null : '点击上方按钮开始续写...'}
                </div>

                {
                  stripReportList.length > 0 && (
                    <Card size="small" title="章节缩写">
                      { stripReportList.map((item, index) => (
                        <ChapterStripState key={index} {...item} onViewOriginal={handleViewOriginal} onViewStripped={handleViewStripped} />
                      ))}
                    </Card>
                  )
                }
              </Space>
            </Col>
          </Row>
        </div>
      </Modal>

      <ContentViewModal
        isVisible={isOriginalModalVisible}
        onClose={() => setIsOriginalModalVisible(false)}
        content={viewingContent}
        chapterInfo={viewingChapterInfo}
        type="original"
      />

      <ContentViewModal
        isVisible={isStrippedModalVisible}
        onClose={() => setIsStrippedModalVisible(false)}
        content={viewingContent}
        chapterInfo={viewingChapterInfo}
        type="stripped"
      />
    </>
  )
}


interface ChapterStripStateProps extends ChapterStripReport {
  onViewOriginal?: (content: string, chapterInfo: ChapterStripReport) => void
  onViewStripped?: (content: string, chapterInfo: ChapterStripReport) => void
}

function ChapterStripState(props: ChapterStripStateProps) {
  const { state, chapterNumber, chapterTitle, version, originalContent, strippedContent } = props

  const getStatusColor = () => {
    switch (state) {
      case 'pending':
        return 'default'
      case 'processing':
        return 'processing'
      case 'completed':
        return 'success'
      default:
        return 'default'
    }
  }

  const getStatusText = () => {
    switch (state) {
      case 'pending':
        return '等待中'
      case 'processing':
        return '执行中'
      case 'completed':
        return '已完成'
      default:
        return '未知状态'
    }
  }

  return (
    <Card size="small" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography.Text strong>
            {chapterNumber} {chapterTitle} (v{version})
          </Typography.Text>
          <Tag color={getStatusColor()} style={{ marginLeft: 8 }}>
            {getStatusText()}
          </Tag>
        </div>
        <Space>
          <Button 
            size="small" 
            disabled={!originalContent}
            onClick={() => props.onViewOriginal?.(originalContent!, {
              chapterNumber,
              chapterTitle,
              version,
              state
            })}
          >
            查看原文
          </Button>
          <Button 
            size="small" 
            disabled={!strippedContent}
            onClick={() => props.onViewStripped?.(strippedContent!, {
              chapterNumber,
              chapterTitle,
              version,
              state
            })}
          >
            查看缩写
          </Button>
        </Space>
      </div>
    </Card>
  )
}

export default ChapterContinueModal 