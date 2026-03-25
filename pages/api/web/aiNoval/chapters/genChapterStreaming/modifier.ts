import type { NextApiRequest, NextApiResponse } from "next";
import _ from "lodash";
import { shouldRunModifierFromCritic1Reason } from "../genChapter";
import { initNdjsonStream, writeError, writeNdjson, writePhaseEnd, writePhaseStart } from "@/src/utils/streaming/ndjson";
import { createSiliconFlowModel } from "@/src/utils/ai/modelFactory";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { getChunkText } from "./streamingChain";

function getModifierChunkText(chunk: any): string {
  const text = getChunkText(chunk);
  if (text) return text;

  // 兼容不同 provider 的 chunk 结构
  const candidates = [
    chunk?.text,
    chunk?.delta,
    chunk?.kwargs?.text,
    chunk?.kwargs?.delta,
    chunk?.kwargs?.content,
    chunk?.additional_kwargs?.text,
    chunk?.additional_kwargs?.delta,
    chunk?.response_metadata?.text,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }

  if (Array.isArray(chunk?.delta)) {
    const joined = chunk.delta
      .map((x: any) => (typeof x === "string" ? x : typeof x?.text === "string" ? x.text : ""))
      .join("");
    if (joined) return joined;
  }

  // 递归兜底：从常见结构中抽取文本，避免 provider 结构差异导致漏取
  const visited = new WeakSet<object>();
  const pickTextDeep = (node: any): string => {
    if (node == null) return "";
    if (typeof node === "string") return node;
    if (typeof node !== "object") return "";
    if (visited.has(node)) return "";
    visited.add(node);

    // 常见文本键
    const directKeys = ["text", "content", "delta", "reasoning_content", "output_text"];
    const parts: string[] = [];
    for (const k of directKeys) {
      const v = (node as any)[k];
      if (typeof v === "string" && v) parts.push(v);
      if (Array.isArray(v)) {
        for (const item of v) {
          const p = pickTextDeep(item);
          if (p) parts.push(p);
        }
      } else if (v && typeof v === "object") {
        const p = pickTextDeep(v);
        if (p) parts.push(p);
      }
    }

    // 遍历对象剩余字段（限制深度/体积：仅一层子键）
    for (const [k, v] of Object.entries(node)) {
      if (directKeys.includes(k)) continue;
      if (typeof v === "string" && (k.includes("text") || k.includes("content"))) {
        if (v) parts.push(v);
      } else if (v && typeof v === "object") {
        const p = pickTextDeep(v);
        if (p) parts.push(p);
      }
    }
    return parts.join("");
  };

  const deepText = pickTextDeep({
    content: chunk?.content,
    additional_kwargs: chunk?.additional_kwargs,
    response_metadata: chunk?.response_metadata,
    lc_kwargs: chunk?.lc_kwargs,
    lc_serializable: chunk?.lc_serializable,
  });
  if (deepText) return deepText;

  return "";
}

function getChunkShape(chunk: any) {
  return {
    type: chunk?.constructor?.name || typeof chunk,
    keys: chunk && typeof chunk === "object" ? Object.keys(chunk).slice(0, 20) : [],
    hasContent: chunk?.content != null,
    hasText: typeof chunk?.text === "string",
    hasDelta: chunk?.delta != null,
    hasKwargs: chunk?.kwargs != null,
    hasAdditionalKwargs: chunk?.additional_kwargs != null,
  };
}

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
    console.warn("[genChapterStreaming/modifier] req closed by client", {
      writableEnded: (res as any).writableEnded,
    });
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
  const IDLE_TIMEOUT_MS = 3 * 60 * 1000;
  const HEARTBEAT_MS = 15 * 1000;

  try {
    console.info("[genChapterStreaming/modifier] start", {
      worldviewIdNum,
      triggered,
      force,
      draftLen: typeof draft === "string" ? draft.length : -1,
      critic1ReasonLen: typeof critic1_reason === "string" ? critic1_reason.length : -1,
    });
    writePhaseStart(res, step, { triggered });
    if (!triggered) {
      console.info("[genChapterStreaming/modifier] skipped (not triggered)");
      writeNdjson(res, { type: "result", step, data: { tunedDraft: draft, skipped: true } });
      writePhaseEnd(res, step, { skipped: true });
      res.end();
      return;
    }
    const system = `你是一名“粗调修改员”，只做一件事：从用户提供的小说正文中直接删除指定的无信息套话，不重写剧情、不增删信息点、不改动人称时态，不做润色。

必须删除（命中即删，连同紧邻的无意义连接词/标点也要顺手整理，但不要重写句子）：
- 「顿了顿」及其近似表述（如「顿了顿道/顿了顿说」仅删除“顿了顿”部分）
- 「重新看向」及其近似表述
- 「目光重新落在某人身上」及同义变体
- 「目光锐利如刀」及同义变体
- 「转向某人」及其近似表述
- 「转头看向他/她」及同义变体
- 「声音不大，但……」及同义变体
- 「声音不高，却……」及同义变体
- 「语速很快」及同义变体
- 「虚拟形象」
- 「剑柄」
- 「刀柄」
- 「无意识的/地」
- 「精准的/地」
- 「冰冷的/地」
- 「猛的/地」
- 「死死的/地」
- 「空气凝固」及同义变体
- 「陷入沉默」及同义变体
- 「身体前倾」「挺直脊背」「前倾身体」及同义变体
- 「声音压低」「声音沙哑」及同义变体
- 「咬了咬下唇」及同义变体
- 「挺直了背」及同义变体

必须修改（命中即改，连同紧邻的无意义连接词/标点也要顺手整理，但不要重写句子）：
- 「开口」改为「说」，如果「开口」前面有形容词，删除形容词

输出要求：
- 只输出修改后的全文，不要解释，不要列清单，不要加前缀。`;
    const user = `待处理正文（仅删除上述套话，其余保持不变）：\n\n${(draft || "").trim()}`;
    const model = createSiliconFlowModel({
      // model: "Qwen/Qwen3.5-35B-A3B",
      model: "Qwen/Qwen3.5-122B-A10B",
      temperature: 0.2,
      // 避免只流出 reasoning 而迟迟不产出正文 token，导致前端长期无可见输出
      enableThinking: false,
    });
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", system],
      ["user", user],
    ]);
    const chain = RunnableSequence.from([prompt, model]);
    let tunedDraft = "";
    const stream = await chain.stream({});
    console.info("[genChapterStreaming/modifier] siliconflow stream started");
    let chunkCount = 0; // text chunk count
    let rawChunkCount = 0;
    let wroteAny = false;
    const startedAt = Date.now();
    let lastRawChunkAt = Date.now();
    let lastTextChunkAt = Date.now();
    let hb: any = null;
    let ndjsonHeartbeat: any = null;
    const NO_TEXT_GUARD_MS = 90 * 1000;
    const NO_TEXT_GUARD_RAW_CHUNKS = 300;
    const armHeartbeat = () => {
      if (hb) clearInterval(hb);
      hb = setInterval(() => {
        console.warn("[genChapterStreaming/modifier] heartbeat: waiting for stream chunk", {
          runningForMs: Date.now() - startedAt,
          idleForMs: Date.now() - lastRawChunkAt,
          noTextForMs: Date.now() - lastTextChunkAt,
          rawChunkCount,
          chunkCount,
          tunedDraftLen: tunedDraft.length,
          closed,
          writableEnded: (res as any).writableEnded,
        });
      }, HEARTBEAT_MS);
    };
    const clearHeartbeat = () => {
      if (hb) clearInterval(hb);
      hb = null;
    };
    const armNdjsonHeartbeat = () => {
      if (ndjsonHeartbeat) clearInterval(ndjsonHeartbeat);
      ndjsonHeartbeat = setInterval(() => {
        // 防止前端“3min 无新 NDJSON 包”超时：发一个空 delta 作为 keep-alive，不改变内容
        if (isClosed()) return;
        const ok = writeNdjson(res, { type: "delta", step, text: "" });
        if (!ok) {
          console.warn("[genChapterStreaming/modifier] ndjson heartbeat backpressure/failed", {
            chunkCount,
            tunedDraftLen: tunedDraft.length,
          });
        }
      }, 20 * 1000);
    };
    const clearNdjsonHeartbeat = () => {
      if (ndjsonHeartbeat) clearInterval(ndjsonHeartbeat);
      ndjsonHeartbeat = null;
    };
    armHeartbeat();
    armNdjsonHeartbeat();

    const it = (stream as any)?.[Symbol.asyncIterator]?.();
    if (!it || typeof it.next !== "function") {
      throw new Error("stream is not async iterable");
    }

    const nextWithTimeout = async () => {
      const timeout = new Promise<never>((_, reject) => {
        const t = setTimeout(() => {
          clearTimeout(t);
          reject(new Error("idle_timeout"));
        }, IDLE_TIMEOUT_MS);
      });
      return await Promise.race([it.next(), timeout]);
    };

    while (true) {
      if (isClosed()) {
        console.warn("[genChapterStreaming/modifier] stream aborted before next(): connection closed", {
          rawChunkCount,
          chunkCount,
          tunedDraftLen: tunedDraft.length,
        });
        return;
      }
      let r: any;
      try {
        r = await nextWithTimeout();
      } catch (e: any) {
        if (e?.message === "idle_timeout") {
          console.error("[genChapterStreaming/modifier] idle timeout: no stream chunk", {
            idleForMs: Date.now() - lastRawChunkAt,
            noTextForMs: Date.now() - lastTextChunkAt,
            runningForMs: Date.now() - startedAt,
            rawChunkCount,
            chunkCount,
            tunedDraftLen: tunedDraft.length,
          });
          writeError(res, step, `modifier streaming timeout: no delta for ${Math.floor(IDLE_TIMEOUT_MS / 1000)}s`);
          writePhaseEnd(res, step, { timeout: true });
          res.end();
          return;
        }
        throw e;
      }

      if (!r || r.done) break;
      const chunk = r.value;
      rawChunkCount += 1;
      lastRawChunkAt = Date.now();

      if (isClosed()) {
        console.warn("[genChapterStreaming/modifier] stream aborted: connection closed", {
          rawChunkCount,
          chunkCount,
          tunedDraftLen: tunedDraft.length,
        });
        return;
      }
      const text = getModifierChunkText(chunk);
      if (!text) {
        if (rawChunkCount <= 5 || rawChunkCount % 50 === 0) {
          console.warn("[genChapterStreaming/modifier] raw chunk has no text payload", {
            rawChunkCount,
            shape: getChunkShape(chunk),
          });
        }
        if (
          chunkCount === 0 &&
          rawChunkCount >= NO_TEXT_GUARD_RAW_CHUNKS &&
          Date.now() - startedAt >= NO_TEXT_GUARD_MS
        ) {
          console.error("[genChapterStreaming/modifier] no text extracted from stream for too long", {
            rawChunkCount,
            runningForMs: Date.now() - startedAt,
          });
          break;
        }
        continue;
      }
      if (rawChunkCount <= 3) {
        console.info("[genChapterStreaming/modifier] extracted text from raw chunk", {
          rawChunkCount,
          textLen: text.length,
        });
      }
      // 仅首个“有效文本”到来后，才停 keep-alive 心跳
      if (chunkCount === 0) {
        clearNdjsonHeartbeat();
      }
      lastTextChunkAt = Date.now();
      tunedDraft += text;
      const ok = writeNdjson(res, { type: "delta", step, text });
      wroteAny = true;
      chunkCount += 1;
      if (!ok) {
        console.warn("[genChapterStreaming/modifier] res.write backpressure", {
          rawChunkCount,
          chunkCount,
          tunedDraftLen: tunedDraft.length,
        });
      } else if (chunkCount % 20 === 0) {
        console.info("[genChapterStreaming/modifier] streaming progress", {
          rawChunkCount,
          chunkCount,
          tunedDraftLen: tunedDraft.length,
        });
      }
    }
    clearHeartbeat();
    clearNdjsonHeartbeat();
    if (isClosed()) {
      console.warn("[genChapterStreaming/modifier] finished but connection closed", {
        rawChunkCount,
        chunkCount,
        tunedDraftLen: tunedDraft.length,
      });
      return;
    }
    if (!wroteAny) {
      console.warn("[genChapterStreaming/modifier] stream ended without any delta chunk", {
        rawChunkCount,
        chunkCount,
        tunedDraftLen: tunedDraft.length,
      });
      try {
        console.info("[genChapterStreaming/modifier] fallback to non-stream invoke()");
        const fallbackResp: any = await chain.invoke({});
        const fallbackText = getModifierChunkText(fallbackResp);
        if (fallbackText) {
          tunedDraft = fallbackText;
          if (!isClosed()) {
            writeNdjson(res, { type: "delta", step, text: fallbackText });
          }
          wroteAny = true;
        }
      } catch (fallbackErr: any) {
        console.error("[genChapterStreaming/modifier] invoke fallback failed", {
          message: fallbackErr?.message || String(fallbackErr),
        });
      }
    }
    writeNdjson(res, { type: "result", step, data: { tunedDraft: (tunedDraft || "").trim() || draft || "", skipped: false } });
    writePhaseEnd(res, step);
    res.end();
  } catch (e: any) {
    if (isClosed()) return;
    console.error("[genChapterStreaming/modifier] failed", {
      message: e?.message || String(e),
      stack: e?.stack,
      writableEnded: (res as any).writableEnded,
      closed,
    });
    writeError(res, step, e?.message || "modifier failed");
    writePhaseEnd(res, step);
    res.end();
  }
}

