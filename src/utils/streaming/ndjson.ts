import type { NextApiResponse } from "next";

export type NdjsonEvent =
  | { type: "phase"; step: string; status: "start" | "end"; ts?: number; meta?: any }
  | { type: "delta"; step: string; text: string }
  | { type: "result"; step: string; data: any; ts?: number; meta?: any }
  | { type: "error"; step: string; message: string; ts?: number; meta?: any };

export function initNdjsonStream(res: NextApiResponse) {
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.status(200);
}

export function writeNdjson(res: NextApiResponse, event: NdjsonEvent): boolean {
  if ((res as any).writableEnded) return false;
  try {
    const anyEvent = event as any;
    const line = JSON.stringify({ ...event, ts: anyEvent.ts ?? Date.now() }) + "\n";
    const ok = res.write(line);
    if (typeof (res as any).flush === "function") {
      (res as any).flush();
    }
    return ok;
  } catch {
    return false;
  }
}

export function writePhaseStart(res: NextApiResponse, step: string, meta?: any) {
  return writeNdjson(res, { type: "phase", step, status: "start", meta });
}

export function writePhaseEnd(res: NextApiResponse, step: string, meta?: any) {
  return writeNdjson(res, { type: "phase", step, status: "end", meta });
}

export function writeError(res: NextApiResponse, step: string, message: string, meta?: any) {
  return writeNdjson(res, { type: "error", step, message, meta });
}

