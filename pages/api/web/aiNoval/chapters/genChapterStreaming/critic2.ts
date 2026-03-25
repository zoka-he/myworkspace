import type { NextApiRequest, NextApiResponse } from "next";
import _ from "lodash";
import { CRITIC2_SYSTEM_PROMPT, buildCriticUserInput, callLLM, parseCritic2Response } from "../genChapter";
import { initNdjsonStream, writeError, writeNdjson, writePhaseEnd, writePhaseStart } from "@/src/utils/streaming/ndjson";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  initNdjsonStream(res);
  const step = "critic2";

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
  const llm_type = body.polish_llm_type || body.llm_type || "deepseek-chat";

  try {
    writePhaseStart(res, step, { llm_type });
    const criticInput = buildCriticUserInput(draft, prev_content, curr_context);
    const resp = await callLLM(llm_type, CRITIC2_SYSTEM_PROMPT, criticInput, "");
    const parsed = parseCritic2Response(resp);
    if (isClosed()) return;
    writeNdjson(res, { type: "result", step, data: { misunderstood: parsed.misunderstood, raw: (resp || "").trim() } });
    writePhaseEnd(res, step);
    res.end();
  } catch (e: any) {
    if (isClosed()) return;
    writeError(res, step, e?.message || "critic2 failed");
    writePhaseEnd(res, step);
    res.end();
  }
}

