import React, { useState, useEffect, useRef } from 'react'
import {
  Modal,
  Button,
  Space,
  Row,
  Col,
  Divider,
  Checkbox,
  InputNumber,
  Select,
  Tag,
  Typography,
  Card,
  Alert,
  List,
  Input,
  Spin,
  message,
} from 'antd'
import {
  RobotOutlined,
  CopyOutlined,
  PauseCircleOutlined,
  StopOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import type { IChapter } from '@/src/types/IAiNoval'
import TextArea from 'antd/es/input/TextArea'
import * as apiCalls from '../apiCalls'
import styles from './ChapterContinuePanel.module.scss'

/** 分段提纲项（先回显、用户确认后再写） */
export interface SegmentOutlineItem {
  index: number
  outline: string
}

type Phase =
  | 'idle'
  | 'mcp_gathering'
  | 'segment_planning'
  | 'awaiting_confirmation'
  | 'writing_segment'
  | 'paused'
  | 'done'
  | 'error'

export interface GenChapterByDetailModalProps {
  selectedChapter?: IChapter | null
  open: boolean
  onCancel: () => void
  onOk?: (content: string) => void
}

const defaultOutlines: SegmentOutlineItem[] = [
  { index: 1, outline: '承接前情，主角抵达会场，环境与氛围描写。' },
  { index: 2, outline: '与次要角色对话，引出本段矛盾点。' },
  { index: 3, outline: '冲突升级，主角做出关键选择。' },
  { index: 4, outline: '结果与余波，为下一章埋下伏笔。' },
]

/** 总体风格快速标签（点击追加到章节总体风格） */
const STYLE_QUICK_TAGS = [
  '第一人称',
  '第三人称',
  '快节奏',
  '细腻描写',
  '悬疑紧张',
  '轻松幽默',
  '硬核科幻',
  '冷硬写实',
  '诗意抒情',
  '对话驱动',
  '环境氛围',
  '热血战斗',
  '奇幻魔法',
  '银魂式搞笑',
  '周星驰式搞笑',
  '沙丘风',
]

function GenChapterByDetailModal({
  selectedChapter,
  open,
  onCancel,
  onOk,
}: GenChapterByDetailModalProps) {
  // 配置（PRD 3.1）
  const [useMcpContext, setUseMcpContext] = useState(false)
  const [segmentTargetChars, setSegmentTargetChars] = useState(1000)
  const [maxSegments, setMaxSegments] = useState(8)
  const [llmType, setLlmType] = useState<string>('deepseek-chat')
  /** 提纲生成用的模型，默认 deepseek-chat */
  const [outlineModel, setOutlineModel] = useState<string>('deepseek-chat')

  // 流程与回显（PRD 3.2）
  const [phase, setPhase] = useState<Phase>('idle')
  const [segmentOutlineList, setSegmentOutlineList] = useState<SegmentOutlineItem[]>([])
  const [segmentIndex, setSegmentIndex] = useState(1)
  const [segmentedContent, setSegmentedContent] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // 表单（与现有续写对齐，PRD 3.3）
  const [seedPrompt, setSeedPrompt] = useState('')
  const [roleNames, setRoleNames] = useState('')
  const [factionNames, setFactionNames] = useState('')
  const [geoNames, setGeoNames] = useState('')
  const [attention, setAttention] = useState('')
  const [extraSettings, setExtraSettings] = useState('')
  const [chapterStyle, setChapterStyle] = useState('')

  // 续写信息（与 ChapterContinueModal 一致：getContinueInfo 拉取后回填）
  const [continueInfo, setContinueInfo] = useState<any>(null)
  const [isLoadingContinueInfo, setIsLoadingContinueInfo] = useState(false)
  const [isGeneratingAttention, setIsGeneratingAttention] = useState(false)
  const pauseRequestedRef = useRef(false)
  const stopRequestedRef = useRef(false)

  // 当弹窗打开且存在章节 id 时，拉取续写信息
  useEffect(() => {
    if (!open || !selectedChapter?.id) {
      setContinueInfo(null)
      return
    }
    let cancelled = false
    setIsLoadingContinueInfo(true)
    apiCalls
      .getContinueInfo(selectedChapter.id)
      .then((res: any) => {
        if (cancelled) return
        const data = res?.data ?? res
        setContinueInfo(data || null)
      })
      .catch(() => {
        if (!cancelled) setContinueInfo(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingContinueInfo(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, selectedChapter?.id])

  // 回填角色、阵营、地理、章节提示词、注意事项、额外设置（与 ChapterContinueModal 一致）
  useEffect(() => {
    if (!continueInfo) return
    setSeedPrompt(
      continueInfo.actual_seed_prompt || continueInfo.seed_prompt || ''
    )
    setRoleNames(
      continueInfo.actual_roles || continueInfo.role_names || ''
    )
    setFactionNames(
      continueInfo.actual_factions || continueInfo.faction_names || ''
    )
    setGeoNames(
      continueInfo.actual_locations || continueInfo.geo_names || ''
    )
    setAttention(continueInfo.attension || '')
    setExtraSettings(continueInfo.extra_settings || '')
    setChapterStyle(continueInfo.chapter_style || continueInfo.overall_style || '')
  }, [continueInfo])

  const isBusy =
    phase === 'mcp_gathering' ||
    phase === 'segment_planning' ||
    phase === 'writing_segment'
  const isFormDisabled = isBusy || (phase === 'idle' && isLoadingContinueInfo)

  /** 生成分段提纲：可选先 mock MCP，再调接口生成提纲 */
  const handleGenerateOutline = async () => {
    setErrorMessage('')
    if (useMcpContext) {
      setPhase('mcp_gathering')
      await new Promise((r) => setTimeout(r, 600))
    }
    setPhase('segment_planning')
    try {
      const { outlines } = await apiCalls.genChapterSegmentOutline({
        curr_context: seedPrompt,
        prev_content: '',
        mcp_context: undefined,
        role_names: roleNames,
        faction_names: factionNames,
        geo_names: geoNames,
        attention,
        chapter_style: chapterStyle,
        max_segments: maxSegments,
        segment_target_chars: segmentTargetChars,
        model: outlineModel || 'deepseek-reasoner',
      })
      setSegmentOutlineList(Array.isArray(outlines) && outlines.length > 0 ? outlines : defaultOutlines)
      setPhase('awaiting_confirmation')
    } catch (e: any) {
      setErrorMessage(e?.message || '生成分段提纲失败')
      setPhase('error')
      message.error(e?.message || '生成分段提纲失败')
    }
  }

  const worldviewId = selectedChapter?.worldview_id ?? continueInfo?.worldview_id
  const SNIPPET_MAX_CHARS = 800

  /** 逐段生成并逐段输出；支持暂停、停止 */
  const runSegmentLoop = async (startFromIndex: number) => {
    if (!worldviewId) {
      message.error('无法获取世界观 ID')
      setPhase('error')
      setErrorMessage('无法获取世界观 ID')
      return
    }
    const list = segmentOutlineList.length > 0 ? segmentOutlineList : []
    if (list.length === 0) {
      message.warning('暂无分段提纲')
      setPhase('awaiting_confirmation')
      return
    }
    let content = startFromIndex === 1 ? '' : segmentedContent
    if (startFromIndex === 1) {
      setSegmentedContent('')
    }
    setPhase('writing_segment')
    setSegmentIndex(startFromIndex)
    setErrorMessage('')
    for (let i = startFromIndex; i <= list.length; i++) {
      if (stopRequestedRef.current) {
        setSegmentedContent(content)
        setPhase('done')
        setSegmentIndex(i)
        stopRequestedRef.current = false
        return
      }
      if (pauseRequestedRef.current) {
        setSegmentedContent(content)
        setPhase('paused')
        setSegmentIndex(i)
        pauseRequestedRef.current = false
        return
      }
      setSegmentIndex(i)
      const outlineItem = list[i - 1]
      const previousSnippet = content.slice(-SNIPPET_MAX_CHARS)
      try {
        const res = await apiCalls.genChapterSegment(worldviewId, {
          curr_context: seedPrompt,
          prev_content: '',
          role_names: roleNames,
          faction_names: factionNames,
          geo_names: geoNames,
          attention,
          llm_type: llmType,
          segment_index: i,
          previous_content_snippet: previousSnippet,
          current_segment_outline: outlineItem?.outline ?? '',
          segment_target_chars: segmentTargetChars,
          mcp_context: undefined,
        })
        if (res.status === 'error' || res.error) {
          setErrorMessage(res.error || '本段生成失败')
          setPhase('error')
          setSegmentedContent(content)
          return
        }
        content += (res.content || '').trim()
        if ((res.content || '').trim()) content += '\n\n'
        setSegmentedContent(content)
      } catch (e: any) {
        setErrorMessage(e?.message || '本段生成失败')
        setPhase('error')
        setSegmentedContent(content)
        return
      }
    }
    setPhase('done')
    setSegmentIndex(list.length + 1)
  }

  const handleConfirmAndStart = () => {
    pauseRequestedRef.current = false
    stopRequestedRef.current = false
    setSegmentIndex(1)
    setSegmentedContent('')
    setErrorMessage('')
    runSegmentLoop(1)
  }

  const handleCancelOutline = () => {
    setPhase('idle')
    setSegmentOutlineList([])
  }

  const handlePause = () => {
    pauseRequestedRef.current = true
  }
  const handleResume = () => {
    pauseRequestedRef.current = false
    runSegmentLoop(segmentIndex)
  }
  const handleStop = () => {
    stopRequestedRef.current = true
  }

  const handleEditOutline = (index: number, value: string) => {
    setSegmentOutlineList((prev) =>
      prev.map((item) =>
        item.index === index ? { ...item, outline: value } : item
      )
    )
  }

  const handleStyleTagClick = (tag: string) => {
    setChapterStyle((prev) =>
      prev.trim() ? `${prev.trim()}，${tag}` : tag
    )
  }

  /** 注意事项 AI 生成（MCP 生成严格注意事项）：不考虑当前已填内容，生成后直接覆盖 */
  const handleGenAttention = async () => {
    const worldviewId = selectedChapter?.worldview_id ?? continueInfo?.worldview_id
    if (!worldviewId) {
      message.error('无法获取世界观 ID，请先选择章节')
      return
    }
    setIsGeneratingAttention(true)
    try {
      const text = await apiCalls.genChapterAttention({
        worldview_id: worldviewId,
        curr_context: seedPrompt,
        role_names: roleNames,
        faction_names: factionNames,
        geo_names: geoNames,
        chapter_style: chapterStyle,
      })
      setAttention(text || '')
      if (text) message.success('注意事项已生成')
      else message.warning('未生成内容')
    } catch (e: any) {
      message.error(e?.message || '生成注意事项失败')
    } finally {
      setIsGeneratingAttention(false)
    }
  }

  const handleCopyContent = () => {
    if (segmentedContent) {
      navigator.clipboard.writeText(segmentedContent)
    }
  }

  /** 重写：清空已生成内容，重新启动续写流程 */
  const handleRewrite = () => {
    console.log('[handleRewrite] 重写按钮被点击')
    pauseRequestedRef.current = false
    stopRequestedRef.current = false
    setSegmentedContent('')
    setSegmentIndex(1)
    setErrorMessage('')
    // 如果有分段提纲，直接重新开始续写流程
    if (segmentOutlineList.length > 0) {
      message.info('已清空内容，正在重新开始续写...')
      runSegmentLoop(1)
    } else {
      // 如果没有分段提纲，回到 idle 阶段，提示用户先生成提纲
      setPhase('idle')
      message.warning('请先生成分段提纲')
    }
  }

  const handleClose = () => {
    setPhase('idle')
    setSegmentOutlineList([])
    setSegmentedContent('')
    setSegmentIndex(1)
    setErrorMessage('')
    onCancel()
  }

  const modalTitle = selectedChapter
    ? `分段续写 - 第 ${selectedChapter.chapter_number} 章 ${selectedChapter.title || '未命名'}`
    : '分段续写'

  return (
    <Modal
      title={modalTitle}
      open={open}
      onCancel={handleClose}
      width="80vw"
      footer={null}
      destroyOnClose
    >
      <div className={styles.continueContent}>
        <Row gutter={16}>
          {/* 左侧：表单 + 配置（生成提纲时也保留，不隐藏） */}
          <Col span={12}>
            {(phase === 'idle' || phase === 'awaiting_confirmation' || phase === 'mcp_gathering' || phase === 'segment_planning' || phase === 'writing_segment' || phase === 'paused' || phase === 'done' || phase === 'error') && (
              <>
                {isLoadingContinueInfo && phase === 'idle' && (
                  <div style={{ marginBottom: 16 }}>
                    <Spin size="small" /> 正在加载章节续写信息…
                  </div>
                )}
                <Divider orientation="left">配置</Divider>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Checkbox
                    checked={useMcpContext}
                    onChange={(e) => setUseMcpContext(e.target.checked)}
                    disabled={isFormDisabled}
                  >
                    使用 MCP 收集设定
                  </Checkbox>
                  
                  <Typography.Text>续写模型：</Typography.Text>
                  <Select
                    value={llmType}
                    onChange={setLlmType}
                    disabled={isFormDisabled}
                    style={{ width: 160 }}
                  >
                    <Select.Option value="gemini3">Gemini3</Select.Option>
                    <Select.Option value="deepseek">DeepSeek</Select.Option>
                    <Select.Option value="deepseek-chat">DeepSeek-Chat</Select.Option>
                  </Select>
                </Space>

                <br />

                <Space>
                  <Typography.Text>每段字数：</Typography.Text>
                  <InputNumber
                    min={300}
                    max={1500}
                    value={segmentTargetChars}
                    onChange={(v) => setSegmentTargetChars(v ?? 1000)}
                    disabled={isFormDisabled}
                  />
                  <Typography.Text>最大段数：</Typography.Text>
                  <InputNumber
                    min={1}
                    max={50}
                    value={maxSegments}
                    onChange={(v) => setMaxSegments(v ?? 20)}
                    disabled={isFormDisabled}
                  />
                </Space>

                <Divider orientation="left">提示词</Divider>
                <div className={styles.prompt_title}>
                  <span>角色：</span>
                </div>
                <TextArea
                  autoSize={{ minRows: 1 }}
                  disabled={isFormDisabled}
                  value={roleNames}
                  onChange={(e) => setRoleNames(e.target.value)}
                  placeholder="角色名称，逗号分隔"
                  style={{ marginBottom: 8 }}
                />
                <div className={styles.prompt_title}>
                  <span>阵营：</span>
                </div>
                <TextArea
                  autoSize={{ minRows: 1 }}
                  disabled={isFormDisabled}
                  value={factionNames}
                  onChange={(e) => setFactionNames(e.target.value)}
                  placeholder="阵营名称，逗号分隔"
                  style={{ marginBottom: 8 }}
                />
                <div className={styles.prompt_title}>
                  <span>地理：</span>
                </div>
                <TextArea
                  autoSize={{ minRows: 1 }}
                  disabled={isFormDisabled}
                  value={geoNames}
                  onChange={(e) => setGeoNames(e.target.value)}
                  placeholder="地点名称，逗号分隔"
                  style={{ marginBottom: 8 }}
                />
                
                <div className={styles.prompt_title}>
                  <span>章节总体风格设置：</span>
                </div>
                <Space wrap size={[6, 6]} style={{ marginBottom: 8 }}>
                  {STYLE_QUICK_TAGS.map((tag) => (
                    <Tag
                      key={tag}
                      style={{ cursor: isFormDisabled ? 'not-allowed' : 'pointer', marginRight: 0 }}
                      onClick={() => !isFormDisabled && handleStyleTagClick(tag)}
                    >
                      {tag}
                    </Tag>
                  ))}
                </Space>
                <TextArea
                  autoSize={{ minRows: 2 }}
                  disabled={isFormDisabled}
                  value={chapterStyle}
                  onChange={(e) => setChapterStyle(e.target.value)}
                  placeholder="叙述视角、文风、节奏等整体风格要求（可选），可点击上方标签快速填入"
                  style={{ marginBottom: 8 }}
                />

                <div className={styles.prompt_title}>
                  <span>注意事项：</span>
                  <Button
                    type="link"
                    size="small"
                    loading={isGeneratingAttention}
                    disabled={isFormDisabled}
                    onClick={handleGenAttention}
                  >
                    AI 生成
                  </Button>
                </div>
                <TextArea
                  autoSize={{ minRows: 2 }}
                  disabled={isFormDisabled}
                  value={attention}
                  onChange={(e) => setAttention(e.target.value)}
                  placeholder="扩写注意事项，可点击「AI 生成」由 AI 根据本章要点与设定生成（生成后直接覆盖）"
                  style={{ marginBottom: 8 }}
                />

                <div className={styles.prompt_title}>
                  <span>章节提示词（本章待写要点）：</span>
                </div>
                <TextArea
                  autoSize={{ minRows: 8 }}
                  disabled={isFormDisabled}
                  value={seedPrompt}
                  onChange={(e) => setSeedPrompt(e.target.value)}
                  placeholder="本章要写的内容要点…"
                />
              </>
            )}
          </Col>

          {/* 右侧：主操作 / 提纲回显；所有按钮始终可见，通过 loading/disabled 控制 */}
          <Col span={12}>
            <Divider orientation="left">分段设置</Divider>
            
            {/* 分段设置选项 */}
            <Space wrap style={{ marginBottom: 16 }}>
              <Typography.Text>提纲模型：</Typography.Text>
              <Select
                value={outlineModel}
                onChange={setOutlineModel}
                disabled={isFormDisabled}
                style={{ width: 180 }}
              >
                <Select.Option value="deepseek-reasoner">DeepSeek-Reasoner</Select.Option>
                <Select.Option value="deepseek-chat">DeepSeek-Chat（默认）</Select.Option>
                <Select.Option value="gemini3">Gemini3</Select.Option>
              </Select>
            {/* </Space> */}
            
            {/* 生成分段提纲按钮 - 放在列表上方 */}
            {/* <Space style={{ marginBottom: 16 }} wrap> */}
              <Button
                type="primary"
                icon={<RobotOutlined />}
                onClick={handleGenerateOutline}
                loading={phase === 'mcp_gathering' || phase === 'segment_planning'}
                disabled={isFormDisabled}
              >
                生成分段提纲
              </Button>
            </Space>

            {/* Loading 状态提示 */}
            {(phase === 'mcp_gathering' || phase === 'segment_planning') && (
              <Card size="small" style={{ marginBottom: 16 }}>
                <Spin spinning />
                <Typography.Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
                  {phase === 'mcp_gathering'
                    ? '正在通过 MCP 收集设定…'
                    : '正在生成分段提纲…'}
                </Typography.Paragraph>
              </Card>
            )}

            {/* 分段提纲列表（生成后显示） */}
            {segmentOutlineList.length > 0 && (
              <Card 
                size="small" 
                title="分段提纲（请确认后开始续写）"
                style={{ display: 'flex', flexDirection: 'column', marginBottom: 16 }}
                bodyStyle={{ flex: 1, overflow: 'auto', padding: '12px' }}
              >
                <List
                  dataSource={segmentOutlineList}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={`第 ${item.index} 段`}
                        description={
                          <Input.TextArea
                            value={item.outline}
                            onChange={(e) =>
                              handleEditOutline(item.index, e.target.value)
                            }
                            autoSize={{ minRows: 1 }}
                            placeholder="本段要点"
                            disabled={isFormDisabled}
                          />
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            )}

            {/* 提示信息 */}
            {phase === 'idle' && segmentOutlineList.length === 0 && (
              <>
                <Divider orientation="left">
                  生成提纲后将在右侧回显，确认后再开始逐段续写
                </Divider>
                <Typography.Text type="secondary">
                  勾选「使用 MCP 收集设定」时会先通过 MCP 收集世界观与实体，再生成提纲。
                </Typography.Text>
              </>
            )}
            {(phase === 'writing_segment' || phase === 'paused') && (
              <Typography.Text type="secondary">
                续写进行中，详见下方写作区
              </Typography.Text>
            )}
            {phase === 'done' && (
              <Typography.Text type="secondary">续写已完成，详见下方</Typography.Text>
            )}
            {phase === 'error' && (
              <Typography.Text type="danger">发生错误，详见下方</Typography.Text>
            )}

            {/* 其他操作按钮始终可见 */}
            <Space style={{ marginTop: 16, marginBottom: 0 }} wrap>
              <Button 
                type="primary" 
                onClick={handleConfirmAndStart}
                disabled={phase !== 'awaiting_confirmation' || segmentOutlineList.length === 0}
              >
                确认并开始续写
              </Button>
              <Button 
                onClick={handleCancelOutline}
                disabled={phase !== 'awaiting_confirmation'}
              >
                取消
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 下半部分全宽：正式写作时的进度与已生成内容（不隐藏上方组件） */}
        <Row style={{ marginTop: 24 }}>
          <Col span={24}>
            <Divider orientation="left">写作区</Divider>
            
            {/* 进度标签和状态 - 始终显示，不隐藏 */}
            <Space style={{ marginBottom: 12 }} wrap>
              {(phase === 'writing_segment' || phase === 'paused') && (
                <Tag color="blue">
                  {phase === 'writing_segment'
                    ? `续写第 ${segmentIndex} 段`
                    : '已暂停'}
                </Tag>
              )}
              {phase === 'done' && (
                <Alert message="已完成" type="success" showIcon style={{ marginBottom: 0 }} />
              )}
              {phase === 'error' && (
                <Alert
                  message="出错"
                  description={errorMessage || '未知错误'}
                  type="error"
                  showIcon
                  style={{ marginBottom: 0 }}
                />
              )}
              {(phase === 'awaiting_confirmation' || phase === 'idle') && segmentedContent && (
                <Tag color="default">已生成内容（可重写）</Tag>
              )}
              {segmentIndex > 0 && (phase === 'awaiting_confirmation' || phase === 'idle') && !segmentedContent && (
                <Tag color="default">准备续写第 {segmentIndex} 段</Tag>
              )}
            </Space>

            {/* 所有写作控制按钮始终可见 */}
            <Space style={{ marginBottom: 12 }} wrap>
              <Button 
                icon={<PauseCircleOutlined />} 
                onClick={handlePause}
                disabled={phase !== 'writing_segment'}
              >
                暂停
              </Button>
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />} 
                onClick={handleResume}
                disabled={phase !== 'paused'}
              >
                继续
              </Button>
              <Button 
                danger 
                icon={<StopOutlined />} 
                onClick={handleStop}
                disabled={phase !== 'writing_segment' && phase !== 'paused'}
              >
                停止
              </Button>
              <Button 
                type="primary"
                icon={<RobotOutlined />}
                onClick={handleRewrite}
                disabled={phase === 'writing_segment' || phase === 'paused'}
              >
                重写
              </Button>
              <Button 
                size="small" 
                icon={<CopyOutlined />} 
                onClick={handleCopyContent}
                disabled={!segmentedContent}
              >
                复制
              </Button>
              {onOk && (
                <Button
                  size="small"
                  type="primary"
                  onClick={() => {
                    if (segmentedContent) {
                      onOk(segmentedContent)
                      handleClose()
                    }
                  }}
                  disabled={!segmentedContent}
                >
                  采用并关闭
                </Button>
              )}
              <Button 
                onClick={handleClose}
                disabled={phase === 'writing_segment'}
              >
                关闭
              </Button>
              <Button 
                onClick={() => setPhase('idle')}
                disabled={phase === 'writing_segment'}
              >
                返回
              </Button>
            </Space>

            {/* 已生成内容显示 - 始终显示，不隐藏 */}
            <Card size="small" style={{ overflow: 'auto' }}>
              {segmentedContent ? (
                <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }} copyable>
                  {segmentedContent}
                </Typography.Paragraph>
              ) : (
                <Typography.Text type="secondary">
                  {phase === 'writing_segment' ? '正在生成第一段…' : '暂无内容'}
                </Typography.Text>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </Modal>
  )
}

export default GenChapterByDetailModal
