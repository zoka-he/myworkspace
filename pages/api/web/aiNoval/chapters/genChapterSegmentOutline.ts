import { NextApiRequest, NextApiResponse } from "next";
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { BaseLanguageModel } from "@langchain/core/language_models/base";

const LOG_TAG = "[genChapterSegmentOutline]";

export interface GenChapterSegmentOutlineInput {
  /** 本章待写要点（种子提示） */
  curr_context: string;
  /** 前情提要（可摘要或截断），可选 */
  prev_content?: string;
  /** MCP 收集的设定摘要，可选 */
  mcp_context?: string;
  /** 角色名称，逗号分隔，可选 */
  role_names?: string;
  /** 阵营名称，逗号分隔，可选 */
  faction_names?: string;
  /** 地理/地点名称，逗号分隔，可选 */
  geo_names?: string;
  /** 扩写注意事项，可选 */
  attention?: string;
  /** 章节总体风格，可选 */
  chapter_style?: string;
  /** 最大段数，默认 20 */
  max_segments?: number;
  /** 每段目标字数，默认 600 */
  segment_target_chars?: number;
  /** 模型：deepseek-reasoner（默认）| deepseek-chat | gemini3 */
  model?: string;
  /** 编剧模式：不设段数/字数上限，由模型根据情节自行设计分段 */
  screenwriter_mode?: boolean;
}

export interface SegmentOutlineItem {
  index: number;
  outline: string;
}

const SYSTEM_PROMPT = `你是章节分段提纲助手。根据用户提供的「前情提要」和「本章待写要点」，生成本章的**分段提纲**：为每一段写清本段要点，供后续按段扩写时使用。

**核心原则：只做切分，不删减任何信息（极其重要）：**
- **任务本质**：你的任务**仅仅是切分**，将「本章待写要点」按照语义边界切分成多个段落，**不得删减、简化、概括或遗漏任何信息**。
- **分段依据**：基于**语义完整性**进行分段，即每一段应是一个相对完整的情节单元、场景转换、情绪转折或对话段落。**不要**为了凑字数或段落数而强行拆分或合并。
- **严禁删减**：本章待写要点可能是包含丰富细节的「总段提示词」。生成提纲时**绝对不得删减、简化、概括或遗漏任何信息**，必须将原文中的所有信息完整分配到对应段落。
- **信息完整保留**：原文中的具体事件、对话（含口语部分）、伏笔、人物反应、人物语癖、情绪变化、场景细节、动作描写、心理活动等**所有信息**，含括号内容、表情包等补充说明在内，都必须原样保留在**对应段落**的 outline 中，**严禁遗漏或删减**。
- **信息密度**： 确保每段 outline 涉及的所有情节与细节都不丢失。**宁可 outline 很长、信息完整，绝不为求简短而删掉任何内容**。
- **语义边界**：分段时优先考虑情节的自然断点、场景切换、视角转换、时间跳跃等语义边界，而不是机械地按字数或段落数平均分配。
- **切分而非改写**：你的工作是切分，不是改写。原文怎么说，outline 就怎么保留，不要用自己的话重新表述或概括。

**重要约束（避免每段开头重复交代世界观）：**
- 若前情/本章要点中已包含世界观或背景，**仅在第 1 段**可写「承接前情」「点明场景」类要点。
- **第 2 段及以后**的要点必须是**具体情节、动作、对话、冲突、转折**等，不得再写「交代世界观」「介绍时代背景」「说明故事前提」等重复性描述。

**输出格式（必须严格遵守）：**
只输出一个 JSON 数组，不要任何前后缀或解释。每项包含 index（从 1 开始）和 outline（本段要点，可一句话或分号分隔的多条，原样保留细节）。
示例（注意是 JSON 数组）：
[ {{"index":1,"outline":"第一段内容……"}}, {{"index":2,"outline":"第二段内容……"}} ]

请根据下文生成分段提纲，直接输出 JSON 数组：`;

function buildUserPrompt(body: GenChapterSegmentOutlineInput): string {
  const screenwriterMode = !!body.screenwriter_mode;
  const maxSeg = body.max_segments ?? 20;
  const targetChars = body.segment_target_chars ?? 600;
  const parts: string[] = [
    `【本章待写要点】`,
    (body.curr_context || "").trim() || "（未提供）",
    "",
    `【前情提要】`,
    (body.prev_content || "").trim() || "（无）",
    "",
  ];
  if ((body.mcp_context || "").trim()) {
    parts.push("【相关设定（MCP 收集）】", body.mcp_context.trim(), "");
  }
  if ((body.role_names || "").trim() || (body.faction_names || "").trim() || (body.geo_names || "").trim()) {
    parts.push(
      "【涉及实体】",
      `角色：${(body.role_names || "").trim() || "（无）"}`,
      `阵营：${(body.faction_names || "").trim() || "（无）"}`,
      `地理：${(body.geo_names || "").trim() || "（无）"}`,
      ""
    );
  }
  if ((body.attention || "").trim()) {
    parts.push("【扩写注意事项】", body.attention.trim(), "");
  }
  if ((body.chapter_style || "").trim()) {
    parts.push("【总体风格】", body.chapter_style.trim(), "");
  }
  if (screenwriterMode) {
    parts.push(
      `【要求】（编剧模式：由你自行决定分段数量与切分方式，但仍是切分、不删减）`,
      `- **编剧模式**：不设段数上限与每段字数限制。请你像编剧一样，根据情节的自然断点、场景转换、节奏与戏剧张力**自行决定分成多少段**，以及**如何将本章待写要点的内容分配到各段**。段落数量可参考：约 ${maxSeg} 段左右（可根据情节需要增减）。注意：你只是在决定「怎么切」，不是在改写或设计新内容——原文所有信息仍须完整保留到对应段落的 outline 中。`,
      `- **每段 outline 须写清楚**：`,
      `  * **出场角色**：本段有哪些角色出场（可点名或概括）。`,
      `  * **在干什么**：本段主要动作、对话、事件或情节推进。`,
      `  * **氛围如何**：本段的情绪、气氛或基调（如紧张、轻松、悬疑、温馨等）。`,
      `- **只做切分，不删减任何信息**：`,
      `  * 任务本质是**切分**：把「本章待写要点」按你判断的语义/戏剧边界切成多段，**不得删减、简化、概括或遗漏任何信息**。`,
      `  * 原文中的事件、对话、伏笔、人物反应、场景细节等都必须完整出现在某一段的 outline 中；在写清「谁出场、在干什么、氛围」的同时，宁可 outline 长、信息完整，也不为简短而删内容。`,
      `  * 切分而非改写：原文怎么说，outline 就怎么保留，不要用自己的话重新表述或概括。`,
      `- 直接输出 JSON 数组，不要 markdown 代码块包裹。`
    );
  } else {
    parts.push(
      `【要求】`,
      `- 分段数不超过 ${maxSeg} 段，每段约 ${targetChars} 字（仅供参考，优先遵循语义完整性）。`,
      `- **只做切分，不删减任何信息（极其重要）**：`,
      `  * 你的任务**仅仅是切分**，将「本章待写要点」按照语义边界切分成多个段落。`,
      `  * **不得删减、简化、概括或遗漏任何信息**，必须将原文中的所有信息完整分配到对应段落。`,
      `  * 原文中的所有事件、对话、伏笔、人物反应、情绪变化、场景细节、动作描写等，都必须完整保留在对应段落的 outline 中。`,
      `  * 宁可 outline 很长、信息完整，绝不为求简短而删掉任何内容。`,
      `  * 你的工作是切分，不是改写。原文怎么说，outline 就怎么保留，不要用自己的话重新表述或概括。`,
      `- **必须以语义分割为主**：根据情节的自然断点、场景转换、情绪转折等语义边界进行分段，不要为了凑字数或段落数而强行拆分或合并。`,
      `- 直接输出 JSON 数组，不要 markdown 代码块包裹。`
    );
  }
  return parts.join("\n");
}

function createModel(modelOption: string): BaseLanguageModel {
  const m = (modelOption || "deepseek-chat").toLowerCase();
  if (m === "deepseek-reasoner" || m === "deepseek") {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error("DEEPSEEK_API_KEY is not configured");
    return new ChatDeepSeek({ apiKey: key, model: "deepseek-reasoner", temperature: 0.5 });
  }
  if (m === "deepseek-chat") {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error("DEEPSEEK_API_KEY is not configured");
    return new ChatDeepSeek({ apiKey: key, model: "deepseek-chat", temperature: 0.5 });
  }
  if (m === "gemini3" || m.includes("gemini")) {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error("OPENROUTER_API_KEY is not configured");
    const modelName = m.includes("gemini3") ? "google/gemini-2.0-flash-exp:free" : "google/gemini-2.5-pro";
    return new ChatOpenAI({
      model: modelName,
      temperature: 0.5,
      configuration: { apiKey: key, baseURL: "https://openrouter.ai/api/v1" },
    });
  }
  throw new Error(`Unsupported model: ${modelOption}`);
}

/** 从 LLM 输出中解析 JSON 数组，支持去掉 markdown 代码块 */
function parseOutlines(raw: string): SegmentOutlineItem[] {
  let text = (raw || "").trim();
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) text = codeBlock[1].trim();
  try {
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((item: any) => item && typeof item.index === "number" && typeof item.outline === "string")
      .map((item: any) => ({ index: Number(item.index), outline: String(item.outline).trim() }))
      .filter((item) => item.outline.length > 0)
      .sort((a, b) => a.index - b.index);
  } catch {
    // 降级：按行解析 "第 N 段：xxx" 或 "N. xxx"
    const lines = text.split(/\n/).map((s) => s.trim()).filter(Boolean);
    const result: SegmentOutlineItem[] = [];
    for (const line of lines) {
      const m1 = line.match(/^第\s*(\d+)\s*段[：:]\s*(.+)$/);
      const m2 = line.match(/^(\d+)[.．]\s*(.+)$/);
      if (m1) result.push({ index: parseInt(m1[1], 10), outline: m1[2].trim() });
      else if (m2) result.push({ index: parseInt(m2[1], 10), outline: m2[2].trim() });
    }
    return result.sort((a, b) => a.index - b.index);
  }
}

/**
 * POST /api/web/aiNoval/chapters/genChapterSegmentOutline
 * 请求体：GenChapterSegmentOutlineInput（含 model，默认 deepseek-reasoner）
 * 返回：{ success, data: { outlines: SegmentOutlineItem[] } }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; data?: { outlines: SegmentOutlineItem[] }; error?: string }>
) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed, only POST is allowed" });
    return;
  }

  try {
    const body = req.body as GenChapterSegmentOutlineInput | undefined;
    if (!body || typeof body !== "object") {
      res.status(400).json({ success: false, error: "请求体无效" });
      return;
    }
    if (!(body.curr_context || "").trim()) {
      res.status(400).json({ success: false, error: "curr_context 必填" });
      return;
    }

    const modelOption = (body.model || "deepseek-chat").trim() || "deepseek-chat";
    console.log(LOG_TAG, "model:", modelOption);

    const model = createModel(modelOption);
    const userPrompt = buildUserPrompt(body);
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", SYSTEM_PROMPT],
      ["user", userPrompt],
    ]);
    const chain = RunnableSequence.from([prompt, model]);
    const response = await chain.invoke({});
    const raw = (response.content as string) || "";
    const outlines = parseOutlines(raw);

    if (outlines.length === 0) {
      console.warn(LOG_TAG, "解析提纲为空，raw 长度:", raw.length);
    }

    res.status(200).json({
      success: true,
      data: { outlines },
    });
  } catch (error: any) {
    console.error(LOG_TAG, error?.message || error);
    res.status(500).json({
      success: false,
      error: error?.message || "生成分段提纲失败",
    });
  }
}
