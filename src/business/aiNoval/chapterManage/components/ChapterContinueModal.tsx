import React, { useEffect, useState, useRef } from 'react'
import { Modal, Button, Space, message, Row, Col, Form, Select, Checkbox, Divider, Input, Tag, Typography, Card } from 'antd'
import { CopyOutlined, EditOutlined, RedoOutlined, RobotOutlined } from '@ant-design/icons'
import { IChapter } from '@/src/types/IAiNoval'
import * as chapterApi from '../apiCalls'
import styles from './ChapterContinuePanel.module.scss'
import * as apiCalls from '../apiCalls'
import TextArea from 'antd/es/input/TextArea'
import _ from 'lodash'
import ChapterStripState, { type ChapterStripReport, type ChapterStripStateProps } from './ChapterStripState'
import copyToClip from '@/src/utils/common/copy';
import store from '@/src/store'
import { connect } from 'react-redux'

interface ChapterContinueModalProps {
  selectedChapterId: number | undefined
  isVisible: boolean
  onClose: () => void
  onChapterChange: () => void
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

// 展示章节内容
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

// 注意事项快速复制 Modal
interface AttentionRefModalProps {
  isVisible: boolean
  onClose: () => void
  content: string
}

function AttentionRefModal({ isVisible, onClose, content }: AttentionRefModalProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const refList = [
    {
      title: '基础',
      color: 'blue',
      content: '* 扩写时，请仔细分析用户提供的片段，理解其含义和作用。\n' +
               '* 扩写时，请充分利用前情提要和相关设定，为故事增加细节和深度。\n' +
               '* 扩写时，请注意人物的心理活动和行为动机，使人物更加立体和真实。\n' +
               '* 扩写时，请注意情节的节奏和悬念，使故事更加引人入胜。'
    },
    {
      title: '轻松',
      color: 'green',
      content: '- 对人物对话、人物心理活动、人物动作细节、场景塑造进行综合调优\n' +
               '- 使用流畅、地道的表达，适当的时机使用俚语化的表达，加强气氛\n' +
               '- 加上日式吐槽优化语言张力；'
    }
  ]

  

  async function handleCopy(content: string) {
    try {
      copyToClip(content)
      message.success('复制成功')
    } catch (error) {
      message.error('复制失败')
    }
  }


  function RefItem(props: { title: string, color: string, content: string }) {
    const title = <div className={'f-flex-two-side'}>
      <Tag color={props.color}>{props.title}</Tag>
      <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(props.content)}>复制</Button>
    </div>

    return (
      <Card size="small" title={title} style={{ marginTop: '10px' }}>
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{props.content}</Typography.Paragraph>
      </Card>
    )
  }

  return (
    <Modal
      title="注意事项参考"
      open={isVisible}
      onCancel={onClose}
      width={520}
      footer={[
        <Button key="close" onClick={onClose}>关闭</Button>
      ]}
    >
      {refList.map((item, index) => (
        <RefItem key={index} title={item.title} color={item.color} content={item.content} />
      ))}
    </Modal>
  )
}

function ChapterContinueModal({ selectedChapterId, isVisible, onClose, onChapterChange }: ChapterContinueModalProps) {
  const [continuedContent, setContinuedContent] = useState('')
  const [isContinuing, setIsContinuing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [form] = Form.useForm()

  // 当前章节
  const [selectedChapter, setSelectedChapter] = useState<any | null>(null)

  // 小说id
  const [novelId, setNovelId] = useState<number | undefined>(undefined)

  // 章节列表
  const [chapterList, setChapterList] = useState<IChapter[]>([])

  // 关联章节id列表
  const [relatedChapterIds, setRelatedChapterIds] = useState<number[]>([])

  // 种子提示词
  const [seedPrompt, setSeedPrompt] = useState<string>('')

  // 角色名称
  const [roleNames, setRoleNames] = useState<string>('')

  // 势力名称
  const [factionNames, setFactionNames] = useState<string>('')

  // 地理名称
  const [geoNames, setGeoNames] = useState<string>('')

  // 是否参考本章已有内容
  const [isReferSelf, setIsReferSelf] = useState<boolean>(true)

  // 是否缩写本章
  const [isStripSelf, setIsStripSelf] = useState<boolean>(false)

  // 是否继续编写
  const [keepGoing, setKeepGoing] = useState<boolean>(false)
  const keepGoingRef = useRef<boolean>(false)

  // 自动续写结果
  const [autoWriteResult, setAutoWriteResult] = useState<string>('');

  // 自动续写耗时
  const [autoWriteElapsed, setAutoWriteElapsed] = useState<number>(0)

  // 更新 keepGoing 时同步更新 ref
  useEffect(() => {
    keepGoingRef.current = keepGoing
  }, [keepGoing])

  // 缩写状态列表
  const [stripReportList, setStripReportList] = useState<ChapterStripReport[]>([])

  // 是否展示章节内容 - 原文
  const [isOriginalModalVisible, setIsOriginalModalVisible] = useState(false)


  // 展示章节内容 - 缩写后
  const [isStrippedModalVisible, setIsStrippedModalVisible] = useState(false)

  // 展示章节内容 - 原文
  const [viewingContent, setViewingContent] = useState('')

  // 展示章节内容
  const [viewingChapterInfo, setViewingChapterInfo] = useState<{
    chapterNumber: number
    chapterTitle: string
    version: number
  } | null>(null)

  // 提示词工作模式
  const [promptWorkMode, setPromptWorkMode] = useState<'full' | 'part'>('full');

  // 提示词分段列表
  const [promptPartList, setPromptPartList] = useState<string[]>([]);

  // 已选提示词分段
  const [selectedPromptParts, setSelectPromptParts] = useState<string[]>([]);

  // 注意事项
  const [attention, setAttention] = useState<string>('')

  // 额外设置
  const [extraSettings, setExtraSettings] = useState<string>('')

  // 注意事项参考 Modal
  const [isAttentionRefVisible, setIsAttentionRefVisible] = useState(false)

  // 初始化
  useEffect(() => {
    reloadChapter();
  }, [])

  // 当章节id变化时，刷新章节数据
  useEffect(() => {
    reloadChapter();
  }, [selectedChapterId])

  // 刷新章节数据
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
      // 小说id
      setNovelId(selectedChapter.novel_id)

      // 关联章节id列表
      setRelatedChapterIds(selectedChapter?.related_chapter_ids?.split(',').map((s: string) => s.trim()).filter((s: string | any[]) => s.length > 0).map(_.toNumber) || [])

      // 种子提示词
      setSeedPrompt(selectedChapter.actual_seed_prompt || selectedChapter.seed_prompt || '')

      // 提示词分段列表
      setPromptPartList(selectedChapter?.actual_seed_prompt?.split('\n') || [])
      
      // 角色名称
      setRoleNames(selectedChapter?.actual_roles || selectedChapter?.role_names || '')

      // 势力名称
      setFactionNames(selectedChapter?.actual_factions || selectedChapter?.faction_names || '')

      // 地理名称
      setGeoNames(selectedChapter?.actual_locations || selectedChapter?.geo_names || '')

      // 注意事项
      setAttention(selectedChapter?.attension || '')

      // 额外设置
      setExtraSettings(selectedChapter?.extra_settings || '')

      // 自动续写结果
      setAutoWriteResult(selectedChapter?.content || '')
    }
  }, [selectedChapter])

  useEffect(() => {
    setSelectPromptParts([]);
    if (seedPrompt && promptWorkMode === 'part') {
      setPromptPartList(seedPrompt.split('\n'))
    }
  }, [promptWorkMode])

  useEffect(() => {
    console.debug('selectedPromptParts -> ', selectedPromptParts);
  }, [selectedPromptParts])


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

  // 处理AI续写（全流程：缩写+续写）
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

      // 如果参考本章，则将本章内容加入到preparedChapterList中，注意是否需要缩写本章
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

          const text = await chapterApi.stripChapterBlocking(chapter.id || 0, 300, store.getState().difySlice.frontHost || '')
          
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

      // 第四步：使用AI续写，续写前先确认用户指令
      if (!keepGoingRef.current) {
        throw new Error('用户已停止续写')
      } else {
        await executeAutoWrite();
      }
      

    } catch (error: any) {
      console.error('continueChapter error -> ', error)
      message.error('续写失败，原因：' + error.message)
    } finally {
      setIsContinuing(false)
      setIsLoading(false)
      setKeepGoing(false)
    }
  }

  const handleReContinue = async () => {
    if (!selectedChapter) return

    try {
      // 第一步：设置状态，关闭所有编辑权限
      setIsContinuing(true)
      setIsLoading(true)

      // 第二步：使用AI续写
      await executeAutoWrite();

    } catch (error: any) {
      console.error('continueChapter error -> ', error)
      message.error('续写失败，原因：' + error.message)
    } finally {
      setIsContinuing(false)
      setIsLoading(false)
    }
  }

  // 执行自动续写
  const executeAutoWrite = async () => {
    if (!selectedChapter) return
    // if (relatedChapterIds.length === 0 && !isReferSelf) return

    setAutoWriteResult('正在续写...')

    // 使用函数式更新获取最新的stripReportList状态
    const latestStripReportList = await new Promise<ChapterStripReport[]>(resolve => {
      setStripReportList(prevList => {
        resolve(prevList);
        return prevList;
      });
    });

    let prompt = '';
    if (promptWorkMode === 'full') {
      prompt = seedPrompt;
    } else {
      prompt = selectedPromptParts.join('\n');
    }

    const reqObj = {
      prev_content: latestStripReportList
        .filter(chapter => chapter.state === 'completed' && chapter.strippedContent)
        .map(chapter => chapter.strippedContent)
        .join('\n\n'),
      curr_context: prompt,
      role_names: roleNames,
      faction_names: factionNames,
      geo_names: geoNames,
    };
    console.info('auto write reqObj -> ', reqObj);

    const res = await chapterApi.genChapterBlocking(selectedChapter.worldview_id, reqObj, store.getState().difySlice.frontHost || '');
    console.info('auto write res -> ', res);

    setAutoWriteResult(res || '续写已结束，未返回内容');
  }

  // 保存实际提示词
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
        actual_seed_prompt: seedPrompt,
        attension: attention,
        extra_settings: extraSettings
      })  
      message.success('保存成功')
    } catch (error) {
      console.error('storeActualPrompt error -> ', error)
      message.error('保存失败')
    } finally {
      // reloadChapter();
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

      case 'actual_seed_prompt':
        setSeedPrompt(selectedChapter?.actual_seed_prompt || '')
        break;

      case 'attension':
        setAttention(selectedChapter?.attension || '')
        break;

      case 'extra_settings':
        setExtraSettings(selectedChapter?.extra_settings || '')
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
    if (!autoWriteResult) {
      message.error('续写内容为空')
      return;
    }

    try {
      copyToClip(autoWriteResult || '')
      message.success('续写内容已复制到剪贴板')
    } catch (error) {
      console.error('handleCopyContinued error -> ', error)
      message.error('复制失败')
    }
  }

  const handleClearThinking = () => {
    if (!autoWriteResult) {
      message.error('续写内容为空')
      return;
    }

    let pureResult = autoWriteResult.replace(/<think>[\s\S]*<\/think>/g, '');
    console.info('handleClearThinking -> ', pureResult);
    setAutoWriteResult(pureResult)
  }

  // 显示章节原文
  const handleViewOriginal = (content: string, chapterInfo: ChapterStripReport) => {
    setViewingContent(content)
    setViewingChapterInfo({
      chapterNumber: chapterInfo.chapterNumber,
      chapterTitle: chapterInfo.chapterTitle,
      version: chapterInfo.version
    })
    setIsOriginalModalVisible(true)
  }

  // 显示章节缩写
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

  function handleShowAttentionRef() {
    setIsAttentionRefVisible(true)
  }

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
                <Space>
                  <Button icon={<RedoOutlined/>} onClick={reloadChapter}>刷新</Button>
                </Space>

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
                    <span>注意事项：</span>
                    { attention === selectedChapter?.attension ? <Tag color="blue">存储值</Tag> : null }
                    { (attention !== selectedChapter?.attension) ?  <Tag color="red">已修改</Tag> : null }
                  </div>
                  <div>
                    <Button size="small" disabled={isLoading} onClick={handleShowAttentionRef}>参考值</Button>
                    <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('attension')}>复原存储值</Button>
                  </div>
                </div>
                <div>
                  <TextArea autoSize={{ minRows: 1 }} disabled={isLoading} value={attention} onChange={(e) => setAttention(e.target.value)} />
                </div>

                <div className={styles.prompt_title}>
                  <div>
                    <span>额外设置：(慎用，会触发全库检索，产生巨大耗时，建议先切换GPU)。</span>
                    { extraSettings === selectedChapter?.extra_settings ? <Tag color="blue">存储值</Tag> : null }
                    { (extraSettings !== selectedChapter?.extra_settings) ?  <Tag color="red">已修改</Tag> : null }
                  </div>
                  <div>
                    <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('extra_settings')}>复原存储值</Button>
                  </div>
                </div>
                <div>
                  <TextArea autoSize={{ minRows: 1 }} disabled={isLoading} value={extraSettings} onChange={(e) => setExtraSettings(e.target.value)} />
                </div>

                <div className={styles.prompt_title}>
                  <div>
                    <span>章节提示词：</span>
                    { seedPrompt === selectedChapter?.seed_prompt ? <Tag color="blue">初始值</Tag> : null }
                    { seedPrompt === selectedChapter?.actual_seed_prompt ?  <Tag color="green">存储值</Tag> : null }
                    { (seedPrompt !== selectedChapter?.seed_prompt && seedPrompt !== selectedChapter?.actual_seed_prompt) ?  <Tag color="red">已修改</Tag> : null }
                    <Select size="small" value={promptWorkMode} onChange={(value) => setPromptWorkMode(value)}>
                      <Select.Option value="full">编辑模式</Select.Option>
                      <Select.Option value="part">分段模式</Select.Option>
                    </Select>
                    {
                      promptWorkMode === 'part' ? [
                        <Button size="small" disabled={isLoading} onClick={() => setSelectPromptParts([...promptPartList])}>全选</Button>,
                        <Button size="small" disabled={isLoading} onClick={() => setSelectPromptParts([])}>全不选</Button>
                       ] : []
                    }
                  </div>
                  <div>
                    <Button size="small" disabled={isLoading} onClick={() => handleOptimizePrompt('seed_prompt')}>AI优化</Button>
                    <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('seed_prompt')}>复原初始值</Button>
                    <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('actual_seed_prompt')}>复原存储值</Button>
                  </div>
                </div>
                <div>
                  {
                    promptWorkMode === 'full' ? (
                      <TextArea
                        disabled={isLoading}
                        autoSize={{ minRows: 19 }}
                        value={seedPrompt}
                        onChange={(e) => setSeedPrompt(e.target.value)}
                      />
                    ) : (
                      <Checkbox.Group className={styles.prompt_part_list}
                        value={selectedPromptParts}
                        onChange={(value) => setSelectPromptParts(value.map(String))} 
                      >
                        {
                          promptPartList.map((item, index) => (
                            <Row key={index}>
                              <Checkbox key={index} value={item}>{item}</Checkbox>
                            </Row>
                          ))
                        }
                      </Checkbox.Group>
                    )
                  }
                </div>
            </Col>

            <Col span={12}>
              <div>
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
                <Divider orientation='left'>
                  {isContinuing ? '续写中...' : '点击上方按钮开始续写...'}
                </Divider>

                {
                  stripReportList.length > 0 && [
                    <Card size="small" title="章节缩写">
                      { stripReportList.map((item, index) => (
                        <ChapterStripState key={index} {...item} onViewOriginal={handleViewOriginal} onViewStripped={handleViewStripped} />
                      ))}
                    </Card>
                  ]
                }

                {
                  autoWriteResult && (
                    <Card size="small" style={{ marginTop: 16 }} title={
                        <div className='f-flex-two-side' style={{ alignItems: 'center' }}>
                          <div>
                            <span>自动续写结果 - {selectedChapter?.chapter_number} {selectedChapter?.title || '未命名章节'}:v{selectedChapter?.version}</span>
                          </div>
                          <Space>
                            <Button type="primary" size="small" disabled={isLoading || isContinuing} onClick={handleClearThinking}>清除think</Button>
                            <Button type="primary" size="small" disabled={isLoading || isContinuing} onClick={handleCopyContinued}>复制</Button>
                            <Button danger size="small" disabled={isLoading || isContinuing} onClick={handleReContinue}>重写</Button>
                          </Space>
                        </div>
                        
                      }>
                      <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{autoWriteResult} </Typography.Paragraph>
                    </Card>
                  )
                }
              </div>
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

      <AttentionRefModal
        isVisible={isAttentionRefVisible}
        onClose={() => setIsAttentionRefVisible(false)}
        content={selectedChapter?.attension || ''}
      />
    </>
  )
}


export default ChapterContinueModal 