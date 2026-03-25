import type { NextApiRequest, NextApiResponse } from "next";
import _ from "lodash";
import { runSiliconFlowModifierRemoveCliches, shouldRunModifierFromCritic1Reason } from "../genChapter";
import { initNdjsonStream, writeError, writeNdjson, writePhaseEnd, writePhaseStart } from "@/src/utils/streaming/ndjson";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  initNdjsonStream(res);
  const step = "modifier";

  let closed = false;
  req.on("close", () => {
    closed = true;
  });
  const isClosed = () => closed || (res as any).writableEnded;

  const worldviewIdNum = _.toNumber(req.query.worldviewId ?? req.body?.worldview_id);
  if (!worldviewIdNum) {
    // worldviewId 仅为统一接口形态（modifier 本身不依赖），但这里仍要求，方便前端统一编排
    writeError(res, step, "worldviewId is required");
    res.end();
    return;
  }

  const body = req.body || {};
  const draft = body.draft || "";
  const critic1_reason = body.critic1_reason || "";
  const force = body.force === true;
  const triggered = force || shouldRunModifierFromCritic1Reason(critic1_reason);

  try {
    writePhaseStart(res, step, { triggered });
    if (!triggered) {
      writeNdjson(res, { type: "result", step, data: { tunedDraft: draft, skipped: true } });
      writePhaseEnd(res, step, { skipped: true });
      res.end();
      return;
    }
    const tunedDraft = await runSiliconFlowModifierRemoveCliches(draft);
    if (isClosed()) return;
    writeNdjson(res, { type: "result", step, data: { tunedDraft: tunedDraft || "", skipped: false } });
    writePhaseEnd(res, step);
    res.end();
  } catch (e: any) {
    if (isClosed()) return;
    writeError(res, step, e?.message || "modifier failed");
    writePhaseEnd(res, step);
    res.end();
  }
}

