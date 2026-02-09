import { NextApiRequest, NextApiResponse } from "next";
import { getAggregatedContext, buildPromptTemplate } from "./genChapter";
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

const LOG_TAG = "[genChapterSegmentMultiTurn]";
const SNIPPET_MAX_CHARS = 800;

export interface GenChapterSegmentMultiTurnInput {
  worldview_id: number;
  curr_context: string;
  role_names?: string;
  faction_names?: string;
  geo_names?: string;
  attention?: string;
  attension?: string;
  llm_type?: string;
  segment_outline: string;
  segment_index: number;
  previous_content_snippet: string;
  segment_target_chars?: number;
  mcp_context?: string;
  conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  is_first_turn?: boolean; // 是否为第一轮（需要确认）
}

interface Data {
  data?: {
    outputs?: { output?: string };
    status?: string;
    error?: string;
    elapsed_time?: number;
    conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  };
}

function createModel(llmType: string): any {
  const effectiveType = (llmType || "deepseek-chat").toLowerCase();
  
  if (effectiveType === "deepseek" || effectiveType === "deepseek-reasoner") {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error("DEEPSEEK_API_KEY is not configured");
    return new ChatDeepSeek({ apiKey: key, model: "deepseek-reasoner", temperature: 0.9 });
  }
  
  if (effectiveType === "deepseek-chat") {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error("DEEPSEEK_API_KEY is not configured");
    return new ChatDeepSeek({ apiKey: key, model: "deepseek-chat", temperature: 0.9 });
  }
  
  // Gemini
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");
  const modelName = effectiveType === "gemini3" || effectiveType?.includes("gemini3")
    ? "google/gemini-2.0-flash-exp:free"
    : "google/gemini-2.5-pro";
  return new ChatOpenAI({
    model: modelName,
    temperature: 0.9,
    configuration: { apiKey: OPENROUTER_API_KEY, baseURL: "https://openrouter.ai/api/v1" },
  });
}

function buildSystemPrompt(attensionText: string, segmentIndex: number, targetChars: number): string {
  const basePrompt = buildPromptTemplate(attensionText);
  const segmentExtra = `
本段为第 ${segmentIndex} 段。严格接着上一段最后一句续写，保持人称、时态、风格一致。本段约 ${targetChars} 字。仅输出本段正文，不要重复前文。
不得在本段开头再次交代世界观、时代背景或故事前提；直接接着「已写内容末尾」的情境继续写。

**防止回读前半情节（极其重要）**：
- **绝对不要回顾前面段落**：前面已经写过的内容不要在本段中回顾、呼应、总结、提及或引用。
- **只关注当前段落**：严格按照「本段提纲要点」写作，这是唯一的目标。
- **只衔接末尾**：唯一需要衔接的是「已写内容末尾」的最后一句，不要回顾更早的内容。

**严禁简略对话（极其重要）**：
- 所有对话必须完整写出，使用直接引语（「」或""），不得使用间接引语（如「他说」「她问」）替代。
- 不得省略对话内容，不得用概括性描述代替具体对话。
- 对话应保持完整、自然、符合人物性格，不得为了节省字数而简略对话。`;
  
  return basePrompt + segmentExtra;
}

function buildUserInputForSegment(
  segmentOutline: string,
  previousSnippet: string,
  targetChars: number
): string {
  const parts: string[] = [];
  parts.push(`【本段提纲要点（必须严格遵循，这是当前段落的唯一写作目标）】\n${segmentOutline.trim()}`);
  parts.push(`【已写内容末尾（必须严格衔接，这是续写的起点）】\n${(previousSnippet || "").trim() || "（本段为第一段，无前文）"}`);
  parts.push(`请严格接着「已写内容末尾」续写本段，约 ${targetChars} 字；仅输出本段正文，不要重复前文。`);
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
  
  const body = req.body as GenChapterSegmentMultiTurnInput;
  const {
    curr_context = "",
    role_names = "",
    faction_names = "",
    geo_names = "",
    attention = "",
    attension = "",
    llm_type = "deepseek-chat",
    segment_outline = "",
    segment_index = 1,
    previous_content_snippet = "",
    segment_target_chars = 600,
    mcp_context = "",
    conversation_history = [],
    is_first_turn = false,
  } = body || {};

  const attensionText = attension || attention;
  const snippet = (previous_content_snippet || "").trim().slice(-SNIPPET_MAX_CHARS);
  const targetChars = segment_target_chars || 600;

  try {
    const context = (mcp_context && mcp_context.trim())
      ? mcp_context.trim()
      : await getAggregatedContext(worldviewId, role_names, faction_names, geo_names);
    
    const systemPrompt = buildSystemPrompt(attensionText, segment_index, targetChars);
    const systemPromptWithContext = systemPrompt.replace('{{context}}', context);
    
    const model = createModel(llm_type);
    
    // 构建对话历史
    const messages: BaseMessage[] = [];
    
    if (is_first_turn) {
      // 第一轮：发送 system prompt + 确认消息
      messages.push(new SystemMessage(systemPromptWithContext));
      messages.push(new HumanMessage("请确认你已理解上述要求，回复「确认」即可。"));
    } else {
      // 后续轮次：先添加 system prompt（如果历史中没有）
      if (conversation_history.length === 0) {
        messages.push(new SystemMessage(systemPromptWithContext));
      } else {
        // 从历史中恢复消息
        for (const msg of conversation_history) {
          if (msg.role === 'user') {
            messages.push(new HumanMessage(msg.content));
          } else if (msg.role === 'assistant') {
            messages.push(new AIMessage(msg.content));
          }
        }
        // 确保 system prompt 在最前面
        if (messages.length === 0 || !(messages[0] instanceof SystemMessage)) {
          messages.unshift(new SystemMessage(systemPromptWithContext));
        }
      }
      
      // 添加当前段落的 user 输入
      const userInput = buildUserInputForSegment(segment_outline, snippet, targetChars);
      messages.push(new HumanMessage(userInput));
    }
    
    console.debug(LOG_TAG, "segment_index", segment_index, "is_first_turn", is_first_turn, "messages_count", messages.length);
    
    const prompt = ChatPromptTemplate.fromMessages(messages);
    const chain = RunnableSequence.from([prompt, model]);
    const response = await chain.invoke({});
    const output = (response.content as string) || "";
    
    // 更新对话历史
    const updatedHistory = [...conversation_history];
    if (is_first_turn) {
      updatedHistory.push({ role: 'user', content: "请确认你已理解上述要求，回复「确认」即可。" });
      updatedHistory.push({ role: 'assistant', content: output });
    } else {
      updatedHistory.push({ role: 'user', content: buildUserInputForSegment(segment_outline, snippet, targetChars) });
      updatedHistory.push({ role: 'assistant', content: output });
    }
    
    const elapsedTime = Date.now() - startTime;
    res.status(200).json({
      data: {
        outputs: { output },
        status: "success",
        error: "",
        elapsed_time: elapsedTime,
        conversation_history: updatedHistory,
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
        conversation_history: conversation_history,
      },
    });
  }
}
