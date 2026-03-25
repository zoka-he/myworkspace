import type { NextApiRequest, NextApiResponse } from "next";
import _ from "lodash";
import { CRITIC3_SYSTEM_PROMPT, buildCritic3UserInput, extractCritic3FinalSuggestion, parseCriticResponse } from "../genChapter";
import { initNdjsonStream, writeError, writeNdjson, writePhaseEnd, writePhaseStart } from "@/src/utils/streaming/ndjson";
import { createStreamingChain, getChunkText } from "./streamingChain";

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
    const systemPromptWithContext = CRITIC3_SYSTEM_PROMPT.replace("{{context}}", context || "");
    const chain = createStreamingChain(llm_type, systemPromptWithContext, criticInput, {
      temperature: 0.9,
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
    const parsed = parseCriticResponse(resp || "");
    let advice = extractCritic3FinalSuggestion(resp || "");
    // 删除“的虚拟形象”等高危词
    advice = advice.replace(/^的?虚拟形象$/g, "");
    advice = advice.replace(/^(他|她)?顿了顿$/g, "");
    advice = advice.replace(/^重新看向$/g, "");
    advice = advice.replace(/^一直安静的$/g, "");
    advice = advice.replace(/^(他|她)?打破死寂$/g, "");
    advice = advice.replace(/^(他|她)?打破了寂静$/g, "");
    advice = advice.replace(/^(他|她)?目光锐利$/g, "");
    advice = advice.replace(/^(他|她)?抬了抬下巴$/g, "");
    advice = advice.replace(/^下一秒$/g, "");
    advice = advice.replace(/^同一时刻$/g, "");
    advice = advice.replace(/^无意识(的|地)?$/g, "");

    if (isClosed()) return;
    writeNdjson(res, {
      type: "result",
      step,
      data: { pass: parsed.pass, reason: parsed.reason || "", advice, raw: (resp || "").trim() },
    });
    writePhaseEnd(res, step);
    res.end();
  } catch (e: any) {
    if (isClosed()) return;
    writeError(res, step, e?.message || "critic3 failed");
    writePhaseEnd(res, step);
    res.end();
  }
}

