import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

export function getChunkText(chunk: any): string {
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

export function createStreamingChain(
  llmType: string,
  systemPrompt: string,
  userInput: string,
  opts?: {
    temperature?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    topP?: number;
  }
) {
  const effectiveType = llmType || "deepseek-chat";
  const temperature = opts?.temperature ?? 0.7;
  const frequencyPenalty = opts?.frequencyPenalty ?? 0;
  const presencePenalty = opts?.presencePenalty ?? 0;
  const topP = opts?.topP ?? 1;

  if (effectiveType === "deepseek" || effectiveType === "deepseek-chat") {
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY is not configured");
    const model = new ChatDeepSeek({
      apiKey: DEEPSEEK_API_KEY,
      model: effectiveType === "deepseek" ? "deepseek-reasoner" : "deepseek-chat",
      temperature,
      frequencyPenalty,
      presencePenalty,
    });
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      ["user", userInput],
    ]);
    return RunnableSequence.from([prompt, model]);
  }

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");
  const modelName =
    effectiveType === "gemini3" || effectiveType?.includes("gemini3")
      ? "google/gemini-2.0-flash-exp:free"
      : "google/gemini-2.5-pro";
  const model = new ChatOpenAI({
    model: modelName,
    temperature,
    frequencyPenalty,
    presencePenalty,
    topP,
    configuration: {
      apiKey: OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    },
  });
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["user", userInput],
  ]);
  return RunnableSequence.from([prompt, model]);
}

