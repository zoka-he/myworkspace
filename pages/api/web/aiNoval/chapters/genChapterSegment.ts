import { NextApiRequest, NextApiResponse } from "next";
import { getAggregatedContext, buildPromptTemplate, callLLM } from "./genChapter";

const LOG_TAG = "[genChapterSegment]";
const SNIPPET_MAX_CHARS = 800;
const PREV_CONTENT_MAX_CHARS = 2500;

export interface GenChapterSegmentInput {
  worldview_id: number;
  curr_context: string;
  prev_content?: string;
  role_names?: string;
  faction_names?: string;
  geo_names?: string;
  attention?: string;
  attension?: string;
  llm_type?: string;
  segment_index: number;
  previous_content_snippet: string;
  current_segment_outline?: string;
  segment_target_chars?: number;
  mcp_context?: string;
}

interface Data {
  data?: {
    outputs?: { output?: string };
    status?: string;
    error?: string;
    elapsed_time?: number;
  };
}

function buildSegmentUserInput(
  prevContent: string,
  currContext: string,
  previousSnippet: string,
  segmentOutline: string,
  targetChars: number,
  segmentIndex: number
): string {
  const prevTrim = (prevContent || "").trim().slice(-PREV_CONTENT_MAX_CHARS);
  const parts: string[] = [];
  
  // 前情提要：仅第一段提供，作为背景参考
  if (prevTrim && segmentIndex === 1) {
    parts.push(`【前情提要（仅作背景参考，不要在本段中回顾）】\n${prevTrim}`);
  }
  
  // 本章待写要点：仅第一段提供，后续段落不提供以避免回溯
  // 第2段及以后完全不提供"本章待写要点"，只关注"本段提纲要点"
  if (currContext && currContext.trim() && segmentIndex === 1) {
    parts.push(`【本章待写要点（总体指引，仅供参考；当前段落只需关注「本段提纲要点」）】\n${currContext.trim()}`);
  }
  
  // 本段提纲要点：所有段落都必须提供
  if (segmentOutline) {
    parts.push(`【本段提纲要点（必须严格遵循，这是当前段落的唯一写作目标）】\n${segmentOutline.trim()}`);
  }
  
  parts.push(`【已写内容末尾（必须严格衔接，这是续写的起点）】\n${(previousSnippet || "").trim() || "（本段为第一段，无前文）"}`);
  
  parts.push(`**续写要求**：`);
  parts.push(`1. 严格接着「已写内容末尾」续写本段，约 ${targetChars} 字；仅输出本段正文，不要重复前文，不要硬写前情提要。`);
  parts.push(`2. 不要在本段开头再次交代世界观、时代背景或故事前提及前情提要；直接接着「已写内容末尾」的情境继续写。`);
  
  // 对于第2段及以后的段落，更强烈地强调不要回顾
  if (segmentIndex >= 2) {
    parts.push(`3. **严禁回顾前面段落（极其重要）**：`);
    parts.push(`   - 本段是第 ${segmentIndex} 段，前面已经写过的内容不要在本段中回顾、呼应、总结或提及。`);
    parts.push(`   - 只关注「本段提纲要点」，严格按照本段提纲写作，不要回顾本章前半部分的情节。`);
    parts.push(`   - 唯一需要衔接的是「已写内容末尾」的最后一句，不要回顾更早的内容。`);
    parts.push(`   - 即使你知道前面段落发生了什么，也不要在本段中提及或呼应。`);
  } else {
    parts.push(`3. **严禁回顾或呼应前面的段落**：只关注当前段落（「本段提纲要点」），不要回顾本章前半部分的情节，不要呼应前面段落的内容。`);
  }
  
  parts.push(`4. **严禁简略对话**：所有对话必须完整写出，使用直接引语，不得用间接引语或概括性描述替代。`);
  
  return parts.join("\n\n");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST") {
    res.status(405).json({});
    return;
  }
  const startTime = Date.now();
  const worldviewId = req.query.worldviewId ? Number(req.query.worldviewId) : req.body?.worldview_id;
  if (!worldviewId || worldviewId < 1) {
    res.status(400).json({ data: { status: "error", error: "worldview_id 必填且为正整数" } });
    return;
  }
  const body = req.body as GenChapterSegmentInput;
  const {
    curr_context = "",
    prev_content = "",
    role_names = "",
    faction_names = "",
    geo_names = "",
    attention = "",
    attension = "",
    llm_type = "deepseek",
    segment_index = 1,
    previous_content_snippet = "",
    current_segment_outline = "",
    segment_target_chars = 600,
    mcp_context = "",
  } = body || {};

  const attensionText = attension || attention;
  const snippet = (previous_content_snippet || "").trim().slice(-SNIPPET_MAX_CHARS);
  const targetChars = segment_target_chars || 600;

  try {
    const context = (mcp_context && mcp_context.trim())
      ? mcp_context.trim()
      : await getAggregatedContext(worldviewId, role_names, faction_names, geo_names);
    const basePrompt = buildPromptTemplate(attensionText);
    
    // 对于第2段及以后的段落，更强烈地强调不要回顾
    let segmentExtra = `
本段为第 ${segment_index} 段。严格接着上一段最后一句续写，保持人称、时态、风格一致。本段约 ${targetChars} 字。仅输出本段正文，不要重复前文。
不得在本段开头再次交代世界观、时代背景或故事前提；直接接着「已写内容末尾」的情境继续写。`;

    if (segment_index >= 2) {
      segmentExtra += `

**防止回读前半情节（极其重要，第 ${segment_index} 段）**：
- **绝对不要回顾前面段落**：前面已经写过的内容（第1段到第${segment_index - 1}段）不要在本段中回顾、呼应、总结、提及或引用。
- **只关注当前段落**：严格按照「本段提纲要点」写作，这是唯一的目标，不要考虑前面段落发生了什么。
- **只衔接末尾**：唯一需要衔接的是「已写内容末尾」的最后一句，不要回顾更早的内容。
- **忽略整体要点**：即使你知道本章的整体要点，也不要在本段中回顾或呼应前面的段落。`;
    } else {
      segmentExtra += `

**重要约束（防止回读前半情节）**：
- **只关注当前段落**：严格按照「本段提纲要点」写作，不要回顾或呼应本章前半部分的情节。
- **不要回顾前文**：即使「本章待写要点」中提到了前面的内容，也不要在本段中回顾、呼应或总结前面的段落。
- **只衔接末尾**：唯一需要衔接的是「已写内容末尾」，这是续写的起点，不要回顾更早的内容。`;
    }

    segmentExtra += `

**严禁简略对话（极其重要）**：
- 所有对话必须完整写出，使用直接引语（「」或""），不得使用间接引语（如「他说」「她问」）替代。
- 不得省略对话内容，不得用概括性描述代替具体对话（如「他们讨论了计划」应改为完整的对话内容）。
- 对话应保持完整、自然、符合人物性格，不得为了节省字数而简略对话。
- 如果本段提纲中包含对话要求，必须完整展开对话，不得简略或跳过。`;
    
    const systemPrompt = basePrompt + segmentExtra;
    const userInput = buildSegmentUserInput(
      prev_content,
      curr_context,
      snippet,
      current_segment_outline,
      targetChars,
      segment_index
    );
    console.debug(LOG_TAG, "segment_index", segment_index, "snippetLen", snippet.length);
    const output = await callLLM(llm_type || "deepseek", systemPrompt, userInput, context);
    const elapsedTime = Date.now() - startTime;
    res.status(200).json({
      data: {
        outputs: { output: output || "" },
        status: "success",
        error: "",
        elapsed_time: elapsedTime,
      },
    });
  } catch (error: any) {
    const elapsedTime = Date.now() - startTime;
    console.error(LOG_TAG, error?.message || error);
    res.status(200).json({
      data: {
        outputs: { output: "" },
        status: "error",
        error: error?.message || "单段续写失败",
        elapsed_time: elapsedTime,
      },
    });
  }
}
