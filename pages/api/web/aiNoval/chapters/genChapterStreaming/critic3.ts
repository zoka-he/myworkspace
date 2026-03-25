import type { NextApiRequest, NextApiResponse } from "next";
import _ from "lodash";
import { CRITIC3_SYSTEM_PROMPT, buildCritic3UserInput, callLLM, extractCritic3FinalSuggestion } from "../genChapter";
import { initNdjsonStream, writeError, writeNdjson, writePhaseEnd, writePhaseStart } from "@/src/utils/streaming/ndjson";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  initNdjsonStream(res);
  const step = "critic3";

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
  const critic1_pass = !!body.critic1_pass;
  const critic1_reason = body.critic1_reason || "";

  try {
    writePhaseStart(res, step, { llm_type });
    const criticInput = buildCritic3UserInput(draft, prev_content, curr_context, critic1_pass, critic1_reason);
    const resp = await callLLM(llm_type, CRITIC3_SYSTEM_PROMPT, criticInput, context);
    const advice = extractCritic3FinalSuggestion(resp || "");
    if (isClosed()) return;
    writeNdjson(res, { type: "result", step, data: { advice, raw: (resp || "").trim() } });
    writePhaseEnd(res, step);
    res.end();
  } catch (e: any) {
    if (isClosed()) return;
    writeError(res, step, e?.message || "critic3 failed");
    writePhaseEnd(res, step);
    res.end();
  }
}

