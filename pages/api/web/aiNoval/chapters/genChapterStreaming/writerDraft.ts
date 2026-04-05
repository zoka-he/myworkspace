import type { NextApiRequest, NextApiResponse } from "next";
import _ from "lodash";
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import {
  buildPromptTemplate,
  buildUserInput,
  appendAntiStyleConfrontationBlocks,
  antiStyleFlagsFromRequestBody,
} from "../genChapter";
import { initNdjsonStream, writeError, writeNdjson, writePhaseEnd, writePhaseStart } from "@/src/utils/streaming/ndjson";

const WRITER_SAMPLING = {
  temperature: 1.2,
  frequencyPenalty: 0,
  presencePenalty: 1.8,
  topP: 1,
};

function getChunkText(chunk: any): string {
  const content = chunk?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item: any) => {
        if (typeof item === "string") return item;
        if (typeof item?.text === "string") return item.text;
        return "";
      })
      .join("");
  }
  return "";
}

function createWriterChain(llmType: string, systemPromptWithContext: string, userInput: string) {
  const effectiveType = llmType || "deepseek";

  if (effectiveType === "deepseek") {
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY is not configured");
    const model = new ChatDeepSeek({
      apiKey: DEEPSEEK_API_KEY,
      model: "deepseek-reasoner",
      temperature: WRITER_SAMPLING.temperature,
      frequencyPenalty: WRITER_SAMPLING.frequencyPenalty,
      presencePenalty: WRITER_SAMPLING.presencePenalty,
    });
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPromptWithContext],
      ["user", userInput],
    ]);
    return RunnableSequence.from([prompt, model]);
  }

  if (effectiveType === "deepseek-chat") {
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY is not configured");
    const model = new ChatDeepSeek({
      apiKey: DEEPSEEK_API_KEY,
      model: "deepseek-chat",
      temperature: WRITER_SAMPLING.temperature,
      frequencyPenalty: WRITER_SAMPLING.frequencyPenalty,
      presencePenalty: WRITER_SAMPLING.presencePenalty,
    });
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPromptWithContext],
      ["user", userInput],
    ]);
    return RunnableSequence.from([prompt, model]);
  }

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");
  const modelName = effectiveType === "gemini3" || effectiveType?.includes("gemini3")
    ? "google/gemini-2.0-flash-exp:free"
    : "google/gemini-2.5-pro";
  const model = new ChatOpenAI({
    model: modelName,
    temperature: WRITER_SAMPLING.temperature,
    frequencyPenalty: WRITER_SAMPLING.frequencyPenalty,
    presencePenalty: WRITER_SAMPLING.presencePenalty,
    topP: WRITER_SAMPLING.topP,
    configuration: {
      apiKey: OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    },
  });
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPromptWithContext],
    ["user", userInput],
  ]);
  return RunnableSequence.from([prompt, model]);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  initNdjsonStream(res);
  const step = "writerDraft";

  let closed = false;
  req.on("close", () => {
    closed = true;
  });
  const isClosed = () => closed || (res as any).writableEnded;

  const worldviewIdNum = _.toNumber(req.query.worldviewId ?? req.body?.worldview_id);
  if (!worldviewIdNum) {
    writeError(res, step, "worldviewId is required");
    res.end();
    return;
  }

  const body = req.body || {};
  const prev_content = body.prev_content || "";
  const curr_context = body.curr_context || "";
  const context = body.context || "";
  const attensionText = body.attension || body.attention || "";
  const llm_type = body.draft_llm_type || body.llm_type || "deepseek";

  try {
    writePhaseStart(res, step, { llm_type });
    const antiFlags = antiStyleFlagsFromRequestBody(body as Record<string, unknown>);
    const systemPrompt = appendAntiStyleConfrontationBlocks(buildPromptTemplate(attensionText), antiFlags);
    const userInput = buildUserInput(prev_content, curr_context);
    const systemPromptWithContext = systemPrompt.replace("{{context}}", context || "");
    const chain = createWriterChain(llm_type, systemPromptWithContext, userInput);

    let fullText = "";
    const stream = await chain.stream({});
    for await (const chunk of stream as any) {
      if (isClosed()) return;
      const text = getChunkText(chunk);
      if (!text) continue;
      fullText += text;
      writeNdjson(res, { type: "delta", step, text });
    }
    if (isClosed()) return;
    writeNdjson(res, { type: "result", step, data: { draft: fullText.trim() } });
    writePhaseEnd(res, step);
    res.end();
  } catch (e: any) {
    if (isClosed()) return;
    writeError(res, step, e?.message || "writerDraft failed");
    writePhaseEnd(res, step);
    res.end();
  }
}

