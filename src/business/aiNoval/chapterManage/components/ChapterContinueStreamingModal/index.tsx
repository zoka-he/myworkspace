import React, { useEffect, useState, useRef, useMemo } from 'react'
import { message } from '@/src/utils/antdAppMessage';

import { Modal, Button, Space, Row, Col, Form, Select, Checkbox, Divider, Input, Tag, Typography, Card, InputNumber, Collapse, Spin } from 'antd'
import { CloseOutlined, CopyOutlined, EditOutlined, RedoOutlined, RobotOutlined } from '@ant-design/icons'
import { IChapter } from '@/src/types/IAiNoval'
import * as chapterApi from '../../apiCalls'
import styles from '../ChapterContinuePanel.module.scss'
import * as apiCalls from '../../apiCalls'
import TextArea from 'antd/es/input/TextArea'
import _ from 'lodash'
import ChapterStripState, { type ChapterStripReport, type ChapterStripStateProps } from '../ChapterStripState'
import copyToClip from '@/src/utils/common/copy';
import store from '@/src/store'
import AttentionRefModal from '../AttentionRefModal'
import { useDeepseekBalance } from '@/src/utils/hooks/useDeepseekBalance';
import ContentViewModal from './components/ContentViewModal'
import ModalFooter from './components/ModalFooter'
import StripReportCard from './components/StripReportCard'
import AutoWriteResultCard from './components/AutoWriteResultCard'
import GenChapterStepBar from './components/GenChapterStepBar'
import { useGenChapterStepMachine } from './state/genChapterStepMachine'

/** 总体风格快速标签（与 GenChapterByDetailModal 对齐） */
const STYLE_QUICK_TAGS = [
  '第一人称', '第三人称', '快节奏', '细腻描写', '悬疑紧张', '轻松幽默',
  '硬核科幻', '冷硬写实', '诗意抒情', '对话驱动', '环境氛围', '热血战斗',
  '奇幻魔法', '银魂式搞笑', '周星驰式搞笑', '沙丘风','庄严宏伟'
]

interface ChapterContinueModalProps {
  selectedChapterId: number | undefined
  isVisible: boolean
  onClose: () => void
  // onChapterChange: () => void
}

interface PolishRoundData {
  round: number
  inputDraft: string
  critic1: {
    pass: boolean
    reason: string
    raw: string
  }
  critic3: {
    pass: boolean
    reason: string
    advice: string
    raw: string
  }
  modifier: {
    tunedDraft: string
    skipped: boolean
  }
  polish: {
    draft: string
  }
}


const MANUAL_ATTENTION_DEFAULT = `- 使用细腻流畅的行文风格，但不要堆砌形容词
- 使用奔放的情节的表达，可引入俚语和OOC，丰富情感
- 输出尽可能长的内容，约4000字左右
- 避免刻板描写、减少负面形容词
- 要符合中文的用词习惯和表达习惯，不要在对话中插入省略号`

function ChapterContinueModal({ selectedChapterId, isVisible, onClose }: ChapterContinueModalProps) {
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

  // 是否参考本章已有内容(默认不参考)
  const [isReferSelf, setIsReferSelf] = useState<boolean>(false)

  // LLM类型（初稿/润色分离，默认均为 deepseek）
  const [draftLlmType, setDraftLlmType] = useState<'gemini' | 'deepseek' | 'deepseek-chat' | 'gemini3'>('deepseek')
  const [polishLlmType, setPolishLlmType] = useState<'gemini' | 'deepseek' | 'deepseek-chat' | 'gemini3'>('deepseek-chat')
  const [criticLlmType, setCriticLlmType] = useState<'gemini' | 'deepseek' | 'deepseek-chat' | 'gemini3'>('deepseek')

  // 是否缩写本章
  const [isStripSelf, setIsStripSelf] = useState<boolean>(false)

  // 是否继续编写
  const [keepGoing, setKeepGoing] = useState<boolean>(false)
  const keepGoingRef = useRef<boolean>(false)

  // 自动续写结果
  const [autoWriteResult, setAutoWriteResult] = useState<string>('');

  // 自动续写耗时
  const [autoWriteElapsed, setAutoWriteElapsed] = useState<number>(0);

  // 自动续写状态
  const [autoWriteStatus, setAutoWriteStatus] = useState<string>('idle');

  // 自动续写错误
  const [autoWriteError, setAutoWriteError] = useState<string>('');

  // 聚合设定（用于展示）
  const [aggregatedContextText, setAggregatedContextText] = useState<string>('');
  const [isAggregatingContext, setIsAggregatingContext] = useState<boolean>(false);
  const [aggregatedContextError, setAggregatedContextError] = useState<string>('');

  // 初稿（流式生成，独立于最终稿）
  const [draftContent, setDraftContent] = useState<string>('');
  const [initialDraftContent, setInitialDraftContent] = useState<string>('');
  const [polishRounds, setPolishRounds] = useState<PolishRoundData[]>([]);
  const latestWriterDraftRef = useRef<string>("")

  // 更新 keepGoing 时同步更新 ref
  useEffect(() => {
    keepGoingRef.current = keepGoing
  }, [keepGoing])

  // 缩写状态列表
  const [stripReportList, setStripReportList] = useState<ChapterStripReport[]>([])
  // 章节 content 为空时的 id 列表，用于前端标红
  const [emptyContentChapterIds, setEmptyContentChapterIds] = useState<number[]>([])

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

  // 注意事项前的手写部分（不落库，与注意事项拼接后传入续写接口）
  const [manualSection, setManualSection] = useState<string>(MANUAL_ATTENTION_DEFAULT)

  // 章节文风（与 GenChapterByDetailModal 对齐）
  const [chapterStyle, setChapterStyle] = useState<string>('')

  // 额外设置
  const [extraSettings, setExtraSettings] = useState<string>('')

  // 角色组名称（使用章节的 actual_role_groups 字段）
  const [roleGroupNames, setRoleGroupNames] = useState<string>('')

  // 注意事项参考 Modal
  const [isAttentionRefVisible, setIsAttentionRefVisible] = useState(false)

  // 注意事项 AI 生成 loading
  const [isGeneratingAttention, setIsGeneratingAttention] = useState(false)

  // 文风对抗选项（与 GenChapterByDetailModal 一致）
  /** 抗克苏鲁文风：避免野兽比喻、腐败/腐化等常见模型偏向，默认勾选 */
  const [antiLovecraftStyle, setAntiLovecraftStyle] = useState(true)
  /** 抗甜宠/霸总文风：避免生理反应公式化、霸总标配描写，默认勾选 */
  const [antiSweetCeoStyle, setAntiSweetCeoStyle] = useState(true)
  /** 抗空泛协议/中二命名：禁止自创协议名、严格遵从设定中的协议，默认勾选 */
  const [antiFakeProtocolStyle, setAntiFakeProtocolStyle] = useState(true)
  /** 抗加密表述：遏制「加密信道」「加密线路」「加密频段」等高频套路表述，默认勾选 */
  const [antiEncryptedChannelStyle, setAntiEncryptedChannelStyle] = useState(true)
  /** 反废土文风：避免荒芜/废墟/辐射/末世等刻板废土描写，除非设定确为废土，默认勾选 */
  const [antiWastelandStyle, setAntiWastelandStyle] = useState(true)
  /** 反逐人枚举：多人场景优先概括集体行为，避免逐人枚举反应，默认勾选 */
  const [antiEnumReactionsStyle, setAntiEnumReactionsStyle] = useState(true)
  /** 抗套路样板词：避免恰到好处、不易察觉、微微一笑、深吸一口气等网文套路词，默认勾选 */
  const [antiClichePhraseStyle, setAntiClichePhraseStyle] = useState(true)
  /** 抗剧透及解释：禁止提前剧透和用旁白解释剧情、动机、因果，默认勾选 */
  const [antiPlotExplanation, setAntiPlotExplanation] = useState(true)
  /** 抗演讲/军事腔调：避免对白像演讲、口号或军事命令，默认勾选 */
  const [antiSpeechMilitarySummaryStyle, setAntiSpeechMilitarySummaryStyle] = useState(true)
  /** 抗双重否定句：少用叠床架屋的双重否定，优先清晰直陈，默认勾选 */
  const [antiDoubleNegativeStyle, setAntiDoubleNegativeStyle] = useState(true)

  /** 审稿员最多审核次数，默认 3 */
  const [criticMaxRounds, setCriticMaxRounds] = useState(3)

  /** 文风对抗：写入初稿/润色流式接口请求体（与 blocking genChapter 字段一致） */
  const antiStyleRequestFields = useMemo(
    () => ({
      anti_lovecraft_style: antiLovecraftStyle,
      anti_sweet_ceo_style: antiSweetCeoStyle,
      anti_fake_protocol_style: antiFakeProtocolStyle,
      anti_encrypted_channel_style: antiEncryptedChannelStyle,
      anti_wasteland_style: antiWastelandStyle,
      anti_enum_reactions_style: antiEnumReactionsStyle,
      anti_cliche_phrase_style: antiClichePhraseStyle,
      anti_plot_explanation: antiPlotExplanation,
      anti_speech_military_summary_style: antiSpeechMilitarySummaryStyle,
      anti_double_negative_style: antiDoubleNegativeStyle,
    }),
    [
      antiLovecraftStyle,
      antiSweetCeoStyle,
      antiFakeProtocolStyle,
      antiEncryptedChannelStyle,
      antiWastelandStyle,
      antiEnumReactionsStyle,
      antiClichePhraseStyle,
      antiPlotExplanation,
      antiSpeechMilitarySummaryStyle,
      antiDoubleNegativeStyle,
    ]
  )

  // Deepseek余额
  const deepseekBalance = useDeepseekBalance()

  // 原子步骤状态机（步骤条展示；后续接入 streaming step 编排器事件）
  const stepMachine = useGenChapterStepMachine()

  const STREAM_IDLE_TIMEOUT_MS = 3 * 60 * 1000
  const getCurrentPrompt = () => (promptWorkMode === "full" ? seedPrompt : selectedPromptParts.join("\n"))
  const stripCritic2Prefix = (text: string) =>
    text.replace(/^【理解检查】(?:PASS|FAIL（任务理解错误）)(?:：[^\n]*)?\n\n/, "")

  const readNdjsonStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    opts: {
      step: string
      controller?: AbortController
      idleTimeoutMs?: number
      onEvent: (evt: any) => void
    }
  ) => {
    const decoder = new TextDecoder("utf-8")
    const idleTimeoutMs = opts.idleTimeoutMs ?? STREAM_IDLE_TIMEOUT_MS
    let buffer = ""
    let timeoutId: any = null
    let timedOut = false

    const armTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        timedOut = true
        try {
          opts.controller?.abort()
        } catch {
          // ignore
        }
      }, idleTimeoutMs)
    }

    try {
      armTimeout()
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (timedOut) {
          throw new Error(`${opts.step} streaming timeout: no ndjson for ${Math.floor(idleTimeoutMs / 1000)}s`)
        }
        armTimeout()
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""
        for (const line of lines) {
          const t = line.trim()
          if (!t) continue
          let evt: any
          try {
            evt = JSON.parse(t)
          } catch {
            continue
          }
          armTimeout()
          opts.onEvent(evt)
        }
      }
      // flush last buffer
      const tail = buffer.trim()
      if (tail) {
        try {
          const evt = JSON.parse(tail)
          opts.onEvent(evt)
        } catch {
          // ignore
        }
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

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

      // 章节文风
      setChapterStyle(selectedChapter?.chapter_style || selectedChapter?.overall_style || '')

      // 额外设置
      setExtraSettings(selectedChapter?.extra_settings || '')

      // 自动续写结果
      setAutoWriteResult(selectedChapter?.content || '')

      setAutoWriteStatus('idle')

      setAutoWriteError('')

      setAutoWriteElapsed(0)
      // 角色组名称
      setRoleGroupNames(selectedChapter?.actual_role_groups || selectedChapter?.role_group_names || '')
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
    if (novelId && selectedChapter?.chapter_number) {
      let from = selectedChapter.chapter_number - 100;
      let to = selectedChapter.chapter_number;
      apiCalls.getChapterListFrom(novelId, from, to).then(res => {
        const ret = res.data;
        if (ret && ret.length > 0) {
          setChapterList(ret.reverse())
        } else {
          setChapterList([])
        }
      })
    } else {
      setChapterList([])
    }
  }, [novelId, selectedChapter])

  // 处理AI续写（StepC+StepD：生成初稿 + 理解检查）
  const runFromDraftAndCritic2 = async (prevContent: string, contextText: string) => {
    if (!selectedChapter) {
      throw new Error("章节为空，无法继续")
    }

    // StepC：初稿流式生成（NDJSON streaming）
    stepMachine.stepStart("writerDraft", "生成初稿（流式）")
    setDraftContent("")
    setAutoWriteStatus("初稿生成中")
    setAutoWriteError("")
    setAutoWriteElapsed(0)
    const writerDraftStartTime = Date.now()

    const prompt = getCurrentPrompt()

    const writerDraftController = new AbortController()
    const resp = await fetch(
      `/api/aiNoval/chapters/genChapterStreaming/writerDraft?worldviewId=${selectedChapter.worldview_id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: writerDraftController.signal,
        body: JSON.stringify({
          prev_content: prevContent || "",
          curr_context: prompt || "",
          context: contextText || "",
          attention: attention || "",
          attension: attention || "",
          llm_type: draftLlmType,
          draft_llm_type: draftLlmType,
          ...antiStyleRequestFields,
        }),
      }
    )

    if (!resp.ok) {
      const msg = `writerDraft http ${resp.status}`
      stepMachine.stepError("writerDraft", msg)
      throw new Error(msg)
    }
    if (!resp.body) {
      const msg = "writerDraft response body is empty"
      stepMachine.stepError("writerDraft", msg)
      throw new Error(msg)
    }

    const reader = resp.body.getReader()
    let draftSnapshot = ""
    await readNdjsonStream(reader, {
      step: "writerDraft",
      controller: writerDraftController,
      onEvent: (evt) => {
        if (evt?.type === "delta" && typeof evt?.text === "string") {
          const delta = evt.text
          draftSnapshot += delta
          setDraftContent((prev) => prev + delta)
        }
        if (evt?.type === "result" && evt?.data?.draft != null) {
          const full = String(evt.data.draft || "")
          draftSnapshot = full
          setDraftContent(full)
        }
        if (evt?.type === "error") {
          const msg = evt?.message || "writerDraft error"
          stepMachine.stepError("writerDraft", msg)
          throw new Error(msg)
        }
      },
    })

    stepMachine.stepEnd("writerDraft", "初稿生成完成")
    latestWriterDraftRef.current = draftSnapshot || ""
    setAutoWriteStatus("初稿生成完成")
    setAutoWriteElapsed(Date.now() - writerDraftStartTime)

    // StepD：理解检查（critic2）
    stepMachine.stepStart("critic2", "理解检查")
    const critic2Resp = await fetch(
      `/api/aiNoval/chapters/genChapterStreaming/critic2?worldviewId=${selectedChapter.worldview_id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: draftSnapshot || draftContent || "",
          prev_content: prevContent || "",
          curr_context: prompt || "",
          llm_type: criticLlmType,
          polish_llm_type: criticLlmType,
        }),
      }
    )
    if (!critic2Resp.ok) {
      const msg = `critic2 http ${critic2Resp.status}`
      stepMachine.stepError("critic2", msg)
      throw new Error(msg)
    }
    const critic2Text = await critic2Resp.text()
    let misunderstood = false
    let critic2Raw = ""
    for (const line of critic2Text.split("\n")) {
      const t = line.trim()
      if (!t) continue
      try {
        const evt = JSON.parse(t)
        if (evt?.type === "result") {
          misunderstood = !!evt?.data?.misunderstood
          critic2Raw = String(evt?.data?.raw || "")
        }
        if (evt?.type === "error") {
          throw new Error(evt?.message || "critic2 error")
        }
      } catch (e: any) {
        if (e?.message && e.message !== "Unexpected token d in JSON at position 0") {
          throw e
        }
      }
    }

    const critic2Prefix = misunderstood
      ? `【理解检查】FAIL（任务理解错误）${critic2Raw ? `：${critic2Raw}` : ""}\n\n`
      : `【理解检查】PASS${critic2Raw ? `：${critic2Raw}` : ""}\n\n`
    const firstDraftWithCritic2 = `${critic2Prefix}${draftSnapshot || ""}`
    setDraftContent(firstDraftWithCritic2)
    setInitialDraftContent(firstDraftWithCritic2)

    if (misunderstood) {
      const msg = "理解检查未通过：模型误解了任务，已停止后续步骤。可点击“重新润色”手动继续润色流程。"
      stepMachine.stepError("critic2", msg)
      setAutoWriteStatus("error")
      setAutoWriteError(msg)
      throw new Error(msg)
    }
    stepMachine.stepEnd("critic2", "理解检查通过")

    // StepE~H：润色迭代（critic1 -> critic3/modifier并发 -> polish）
    let roundDraft = draftSnapshot || ""
    setPolishRounds([])
    const upsertRound = (round: number, patch: Partial<PolishRoundData>) => {
      setPolishRounds((prev) => {
        const index = prev.findIndex((x) => x.round === round)
        const base: PolishRoundData =
          index >= 0
            ? prev[index]
            : {
                round,
                inputDraft: "",
                critic1: { pass: false, reason: "", raw: "" },
                critic3: { pass: false, reason: "", advice: "", raw: "" },
                modifier: { tunedDraft: "", skipped: false },
                polish: { draft: "" },
              }
        const nextItem: PolishRoundData = {
          ...base,
          ...patch,
          critic1: { ...base.critic1, ...(patch.critic1 || {}) },
          critic3: { ...base.critic3, ...(patch.critic3 || {}) },
          modifier: { ...base.modifier, ...(patch.modifier || {}) },
          polish: { ...base.polish, ...(patch.polish || {}) },
        }
        if (index >= 0) {
          const next = [...prev]
          next[index] = nextItem
          return next
        }
        return [...prev, nextItem]
      })
    }
    for (let round = 1; round <= criticMaxRounds; round++) {
      stepMachine.setRounds(round, criticMaxRounds)
      upsertRound(round, { inputDraft: roundDraft || "" })

      // StepE: critic1
      stepMachine.stepStart("critic1")
      const critic1Controller = new AbortController()
      const critic1Resp = await fetch(
        `/api/aiNoval/chapters/genChapterStreaming/critic1?worldviewId=${selectedChapter.worldview_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: critic1Controller.signal,
          body: JSON.stringify({
            draft: roundDraft || "",
            prev_content: prevContent || "",
            curr_context: prompt || "",
            context: contextText || "",
            llm_type: criticLlmType,
            polish_llm_type: criticLlmType,
          }),
        }
      )
      if (!critic1Resp.ok) {
        const msg = `critic1 http ${critic1Resp.status}`
        stepMachine.stepError("critic1", msg)
        throw new Error(msg)
      }
      if (!critic1Resp.body) {
        const msg = "critic1 response body is empty"
        stepMachine.stepError("critic1", msg)
        throw new Error(msg)
      }
      const c1Reader = critic1Resp.body.getReader()
      let critic1Pass = false
      let critic1Reason = ""
      let critic1Raw = ""
      await readNdjsonStream(c1Reader, {
        step: "critic1",
        controller: critic1Controller,
        onEvent: (evt) => {
          if (evt?.type === "delta" && typeof evt?.text === "string") {
            critic1Raw += evt.text
            upsertRound(round, { critic1: { pass: critic1Pass, reason: critic1Reason, raw: critic1Raw } })
          }
          if (evt?.type === "result") {
            critic1Pass = !!evt?.data?.pass
            critic1Reason = String(evt?.data?.reason || "")
            critic1Raw = String(evt?.data?.raw || critic1Raw || "")
            upsertRound(round, { critic1: { pass: critic1Pass, reason: critic1Reason, raw: critic1Raw } })
          }
          if (evt?.type === "error") {
            throw new Error(evt?.message || "critic1 error")
          }
        },
      })
      stepMachine.stepEnd("critic1")

      // StepF + StepG 并发
      stepMachine.stepStart("critic3")
      stepMachine.stepStart("modifier")
      const critic3Controller = new AbortController()
      const modifierController = new AbortController()
      const [critic3Resp, modifierResp] = await Promise.all([
        fetch(`/api/aiNoval/chapters/genChapterStreaming/critic3?worldviewId=${selectedChapter.worldview_id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: critic3Controller.signal,
          body: JSON.stringify({
            draft: roundDraft || "",
            prev_content: prevContent || "",
            curr_context: prompt || "",
            context: contextText || "",
            attention: attention || "",
            attension: attention || "",
            llm_type: criticLlmType,
            polish_llm_type: criticLlmType,
            critic1_pass: critic1Pass,
            critic1_reason: critic1Reason || "",
          }),
        }),
        fetch(`/api/aiNoval/chapters/genChapterStreaming/modifier?worldviewId=${selectedChapter.worldview_id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: modifierController.signal,
          body: JSON.stringify({
            draft: roundDraft || "",
            critic1_reason: critic1Reason || "",
          }),
        }),
      ])
      if (!critic3Resp.ok) {
        const msg = `critic3 http ${critic3Resp.status}`
        stepMachine.stepError("critic3", msg)
        throw new Error(msg)
      }
      if (!modifierResp.ok) {
        const msg = `modifier http ${modifierResp.status}`
        stepMachine.stepError("modifier", msg)
        throw new Error(msg)
      }

      if (!critic3Resp.body) {
        const msg = "critic3 response body is empty"
        stepMachine.stepError("critic3", msg)
        throw new Error(msg)
      }
      if (!modifierResp.body) {
        const msg = "modifier response body is empty"
        stepMachine.stepError("modifier", msg)
        throw new Error(msg)
      }

      const c3Reader = critic3Resp.body.getReader()
      let critic3Pass = false
      let critic3Reason = ""
      let critic3Advice = ""
      let critic3Raw = ""
      await readNdjsonStream(c3Reader, {
        step: "critic3",
        controller: critic3Controller,
        onEvent: (evt) => {
          if (evt?.type === "delta" && typeof evt?.text === "string") {
            critic3Raw += evt.text
            upsertRound(round, {
              critic3: { pass: critic3Pass, reason: critic3Reason, advice: critic3Advice, raw: critic3Raw },
            })
          }
          if (evt?.type === "result") {
            critic3Pass = !!evt?.data?.pass
            critic3Reason = String(evt?.data?.reason || "")
            critic3Advice = String(evt?.data?.advice || "")
            critic3Raw = String(evt?.data?.raw || critic3Raw || "")
            upsertRound(round, {
              critic3: { pass: critic3Pass, reason: critic3Reason, advice: critic3Advice, raw: critic3Raw },
            })
          }
          if (evt?.type === "error") {
            throw new Error(evt?.message || "critic3 error")
          }
        },
      })
      stepMachine.stepEnd("critic3")
      const bothPass = critic1Pass && critic3Pass
      if (bothPass) {
        try {
          modifierController.abort()
        } catch {
          // ignore abort error
        }
        stepMachine.stepSkip("modifier", "1号与3号均 PASS，跳过改写")
        stepMachine.stepSkip("polish", "1号与3号均 PASS，跳过改写")
        upsertRound(round, {
          inputDraft: roundDraft || "",
          critic1: {
            pass: critic1Pass,
            reason: critic1Reason,
            raw: critic1Raw,
          },
          critic3: {
            pass: critic3Pass,
            reason: critic3Reason,
            advice: critic3Advice,
            raw: critic3Raw,
          },
          modifier: {
            tunedDraft: roundDraft || "",
            skipped: true,
          },
          polish: {
            draft: roundDraft || "",
          },
        })
        setAutoWriteStatus(`润色第 ${round} 轮通过（1号&3号均 PASS）`)
        break
      }

      const mReader = modifierResp.body.getReader()
      let tunedDraft = roundDraft || ""
      let modifierSkipped = false
      await readNdjsonStream(mReader, {
        step: "modifier",
        controller: modifierController,
        onEvent: (evt) => {
          if (evt?.type === "delta" && typeof evt?.text === "string") {
            tunedDraft += evt.text
            upsertRound(round, { modifier: { tunedDraft, skipped: false } })
          }
          if (evt?.type === "result") {
            tunedDraft = String(evt?.data?.tunedDraft || tunedDraft || "")
            modifierSkipped = !!evt?.data?.skipped
            upsertRound(round, { modifier: { tunedDraft: tunedDraft || "", skipped: modifierSkipped } })
          }
          if (evt?.type === "error") {
            throw new Error(evt?.message || "modifier error")
          }
        },
      })
      stepMachine.stepEnd("modifier")

      // StepH: polish（rewrite 接口）
      stepMachine.stepStart("polish")
      const polishController = new AbortController()
      const polishResp = await fetch(
        `/api/aiNoval/chapters/genChapterStreaming/rewrite?worldviewId=${selectedChapter.worldview_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: polishController.signal,
          body: JSON.stringify({
            draft: tunedDraft || "",
            rejectedDraft: tunedDraft || "",
            prev_content: prevContent || "",
            curr_context: prompt || "",
            context: contextText || "",
            attention: attention || "",
            attension: attention || "",
            llm_type: polishLlmType,
            polish_llm_type: polishLlmType,
            mergedCriticReason: critic3Advice || critic1Reason || "",
            criticReason: critic3Advice || critic1Reason || "",
            ...antiStyleRequestFields,
          }),
        }
      )
      if (!polishResp.ok) {
        const msg = `polish http ${polishResp.status}`
        stepMachine.stepError("polish", msg)
        throw new Error(msg)
      }
      if (!polishResp.body) {
        const msg = "polish response body is empty"
        stepMachine.stepError("polish", msg)
        throw new Error(msg)
      }

      const pReader = polishResp.body.getReader()
      let polishedDraft = ""
      await readNdjsonStream(pReader, {
        step: "polish",
        controller: polishController,
        onEvent: (evt) => {
          if (evt?.type === "delta" && typeof evt?.text === "string") {
            polishedDraft += evt.text
            upsertRound(round, { polish: { draft: polishedDraft } })
          }
          if (evt?.type === "result" && evt?.data?.draft != null) {
            polishedDraft = String(evt?.data?.draft || "")
            upsertRound(round, { polish: { draft: polishedDraft } })
          }
          if (evt?.type === "error") {
            const msg = evt?.message || "polish error"
            stepMachine.stepError("polish", msg)
            throw new Error(msg)
          }
        },
      })
      stepMachine.stepEnd("polish")

      upsertRound(round, {
        inputDraft: roundDraft || "",
        critic1: {
          pass: critic1Pass,
          reason: critic1Reason,
          raw: critic1Raw,
        },
        critic3: {
          pass: critic3Pass,
          reason: critic3Reason,
          advice: critic3Advice,
          raw: critic3Raw,
        },
        modifier: {
          tunedDraft: tunedDraft || "",
          skipped: modifierSkipped,
        },
        polish: {
          draft: polishedDraft || "",
        },
      })
      roundDraft = polishedDraft || roundDraft || ""
      setDraftContent(roundDraft)
      setAutoWriteStatus(`润色第 ${round} 轮完成`)
    }

    // 结束节点
    stepMachine.stepStart("end")
    stepMachine.stepEnd("end")
  }

  // 处理AI续写（StepB+StepC+StepD：聚合设定 + 生成初稿 + 理解检查）
  const runFromAggregateToDraftAndCritic2 = async (prevContent: string) => {
    if (!selectedChapter) {
      throw new Error("章节为空，无法继续")
    }

    stepMachine.stepStart("aggregateContext", "聚合设定")
    setIsAggregatingContext(true)
    setAggregatedContextError("")

    let contextText = ""
    try {
      const response = await fetch(
        `/api/aiNoval/chapters/genChapterStreaming/aggregateContext?worldviewId=${selectedChapter.worldview_id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role_group_names: roleGroupNames || "",
            role_names: roleNames || "",
            faction_names: factionNames || "",
            geo_names: geoNames || "",
          }),
        }
      )

      const text = await response.text()
      if (!response.ok) {
        throw new Error(`aggregateContext http ${response.status}`)
      }

      for (const line of text.split("\n")) {
        const t = line.trim()
        if (!t) continue
        try {
          const evt = JSON.parse(t)
          if (evt?.type === "result" && evt?.data?.context) {
            contextText = evt.data.context || ""
          }
        } catch {
          // ignore parse error for non-json lines
        }
      }

      setAggregatedContextText(contextText)
      stepMachine.stepEnd("aggregateContext", "聚合设定完成")
    } catch (e: any) {
      const msg = e?.message || "聚合设定失败"
      setAggregatedContextError(msg)
      stepMachine.stepError("aggregateContext", msg)
      throw e
    } finally {
      setIsAggregatingContext(false)
    }

    await runFromDraftAndCritic2(prevContent, contextText)
  }

  const handleContinue = async () => {
    if (!selectedChapter) return
    if (relatedChapterIds.length === 0 && !isReferSelf) return

    // blocking 缩写并发执行
    const difyHost = store.getState().difySlice.frontHost || ""

    let currentStep: any = "prepareInputs"
    try {
      // 第一步：设置状态，关闭所有编辑权限
      setIsContinuing(true)
      setIsLoading(true)
      setContinuedContent("")
      setKeepGoing(true)
      setDraftContent("")
      setInitialDraftContent("")
      setPolishRounds([])

      // 步骤条
      stepMachine.startRun()
      stepMachine.stepStart("start")
      stepMachine.stepEnd("start")
      stepMachine.setRounds(0, criticMaxRounds)
      currentStep = "prepareInputs"
      stepMachine.stepStart("prepareInputs", "缩写前文")

      // 第二步：加载所有关联章节内容（有 summary 或者 actual_seed_prompt 直接采用；否则标记为 pending 等待 blocking 缩写）
      const emptyIds: number[] = []
      const preparedChapterList: ChapterStripReport[] = []

      for (const chapterId of relatedChapterIds) {
        const res = await apiCalls.getChapterById(chapterId)
        const originalContent = (res?.content || "") as string
        let summary = (res?.summary ??  "").toString().trim()

        if (summary) {
          preparedChapterList.push({
            state: "completed",
            chapterNumber: res.chapter_number || 0,
            chapterTitle: res.title || "",
            version: res.version || 0,
            id: res.id,
            originalContent,
            strippedContent: summary,
          })
          continue
        }

        if (!originalContent.trim()) {
          preparedChapterList.push({
            state: "completed",
            chapterNumber: res.chapter_number || 0,
            chapterTitle: res.title || "",
            version: res.version || 0,
            id: res.id,
            originalContent,
            strippedContent: "",
          })
          if (res.id != null) emptyIds.push(res.id)
          continue
        }

        preparedChapterList.push({
          state: "pending",
          chapterNumber: res.chapter_number || 0,
          chapterTitle: res.title || "",
          version: res.version || 0,
          id: res.id,
          originalContent,
          strippedContent: "",
        })
      }

      // 如果参考本章，则将本章内容加入到 preparedChapterList 中
      if (isReferSelf && selectedChapter) {
        const selfContent = (selectedChapter.content || "") as string
        const selfSummary = (selectedChapter.summary ?? "").toString().trim()

        if (!isStripSelf) {
          preparedChapterList.push({
            state: "completed",
            chapterNumber: selectedChapter.chapter_number || 0,
            chapterTitle: selectedChapter.title || "",
            version: selectedChapter.version || 0,
            id: selectedChapter.id,
            originalContent: selfContent,
            strippedContent: selfContent,
          })
        } else if (selfSummary) {
          preparedChapterList.push({
            state: "completed",
            chapterNumber: selectedChapter.chapter_number || 0,
            chapterTitle: selectedChapter.title || "",
            version: selectedChapter.version || 0,
            id: selectedChapter.id,
            originalContent: selfContent,
            strippedContent: selfSummary,
          })
        } else if (!selfContent.trim()) {
          preparedChapterList.push({
            state: "completed",
            chapterNumber: selectedChapter.chapter_number || 0,
            chapterTitle: selectedChapter.title || "",
            version: selectedChapter.version || 0,
            id: selectedChapter.id,
            originalContent: selfContent,
            strippedContent: "",
          })
          if (selectedChapter.id != null) emptyIds.push(selectedChapter.id)
        } else {
          preparedChapterList.push({
            state: "pending",
            chapterNumber: selectedChapter.chapter_number || 0,
            chapterTitle: selectedChapter.title || "",
            version: selectedChapter.version || 0,
            id: selectedChapter.id,
            originalContent: selfContent,
            strippedContent: "",
          })
        }
      }

      setEmptyContentChapterIds(emptyIds)
      setStripReportList(preparedChapterList)

      // 第三步：blocking 缩写 pending chapters（并发）
      const pendingTasks = preparedChapterList.map(async (chapter, chapterIndex) => {
        if (chapter.state !== "pending") return
        if (!keepGoingRef.current) return

        if (chapter.id == null) {
          // 缺少 id 无法走后端 summarize，直接置空完成
          setStripReportList(prevList => {
            const newList = [...prevList]
            newList[chapterIndex] = { ...chapter, state: "completed", strippedContent: "" }
            return newList
          })
          return
        }

        // 置为 processing
        setStripReportList(prevList => {
          const newList = [...prevList]
          newList[chapterIndex] = { ...chapter, state: "processing" }
          return newList
        })

        // blocking：后端返回后再更新结果
        const text = await chapterApi.summarizeChapterAndSave(chapter.id, 300, difyHost)

        if (!keepGoingRef.current) return

        setStripReportList(prevList => {
          const newList = [...prevList]
          newList[chapterIndex] = {
            ...chapter,
            state: "completed",
            strippedContent: text,
          }
          return newList
        })
      })

      await Promise.all(pendingTasks)

      // blocking 缩写结束：StepA done
      stepMachine.stepEnd("prepareInputs", "完成缩写前文")

      const prompt = getCurrentPrompt()
      const prevContent = preparedChapterList
        .filter((c) => c.state === "completed" && c.strippedContent)
        .map((c) => c.strippedContent)
        .join("\n\n")
      currentStep = null
      await runFromAggregateToDraftAndCritic2(prevContent || prompt || "")
    } catch (error: any) {
      console.error("continueChapter error -> ", error)
      message.error("续写失败，原因：" + (error?.message || error))
      if (currentStep) {
        try {
          stepMachine.stepError(currentStep, error?.message || "step failed")
        } catch {
          // ignore
        }
      }
    } finally {
      setIsContinuing(false)
      setIsLoading(false)
      setKeepGoing(false)
    }
  }

  const handleReContinue = async () => {
    if (!selectedChapter) return

    try {
      setIsContinuing(true)
      setIsLoading(true)
      setKeepGoing(true)
      setDraftContent("")
      setInitialDraftContent("")
      setPolishRounds([])
      setAutoWriteError("")
      setAutoWriteElapsed(0)
      setAutoWriteStatus("重写中")

      // 按要求：重写不包含“聚合设定”，直接从“生成初稿”开始
      stepMachine.startRun()
      stepMachine.setRounds(0, criticMaxRounds)
      stepMachine.stepSkip("start", "重写从生成初稿开始")
      stepMachine.stepSkip("prepareInputs", "复用已缩写前文")
      stepMachine.stepSkip("aggregateContext", "重写不执行聚合设定")

      const prevContent = stripReportList
        .filter((c) => c.state === "completed" && c.strippedContent)
        .map((c) => c.strippedContent)
        .join("\n\n")
      const prompt = getCurrentPrompt()
      await runFromDraftAndCritic2(prevContent || prompt || "", aggregatedContextText || "")

    } catch (error: any) {
      console.error('continueChapter error -> ', error)
      message.error('续写失败，原因：' + error.message)
    } finally {
      setIsContinuing(false)
      setIsLoading(false)
      setKeepGoing(false)
    }
  }

  const handleRePolish = async () => {
    if (!selectedChapter) return

    const prompt = getCurrentPrompt()
    const prevContent = stripReportList
      .filter((c) => c.state === "completed" && c.strippedContent)
      .map((c) => c.strippedContent)
      .join("\n\n")
    const roundSeedDraft = (
      latestWriterDraftRef.current.trim() ||
      stripCritic2Prefix((initialDraftContent || draftContent || "").trim())
    ).trim()

    if (!roundSeedDraft) {
      message.warning("暂无可用于重新润色的初稿")
      return
    }

    try {
      setIsContinuing(true)
      setIsLoading(true)
      setKeepGoing(true)
      setAutoWriteError("")
      setAutoWriteStatus("重新润色中")
      setPolishRounds([])

      stepMachine.startRun()
      stepMachine.setRounds(0, criticMaxRounds)
      stepMachine.stepSkip("start", "手动触发重新润色")
      stepMachine.stepSkip("prepareInputs", "复用已缩写前文")
      stepMachine.stepSkip("aggregateContext", "重新润色不执行聚合设定")
      stepMachine.stepSkip("writerDraft", "复用已有初稿")
      stepMachine.stepSkip("critic2", "手动触发，跳过理解检查")

      let roundDraft = roundSeedDraft
      const upsertRound = (round: number, patch: Partial<PolishRoundData>) => {
        setPolishRounds((prev) => {
          const index = prev.findIndex((x) => x.round === round)
          const base: PolishRoundData =
            index >= 0
              ? prev[index]
              : {
                  round,
                  inputDraft: "",
                  critic1: { pass: false, reason: "", raw: "" },
                  critic3: { pass: false, reason: "", advice: "", raw: "" },
                  modifier: { tunedDraft: "", skipped: false },
                  polish: { draft: "" },
                }
          const nextItem: PolishRoundData = {
            ...base,
            ...patch,
            critic1: { ...base.critic1, ...(patch.critic1 || {}) },
            critic3: { ...base.critic3, ...(patch.critic3 || {}) },
            modifier: { ...base.modifier, ...(patch.modifier || {}) },
            polish: { ...base.polish, ...(patch.polish || {}) },
          }
          if (index >= 0) {
            const next = [...prev]
            next[index] = nextItem
            return next
          }
          return [...prev, nextItem]
        })
      }

      for (let round = 1; round <= criticMaxRounds; round++) {
        stepMachine.setRounds(round, criticMaxRounds)
        upsertRound(round, { inputDraft: roundDraft || "" })

        stepMachine.stepStart("critic1")
        const critic1Controller = new AbortController()
        const critic1Resp = await fetch(
          `/api/aiNoval/chapters/genChapterStreaming/critic1?worldviewId=${selectedChapter.worldview_id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: critic1Controller.signal,
            body: JSON.stringify({
              draft: roundDraft || "",
              prev_content: prevContent || "",
              curr_context: prompt || "",
              context: aggregatedContextText || "",
              llm_type: criticLlmType,
              polish_llm_type: criticLlmType,
            }),
          }
        )
        if (!critic1Resp.ok || !critic1Resp.body) {
          const msg = !critic1Resp.ok ? `critic1 http ${critic1Resp.status}` : "critic1 response body is empty"
          stepMachine.stepError("critic1", msg)
          throw new Error(msg)
        }
        const c1Reader = critic1Resp.body.getReader()
        let critic1Pass = false
        let critic1Reason = ""
        let critic1Raw = ""
        await readNdjsonStream(c1Reader, {
          step: "critic1",
          controller: critic1Controller,
          onEvent: (evt) => {
            if (evt?.type === "delta" && typeof evt?.text === "string") {
              critic1Raw += evt.text
              upsertRound(round, { critic1: { pass: critic1Pass, reason: critic1Reason, raw: critic1Raw } })
            }
            if (evt?.type === "result") {
              critic1Pass = !!evt?.data?.pass
              critic1Reason = String(evt?.data?.reason || "")
              critic1Raw = String(evt?.data?.raw || critic1Raw || "")
              upsertRound(round, { critic1: { pass: critic1Pass, reason: critic1Reason, raw: critic1Raw } })
            }
            if (evt?.type === "error") throw new Error(evt?.message || "critic1 error")
          },
        })
        stepMachine.stepEnd("critic1")

        stepMachine.stepStart("critic3")
        stepMachine.stepStart("modifier")
        const critic3Controller = new AbortController()
        const modifierController = new AbortController()
        const [critic3Resp, modifierResp] = await Promise.all([
          fetch(`/api/aiNoval/chapters/genChapterStreaming/critic3?worldviewId=${selectedChapter.worldview_id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: critic3Controller.signal,
            body: JSON.stringify({
              draft: roundDraft || "",
              prev_content: prevContent || "",
              curr_context: prompt || "",
              context: aggregatedContextText || "",
              attention: attention || "",
              attension: attention || "",
              llm_type: criticLlmType,
              polish_llm_type: criticLlmType,
              critic1_pass: critic1Pass,
              critic1_reason: critic1Reason || "",
            }),
          }),
          fetch(`/api/aiNoval/chapters/genChapterStreaming/modifier?worldviewId=${selectedChapter.worldview_id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: modifierController.signal,
            body: JSON.stringify({
              draft: roundDraft || "",
              critic1_reason: critic1Reason || "",
            }),
          }),
        ])
        if (!critic3Resp.ok || !critic3Resp.body) {
          const msg = !critic3Resp.ok ? `critic3 http ${critic3Resp.status}` : "critic3 response body is empty"
          stepMachine.stepError("critic3", msg)
          throw new Error(msg)
        }
        if (!modifierResp.ok || !modifierResp.body) {
          const msg = !modifierResp.ok ? `modifier http ${modifierResp.status}` : "modifier response body is empty"
          stepMachine.stepError("modifier", msg)
          throw new Error(msg)
        }

        const c3Reader = critic3Resp.body.getReader()
        let critic3Pass = false
        let critic3Reason = ""
        let critic3Advice = ""
        let critic3Raw = ""
        await readNdjsonStream(c3Reader, {
          step: "critic3",
          controller: critic3Controller,
          onEvent: (evt) => {
            if (evt?.type === "delta" && typeof evt?.text === "string") {
              critic3Raw += evt.text
              upsertRound(round, { critic3: { pass: critic3Pass, reason: critic3Reason, advice: critic3Advice, raw: critic3Raw } })
            }
            if (evt?.type === "result") {
              critic3Pass = !!evt?.data?.pass
              critic3Reason = String(evt?.data?.reason || "")
              critic3Advice = String(evt?.data?.advice || "")
              critic3Raw = String(evt?.data?.raw || critic3Raw || "")
              upsertRound(round, { critic3: { pass: critic3Pass, reason: critic3Reason, advice: critic3Advice, raw: critic3Raw } })
            }
            if (evt?.type === "error") throw new Error(evt?.message || "critic3 error")
          },
        })
        stepMachine.stepEnd("critic3")

        if (critic1Pass && critic3Pass) {
          try { modifierController.abort() } catch {}
          stepMachine.stepSkip("modifier", "1号与3号均 PASS，跳过改写")
          stepMachine.stepSkip("polish", "1号与3号均 PASS，跳过改写")
          upsertRound(round, {
            modifier: { tunedDraft: roundDraft || "", skipped: true },
            polish: { draft: roundDraft || "" },
          })
          setDraftContent(roundDraft || "")
          setAutoWriteStatus(`润色第 ${round} 轮通过（1号&3号均 PASS）`)
          break
        }

        const mReader = modifierResp.body.getReader()
        let tunedDraft = roundDraft || ""
        let modifierSkipped = false
        await readNdjsonStream(mReader, {
          step: "modifier",
          controller: modifierController,
          onEvent: (evt) => {
            if (evt?.type === "delta" && typeof evt?.text === "string") {
              tunedDraft += evt.text
              upsertRound(round, { modifier: { tunedDraft, skipped: false } })
            }
            if (evt?.type === "result") {
              tunedDraft = String(evt?.data?.tunedDraft || tunedDraft || "")
              modifierSkipped = !!evt?.data?.skipped
              upsertRound(round, { modifier: { tunedDraft: tunedDraft || "", skipped: modifierSkipped } })
            }
            if (evt?.type === "error") throw new Error(evt?.message || "modifier error")
          },
        })
        stepMachine.stepEnd("modifier")

        stepMachine.stepStart("polish")
        const polishController = new AbortController()
        const polishResp = await fetch(
          `/api/aiNoval/chapters/genChapterStreaming/rewrite?worldviewId=${selectedChapter.worldview_id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: polishController.signal,
            body: JSON.stringify({
              draft: tunedDraft || "",
              rejectedDraft: tunedDraft || "",
              prev_content: prevContent || "",
              curr_context: prompt || "",
              context: aggregatedContextText || "",
              attention: attention || "",
              attension: attention || "",
              llm_type: polishLlmType,
              polish_llm_type: polishLlmType,
              mergedCriticReason: critic3Advice || critic1Reason || "",
              criticReason: critic3Advice || critic1Reason || "",
              ...antiStyleRequestFields,
            }),
          }
        )
        if (!polishResp.ok || !polishResp.body) {
          const msg = !polishResp.ok ? `polish http ${polishResp.status}` : "polish response body is empty"
          stepMachine.stepError("polish", msg)
          throw new Error(msg)
        }
        const pReader = polishResp.body.getReader()
        let polishedDraft = ""
        await readNdjsonStream(pReader, {
          step: "polish",
          controller: polishController,
          onEvent: (evt) => {
            if (evt?.type === "delta" && typeof evt?.text === "string") {
              polishedDraft += evt.text
              upsertRound(round, { polish: { draft: polishedDraft } })
            }
            if (evt?.type === "result" && evt?.data?.draft != null) {
              polishedDraft = String(evt?.data?.draft || "")
              upsertRound(round, { polish: { draft: polishedDraft } })
            }
            if (evt?.type === "error") throw new Error(evt?.message || "polish error")
          },
        })
        stepMachine.stepEnd("polish")
        roundDraft = polishedDraft || roundDraft || ""
        setDraftContent(roundDraft)
        setAutoWriteStatus(`润色第 ${round} 轮完成`)
      }

      stepMachine.stepStart("end")
      stepMachine.stepEnd("end")
    } catch (error: any) {
      console.error("repolish error -> ", error)
      message.error("重新润色失败，原因：" + (error?.message || error))
    } finally {
      setIsContinuing(false)
      setIsLoading(false)
      setKeepGoing(false)
    }
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
        actual_role_groups: roleGroupNames,
        actual_seed_prompt: seedPrompt,
        attension: attention,
        chapter_style: chapterStyle,
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

      case 'actual_role_groups':
        setRoleGroupNames(selectedChapter?.actual_role_groups || '')
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

      case 'chapter_style':
        setChapterStyle(selectedChapter?.chapter_style || selectedChapter?.overall_style || '')
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
  const handleCopyContinued = (targetText?: string) => {
    const sourceText = targetText ?? draftContent
    if (!sourceText) {
      message.error('续写内容为空')
      return;
    }

    let pureResult = sourceText.replace(/<think>[\s\S]*<\/think>/g, '');
    if (!pureResult) {
      message.error('续写内容为空')
      return;
    }

    try {
      copyToClip(pureResult || '')
      message.success('续写内容已复制到剪贴板')
    } catch (error) {
      console.error('handleCopyContinued error -> ', error)
      message.error('复制失败')
    }
  }

  const handleClearThinking = () => {
    if (!draftContent) {
      message.error('续写内容为空')
      return;
    }

    let pureResult = draftContent.replace(/<think>[\s\S]*<\/think>/g, '');
    console.info('handleClearThinking -> ', pureResult);
    setDraftContent(pureResult)
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

  /** 注意事项 AI 生成（复用 GenChapterByDetailModal 逻辑）：根据本章要点与设定生成，生成后直接覆盖 */
  const handleGenAttention = async () => {
    const worldviewId = selectedChapter?.worldview_id
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
        chapter_style: chapterStyle || '',
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

  return (
    <>
      <Modal
        title={modalTitle}
        open={isVisible}
        onCancel={onClose}
        width={'80vw'}
        footer={
          <div className={styles.footer}>
            <ModalFooter
              onStorePrompts={handleStoreActualPrompt}
              onCopy={handleCopyContinued}
              onClose={onClose}
            />
          </div>}
      >
        <div className={styles.continueContent}>
          <Row gutter={16}>
            <Col span={24}>
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
                      {chapter.chapter_number} {chapter.title || '未命名章节'} : {chapter.version}
                    </Select.Option>
                  ))}
                </Select>

                <Divider orientation="left">提示词</Divider>

                <div className={styles.prompt_title}>
                  <div>
                    <span>角色组提示词：</span>
                    { roleGroupNames === selectedChapter?.role_group_names ? <Tag color="blue">初始值</Tag> : null }
                    { roleGroupNames === selectedChapter?.actual_role_groups ?  <Tag color="green">存储值</Tag> : null }
                    { (roleGroupNames !== selectedChapter?.role_group_names && roleGroupNames !== selectedChapter?.actual_role_groups) ?  <Tag color="red">已修改</Tag> : null }
                  </div>
                  <div>
                    {/* <Button size="small" disabled={isLoading} onClick={() => handleOptimizePrompt('roles')}>AI优化</Button> */}
                    <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('role_group_names')}>复原初始值</Button>
                    <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('actual_role_groups')}>复原存储值</Button>
                  </div>
                </div>

                <div>
                  <TextArea autoSize={{ minRows: 1 }} disabled={isLoading} value={roleGroupNames} onChange={(e) => setRoleGroupNames(e.target.value)} />
                </div>

                <div className={styles.prompt_title}>
                  <div>
                    <span>角色提示词：</span>
                    { roleNames === selectedChapter?.role_names ? <Tag color="blue">初始值</Tag> : null }
                    { roleNames === selectedChapter?.actual_roles ?  <Tag color="green">存储值</Tag> : null }
                    { (roleNames !== selectedChapter?.role_names && roleNames !== selectedChapter?.actual_roles) ?  <Tag color="red">已修改</Tag> : null }
                  </div>
                  <div>
                    {/* <Button size="small" disabled={isLoading} onClick={() => handleOptimizePrompt('roles')}>AI优化</Button> */}
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
                    {/* <Button size="small" disabled={isLoading} onClick={() => handleOptimizePrompt('factions')}>AI优化</Button> */}
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
                    {/* <Button size="small" disabled={isLoading} onClick={() => handleOptimizePrompt('locations')}>AI优化</Button> */}
                    <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('geo_names')}>复原初始值</Button>
                    <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('actual_locations')}>复原存储值</Button>
                  </div>
                </div>
                <div>
                  <TextArea autoSize={{ minRows: 1 }} disabled={isLoading} value={geoNames} onChange={(e) => setGeoNames(e.target.value)} />
                </div>

                <div className={styles.prompt_title}>
                  <div>
                    <span>手写部分（不落库）：</span>
                    <Tag color="default">仅拼接在注意事项前传入续写</Tag>
                  </div>
                  <div>
                      <Button size="small" disabled={isLoading} onClick={handleShowAttentionRef}>参考值</Button>
                  </div>
                </div>
                <div>
                  <TextArea autoSize={{ minRows: 1 }} disabled={isLoading} value={manualSection} onChange={(e) => setManualSection(e.target.value)} placeholder="手动补充说明，与下方注意事项拼接后传入续写接口，不保存到数据库" />
                </div>

                <div className={styles.prompt_title}>
                  <div>
                    <span>注意事项：</span>
                    { attention === selectedChapter?.attension ? <Tag color="blue">存储值</Tag> : null }
                    { (attention !== selectedChapter?.attension) ?  <Tag color="red">已修改</Tag> : null }
                  </div>
                  <div>
                    <Button type="link" size="small" loading={isGeneratingAttention} disabled={isLoading} onClick={handleGenAttention}>AI 生成</Button>
                    
                    <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('attension')}>复原存储值</Button>
                  </div>
                </div>
                <div>
                  <TextArea autoSize={{ minRows: 1 }} disabled={isLoading} value={attention} onChange={(e) => setAttention(e.target.value)} placeholder="扩写注意事项，可点击「AI 生成」由 AI 根据本章要点与设定生成（生成后直接覆盖）" />
                </div>

                {/* <div className={styles.prompt_title}>
                  <div>
                    <span>章节总体风格（文风）：</span>
                    { chapterStyle === (selectedChapter?.chapter_style || selectedChapter?.overall_style || '') ? <Tag color="blue">存储值</Tag> : null }
                    { chapterStyle !== (selectedChapter?.chapter_style || selectedChapter?.overall_style || '') ? <Tag color="red">已修改</Tag> : null }
                  </div>
                  <div>
                    <Button type="link" size="small" icon={<RedoOutlined />} disabled={isLoading} onClick={() => handleResetPrompt('chapter_style')}>复原存储值</Button>
                  </div>
                </div> */}
                

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
                
                <Divider orientation="left">文风控制选项</Divider>
                <Space wrap size={[6, 6]} style={{ marginBottom: 8 }}>
                  {STYLE_QUICK_TAGS.map((tag) => (
                    <Tag
                      key={tag}
                      style={{ cursor: isLoading ? 'not-allowed' : 'pointer', marginRight: 0 }}
                      onClick={() => !isLoading && setChapterStyle(prev => prev.trim() ? `${prev.trim()}，${tag}` : tag)}
                    >
                      {tag}
                    </Tag>
                  ))}
                </Space>
                <div>
                  <TextArea autoSize={{ minRows: 2 }} disabled={isLoading} value={chapterStyle} onChange={(e) => setChapterStyle(e.target.value)} placeholder="叙述视角、文风、节奏等整体风格要求（可选），可点击上方标签快速填入" />
                </div>
                
                <Space wrap style={{ marginTop: 8 }}>
                  <Checkbox checked={antiLovecraftStyle} onChange={(e) => setAntiLovecraftStyle(e.target.checked)} disabled={isContinuing}>抗克苏鲁文风</Checkbox>
                  <Checkbox checked={antiSweetCeoStyle} onChange={(e) => setAntiSweetCeoStyle(e.target.checked)} disabled={isContinuing}>抗甜宠/霸总文风</Checkbox>
                  <Checkbox checked={antiFakeProtocolStyle} onChange={(e) => setAntiFakeProtocolStyle(e.target.checked)} disabled={isContinuing}>抗空泛协议/中二命名</Checkbox>
                  <Checkbox checked={antiEncryptedChannelStyle} onChange={(e) => setAntiEncryptedChannelStyle(e.target.checked)} disabled={isContinuing}>抗加密表述</Checkbox>
                  <Checkbox checked={antiWastelandStyle} onChange={(e) => setAntiWastelandStyle(e.target.checked)} disabled={isContinuing}>反废土文风</Checkbox>
                  <Checkbox checked={antiEnumReactionsStyle} onChange={(e) => setAntiEnumReactionsStyle(e.target.checked)} disabled={isContinuing}>反逐人枚举</Checkbox>
                  <Checkbox checked={antiClichePhraseStyle} onChange={(e) => setAntiClichePhraseStyle(e.target.checked)} disabled={isContinuing}>抗套路样板词</Checkbox>
                  <Checkbox checked={antiDoubleNegativeStyle} onChange={(e) => setAntiDoubleNegativeStyle(e.target.checked)} disabled={isContinuing}>抗双重否定句</Checkbox>
                  <Checkbox checked={antiPlotExplanation} onChange={(e) => setAntiPlotExplanation(e.target.checked)} disabled={isContinuing}>抗剧透及解释</Checkbox>
                  <Checkbox checked={antiSpeechMilitarySummaryStyle} onChange={(e) => setAntiSpeechMilitarySummaryStyle(e.target.checked)} disabled={isContinuing}>抗演讲/军事腔调</Checkbox>
                </Space>

                <div className="text-right mt-2">
                  <Button type="primary" onClick={handleStoreActualPrompt}>存储提示词集</Button>
                </div>



                <Divider orientation="left">续写选项</Divider>
                <div className="flex flex-col">
                <Space wrap>
                  <Typography.Text>初稿模型：</Typography.Text>
                  <Select value={draftLlmType} onChange={(value) => setDraftLlmType(value)} disabled={isContinuing}>
                    {/* <Select.Option value="gemini">Gemini2.5</Select.Option> */}
                    <Select.Option value="gemini3">Gemini3</Select.Option>
                    <Select.Option value="deepseek">DeepSeek（reasoner）</Select.Option>
                    <Select.Option value="deepseek-chat">DeepSeek-Chat</Select.Option>
                    {/* <Select.Option value="deepseek-chat">DeepSeek-Chat（实验）</Select.Option> */}
                    <Select.Option value="gpt" disabled>GPT-4o（实验）</Select.Option>
                  </Select>

                  <Typography.Text>润色模型：</Typography.Text>
                  <Select value={polishLlmType} onChange={(value) => setPolishLlmType(value)} disabled={isContinuing}>
                    {/* <Select.Option value="gemini">Gemini2.5</Select.Option> */}
                    <Select.Option value="gemini3">Gemini3</Select.Option>
                    <Select.Option value="deepseek">DeepSeek（reasoner）</Select.Option>
                    <Select.Option value="deepseek-chat">DeepSeek-Chat</Select.Option>
                    {/* <Select.Option value="deepseek-chat">DeepSeek-Chat（实验）</Select.Option> */}
                    <Select.Option value="gpt" disabled>GPT-4o（实验）</Select.Option>
                  </Select>

                  <Typography.Text>审稿模型：</Typography.Text>
                  <Select value={criticLlmType} onChange={(value) => setCriticLlmType(value)} disabled={isContinuing}>
                    <Select.Option value="gemini3">Gemini3</Select.Option>
                    <Select.Option value="deepseek">DeepSeek（reasoner）</Select.Option>
                    <Select.Option value="deepseek-chat">DeepSeek-Chat</Select.Option>
                    <Select.Option value="gpt" disabled>GPT-4o（实验）</Select.Option>
                  </Select>

                  <Typography.Text>审稿员审核次数：</Typography.Text>
                  <InputNumber
                    min={1}
                    max={10}
                    value={criticMaxRounds}
                    onChange={(v) => setCriticMaxRounds(v ?? 5)}
                    disabled={isContinuing}
                  />

                  {/* 
                  <Checkbox checked={isReferSelf} onChange={(e) => setIsReferSelf(e.target.checked)} disabled={isContinuing}>参考本章已有内容</Checkbox>
                  <Checkbox checked={isStripSelf} onChange={(e) => setIsStripSelf(e.target.checked)} disabled={isContinuing}>缩写本章</Checkbox>
                  */}

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
                      开始续写
                    </Button>
                  )}
                  <Button onClick={() => stepMachine.reset()}>
                    重置步骤
                  </Button>
                </Space>

                </div>
                
                <Divider orientation='left'>
                  {isContinuing ? '续写中...' : '点击上方按钮开始续写...'}
                </Divider>

                <div className="mt-2 mb-6">
                  <GenChapterStepBar steps={stepMachine.state.steps} />
                </div>

                <StripReportCard
                  stripReportList={stripReportList}
                  emptyContentChapterIds={emptyContentChapterIds}
                  onViewOriginal={handleViewOriginal}
                  onViewStripped={handleViewStripped}
                />

                <Collapse
                  size="small"
                  style={{ marginTop: 12 }}
                  items={[
                    {
                      key: "aggregatedContext",
                      label: <Typography.Text type="secondary">聚合设定（可折叠展示）</Typography.Text>,
                      children: (
                        <div style={{ maxHeight: 600, overflow: "auto" }}>
                          {isAggregatingContext ? (
                            <Space>
                              <Spin size="small" />
                              <Typography.Text type="secondary">正在聚合设定…</Typography.Text>
                            </Space>
                          ) : aggregatedContextError ? (
                            <Typography.Text type="danger">{aggregatedContextError}</Typography.Text>
                          ) : aggregatedContextText ? (
                            <Typography.Paragraph style={{ whiteSpace: "pre-wrap" }}>
                              {aggregatedContextText}
                            </Typography.Paragraph>
                          ) : (
                            <div style={{ minHeight: 24 }}>
                              暂无聚合设定内容（请先开始续写）
                            </div>
                          )}
                        </div>
                      ),
                    },
                  ]}
                />

                <AutoWriteResultCard
                  autoWriteStatus={autoWriteStatus}
                  autoWriteElapsed={autoWriteElapsed}
                  deepseekBalance={deepseekBalance}
                  autoWriteError={autoWriteError}
                  draftContent={draftContent}
                  initialDraftContent={initialDraftContent}
                  polishRounds={polishRounds}
                  disabledCopy={isLoading || isContinuing || !draftContent}
                  disabledRewrite={isLoading || isContinuing}
                  disabledRePolish={isLoading || isContinuing || !(initialDraftContent || draftContent).trim()}
                  onCopy={handleCopyContinued}
                  onRewrite={handleReContinue}
                  onRePolish={handleRePolish}
                />
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
        onApply={(str) => {
          setAttention(str)
        }}
      />
    </>
  )
}
export default ChapterContinueModal 