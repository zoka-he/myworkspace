import type { NextApiRequest, NextApiResponse } from "next";
import _ from "lodash";
import {
  buildPromptTemplate,
  buildRewriteUserInput,
  appendAntiStyleConfrontationBlocks,
  antiStyleFlagsFromRequestBody,
} from "../genChapter";
import { initNdjsonStream, writeError, writeNdjson, writePhaseEnd, writePhaseStart } from "@/src/utils/streaming/ndjson";
import { createStreamingChain, getChunkText } from "./streamingChain";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  initNdjsonStream(res);
  const step = "rewrite";

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
  const llm_type = body.polish_llm_type || body.llm_type || "deepseek-chat";
  const rejectedDraft = body.rejectedDraft || body.draft || "";
  const mergedCriticReason = body.mergedCriticReason || body.criticReason || "";

  try {
    writePhaseStart(res, step, { llm_type });
    const antiFlags = antiStyleFlagsFromRequestBody(body as Record<string, unknown>);
    const systemPrompt = appendAntiStyleConfrontationBlocks(buildPromptTemplate(attensionText), antiFlags);
    const rewriteUserInput = buildRewriteUserInput(prev_content, curr_context, mergedCriticReason, rejectedDraft);
    const systemPromptWithContext = systemPrompt.replace("{{context}}", context || "");
    const chain = createStreamingChain(llm_type, systemPromptWithContext, rewriteUserInput, {
      temperature: 1.2,
      frequencyPenalty: 0,
      presencePenalty: 1.8,
      topP: 1,
    });
    let draft = "";
    const stream = await chain.stream({});
    for await (const chunk of stream as any) {
      if (isClosed()) return;
      const text = getChunkText(chunk);
      if (!text) continue;
      draft += text;
      writeNdjson(res, { type: "delta", step, text });
    }
    if (isClosed()) return;
    writeNdjson(res, { type: "result", step, data: { draft: (draft || "").trim() } });
    writePhaseEnd(res, step);
    res.end();
  } catch (e: any) {
    if (isClosed()) return;
    writeError(res, step, e?.message || "rewrite failed");
    writePhaseEnd(res, step);
    res.end();
  }
}

