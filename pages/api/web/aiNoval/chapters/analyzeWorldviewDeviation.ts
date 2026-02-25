import { NextApiRequest, NextApiResponse } from 'next'
import _ from 'lodash'
import ChaptersService from '@/src/services/aiNoval/chaptersService'
import { mcpToolRegistry } from '@/src/mcp/core/mcpToolRegistry'
import { createDeepSeekModel } from '@/src/utils/ai/modelFactory'
import { executeReAct } from '@/src/utils/ai/reactAgent'

interface Data {
  success?: boolean
  message?: string
  effects?: string
}

const LOG_TAG = '[chapterAnalyzeWorldviewDeviation]'
const chaptersService = new ChaptersService()

function stripFinalAnswerPrefix(raw: string): string {
  if (!raw || typeof raw !== 'string') return ''
  const t = raw.trim()
  const m = t.match(/^Final\s+Answer\s*[：:]\s*/i)
  return m ? t.slice(m[0].length).trim() : t
}

async function handleAnalyze(req: NextApiRequest, res: NextApiResponse<Data>) {
  const chapterId = _.toNumber((req.body as any)?.chapterId ?? req.query.chapterId)
  if (!chapterId || !Number.isFinite(chapterId)) {
    res.status(400).json({ success: false, message: 'chapterId is required and must be a number' })
    return
  }

  const chapter: any = await chaptersService.queryOne({ id: chapterId })
  if (!chapter) {
    res.status(404).json({ success: false, message: 'chapter not found' })
    return
  }

  if (!chapter.content) {
    res.status(400).json({ success: false, message: 'chapter content is empty' })
    return
  }

  const worldviewId = chapter.worldview_id
  if (!worldviewId) {
    res.status(400).json({ success: false, message: 'chapter worldview_id is required for analysis' })
    return
  }

  try {
    // 初始化模型（低温度，偏分析）
    const modelConfig = {
      model: 'deepseek-chat' as const,
      temperature: 0.3,
    }

    let model
    try {
      model = createDeepSeekModel(modelConfig)
    } catch (e: any) {
      console.error(LOG_TAG, 'DeepSeek 模型初始化失败', e?.message)
      res.status(503).json({
        success: false,
        message: '分析服务未配置（需配置 DEEPSEEK_API_KEY）',
      })
      return
    }

    // 准备 MCP 工具和执行器，统一注入 worldview_id
    const tools = mcpToolRegistry.getAllToolDefinitions()
    const toolExecutor = async (name: string, args: Record<string, any> | string) => {
      let obj: Record<string, any> = {}
      if (typeof args === 'object' && args !== null && !Array.isArray(args)) {
        obj = args
      } else if (typeof args === 'string') {
        try {
          const parsed = JSON.parse(args)
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            obj = parsed
          }
        } catch {
          // ignore parse error, fallback to empty args
        }
      }
      const finalArgs = { ...obj, worldview_id: worldviewId }
      return await mcpToolRegistry.executeTool(name, finalArgs)
    }

    // 系统提示词：说明任务 & 输出格式；工具说明和 ReAct 格式由 executeReAct 自动注入
    const systemPrompt = `你是一名严谨的世界观一致性审校编辑，负责评估小说章节与既有世界观设定之间的一致性，并说明该章节对世界观与整体剧情的影响。

你可以通过 MCP 工具查询世界观基础资料、世界态、阵营结构、地理与角色等信息，然后再给出最终分析。

最终的 Final Answer 必须使用 Markdown，自然语言输出，不要 JSON，不要代码块，至少包含以下三个二级标题：

## 偏离程度与评分
（给出 0-100 的一致性评分，并用 1-2 句话解释理由。0-30 为严重不一致，31-60 为部分不一致，61-80 为基本一致，81-100 为高度一致。）

## 主要偏离点
（列出本章节相对于世界观设定的主要偏离点或潜在冲突，逐条说明原因。）

## 对世界观与剧情的影响
（分析本章节可能对世界观、时间线、势力格局或角色弧光带来的影响，包括正面与负面。）`

    // 用户查询：包含 worldview_id 与章节正文摘要
    const chapterPreview =
      (chapter.content as string).length > 4000
        ? (chapter.content as string).slice(0, 4000) + '\n\n（内容已截断，仅供分析摘要使用）'
        : (chapter.content as string)

    const userQuery = [
      '请基于以下信息，使用 MCP 工具完成世界观一致性分析：',
      `- 世界观 ID：${worldviewId}`,
      chapter.title ? `- 章节标题：${chapter.title}` : '',
      `- 章节编号：第 ${chapter.chapter_number ?? ''} 章，版本 v${chapter.version ?? ''}`,
      '',
      '【章节正文（可能已截断）】',
      chapterPreview,
    ]
      .filter(Boolean)
      .join('\n')

    console.log(LOG_TAG, '开始 ReAct 分析，chapterId:', chapterId, 'worldviewId:', worldviewId)

    const llmOutput = await executeReAct(model, tools, toolExecutor, systemPrompt, userQuery, {
      maxIterations: 16,
      finalAnswerKeywords: ['## 偏离程度与评分', '## 对世界观与剧情的影响'],
      logTag: LOG_TAG,
      verbose: false,
    })

    const finalText = stripFinalAnswerPrefix(llmOutput || '').trim()
    if (!finalText) {
      console.error(LOG_TAG, 'ReAct 分析未返回有效内容，原始输出片段:', (llmOutput || '').slice(0, 500))
      res.status(500).json({ success: false, message: '分析未返回有效内容，请查看服务端日志' })
      return
    }

    await chaptersService.updateOne({ id: chapterId }, { effects: finalText })

    res.status(200).json({
      success: true,
      effects: finalText,
    })
  } catch (error) {
    console.error(LOG_TAG, 'analyzeWorldviewDeviation error:', error)
    res.status(500).json({ success: false, message: (error as Error).message })
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method not allowed, only POST is allowed' })
    return
  }

  handleAnalyze(req, res)
}

