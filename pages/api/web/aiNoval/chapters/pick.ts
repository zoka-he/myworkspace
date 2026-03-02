import { NextApiRequest, NextApiResponse } from "next";
import { ChatDeepSeek } from "@langchain/deepseek";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { createDeepSeekModel } from "@/src/utils/ai/modelFactory";

const LOG_TAG = "[pick]";

type PickTarget = "roles" | "factions" | "locations";

const TARGET_CONFIG: Record<
  PickTarget,
  { label: string; instruction: string; example: string }
> = {
  roles: {
    label: "角色/人物",
    instruction:
      "从文本中提取所有出现或明确提及的**角色名、人物名**（包括化名、绰号、称呼）。只输出世界观内可能存在的具体人名，不要输出职业、身份类泛称（如“士兵”“路人”）。",
    example: "张三\n李四\n王五",
  },
  factions: {
    label: "阵营/势力/组织",
    instruction:
      "从文本中提取所有出现或明确提及的**阵营名、势力名、组织名、团体名**（如国家、军队、公司、帮派、家族等）。只输出具体名称，不要输出抽象概念。",
    example: "北境军\n商会\n暗影会",
  },
  locations: {
    label: "地点/地理",
    instruction:
      "从文本中提取所有出现或明确提及的**地点名、地理名称**（如城市、建筑、区域、星球、街道等）。只输出具体地名，不要输出“某处”“这里”等泛称。",
    example: "长安城\n星港\n地下密室",
  },
};

function buildPrompt(target: PickTarget): PromptTemplate {
  const { label, instruction, example } = TARGET_CONFIG[target];
  return PromptTemplate.fromTemplate(`你是一个从小说/剧本文本中抽取实体名称的助手。

【任务】
根据下文「抽取说明」从「输入文本」中抽取所有**${label}**名称。

【抽取说明】
${instruction}

【输出格式】
- 每行一个名称，不要编号、不要逗号分隔多个人名在同一行
- 只输出名称本身，不要任何解释、不要“名称：”等前缀
- 名称重复只保留一次
- 若没有找到任何符合条件的${label}，请只输出一行：无

【示例】
${example}

---
【输入文本】
{src_text}
---
请直接输出抽取出的${label}名称列表（每行一个）：`);
}

/** 从 LLM 输出中剥离 think 标签内容，只保留正文 */
function stripThinkTags(text: string): string {
  try {
    return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  } catch {
    return text;
  }
}

/** 使用 LangChain + DeepSeek 从文本中抽取指定类型实体名称 */
async function pickFromTextWithLangChain(
  target: PickTarget,
  src_text: string
): Promise<string> {
  const model = createDeepSeekModel({
    model: "deepseek-chat",
    temperature: 0.2,
  });
  const prompt = buildPrompt(target);
  const chain = RunnableSequence.from([prompt, model]);
  const response = await chain.invoke({ src_text: src_text || "" });
  const raw = typeof response.content === "string" ? response.content : "";
  return stripThinkTags(raw);
}

interface PickResponse {
  outputs?: { output?: string };
  message?: string;
  data?: unknown;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PickResponse & { message?: string }>
) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Only POST is allowed" });
    return;
  }

  const target = String(req.query?.target ?? "").toLowerCase() as PickTarget;
  if (!["roles", "factions", "locations"].includes(target)) {
    res.status(400).json({
      message: "target is not valid, valid values: roles, factions, locations",
    });
    return;
  }

  const src_text =
    (req.body && typeof req.body === "object" && req.body.src_text) ?? "";
  if (!src_text || typeof src_text !== "string" || src_text.trim().length === 0) {
    res.status(400).json({ message: "there is no src_text in request body json" });
    return;
  }

  try {
    const output = await pickFromTextWithLangChain(target, src_text.trim());
    // 保持与旧版 Dify 返回结构一致，便于前端 response.data?.outputs?.output 无需改动
    res.status(200).json({
      outputs: { output: output || "" },
    });
  } catch (error: unknown) {
    console.error(LOG_TAG, error);
    const message =
      error instanceof Error ? error.message : "Request failed";
    res.status(500).json({ message });
  }
}
