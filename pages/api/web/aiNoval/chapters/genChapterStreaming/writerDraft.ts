import type { NextApiRequest, NextApiResponse } from "next";
import _ from "lodash";
import { buildPromptTemplate, buildUserInput, callLLM } from "../genChapter";
import { initNdjsonStream, writeError, writeNdjson, writePhaseEnd, writePhaseStart } from "@/src/utils/streaming/ndjson";

function streamTextAsDeltas(res: NextApiResponse, step: string, fullText: string) {
  const chunkSize = 120;
  for (let i = 0; i < fullText.length; i += chunkSize) {
    const text = fullText.slice(i, i + chunkSize);
    writeNdjson(res, { type: "delta", step, text });
  }
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
    const systemPrompt = buildPromptTemplate(attensionText);
    const userInput = buildUserInput(prev_content, curr_context);
    const draft = await callLLM(llm_type, systemPrompt, userInput, context, { forWriting: true });
    if (isClosed()) return;
    streamTextAsDeltas(res, step, draft || "");
    writeNdjson(res, { type: "result", step, data: { draft: (draft || "").trim() } });
    writePhaseEnd(res, step);
    res.end();
  } catch (e: any) {
    if (isClosed()) return;
    writeError(res, step, e?.message || "writerDraft failed");
    writePhaseEnd(res, step);
    res.end();
  }
}

