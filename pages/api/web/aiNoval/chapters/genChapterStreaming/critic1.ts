import type { NextApiRequest, NextApiResponse } from "next";
import _ from "lodash";
import { CRITIC_SYSTEM_PROMPT, buildCriticUserInput, parseCriticResponse } from "../genChapter";
import { initNdjsonStream, writeError, writeNdjson, writePhaseEnd, writePhaseStart } from "@/src/utils/streaming/ndjson";
import { createStreamingChain, getChunkText } from "./streamingChain";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  initNdjsonStream(res);
  const step = "critic1";

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
  const draft = body.draft || "";
  const prev_content = body.prev_content || "";
  const curr_context = body.curr_context || "";
  const context = body.context || "";
  const llm_type = body.polish_llm_type || body.llm_type || "deepseek-chat";

  try {
    writePhaseStart(res, step, { llm_type });
    const criticInput = buildCriticUserInput(draft, prev_content, curr_context);
    const systemPromptWithContext = CRITIC_SYSTEM_PROMPT.replace("{{context}}", context || "");
    const chain = createStreamingChain(llm_type, systemPromptWithContext, criticInput, {
      temperature: 0.4,
      frequencyPenalty: 0,
      presencePenalty: 0,
      topP: 1,
    });
    let resp = "";
    const stream = await chain.stream({});
    for await (const chunk of stream as any) {
      if (isClosed()) return;
      const text = getChunkText(chunk);
      if (!text) continue;
      resp += text;
      writeNdjson(res, { type: "delta", step, text });
    }
    const parsed = parseCriticResponse(resp);
    if (isClosed()) return;
    writeNdjson(res, {
      type: "result",
      step,
      data: { pass: parsed.pass, reason: parsed.reason || "", raw: (resp || "").trim() },
    });
    writePhaseEnd(res, step);
    res.end();
  } catch (e: any) {
    if (isClosed()) return;
    writeError(res, step, e?.message || "critic1 failed");
    writePhaseEnd(res, step);
    res.end();
  }
}

