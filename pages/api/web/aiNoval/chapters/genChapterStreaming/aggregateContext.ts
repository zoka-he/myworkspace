import type { NextApiRequest, NextApiResponse } from "next";
import _ from "lodash";
import { getAggregatedContext } from "../genChapter";
import { initNdjsonStream, writeError, writeNdjson, writePhaseEnd, writePhaseStart } from "@/src/utils/streaming/ndjson";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  initNdjsonStream(res);
  const step = "aggregateContext";

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
  const role_group_names = body.role_group_names || "";
  const role_names = body.role_names || "";
  const faction_names = body.faction_names || "";
  const geo_names = body.geo_names || "";

  try {
    writePhaseStart(res, step);
    const context = await getAggregatedContext(worldviewIdNum, role_group_names, role_names, faction_names, geo_names);
    if (isClosed()) return;
    writeNdjson(res, { type: "result", step, data: { context } });
    writePhaseEnd(res, step);
    res.end();
  } catch (e: any) {
    if (isClosed()) return;
    writeError(res, step, e?.message || "aggregateContext failed");
    writePhaseEnd(res, step);
    res.end();
  }
}

