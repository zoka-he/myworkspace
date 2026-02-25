import ChaptersService from "@/src/services/aiNoval/chaptersService";
import { stripParagraphInternal } from "../llm/once/stripParagraph";

const CONCURRENCY = 4;
const DEFAULT_STRIP_LENGTH = 300;

function parseChapterIds(ids: any): number[] {
  if (!ids) return [];
  if (Array.isArray(ids)) return ids.filter((x): x is number => typeof x === "number" && x > 0);
  if (typeof ids === "string") {
    try {
      const parsed = JSON.parse(ids);
      return Array.isArray(parsed) ? parsed.filter((x: any) => typeof x === "number" && x > 0) : [];
    } catch {
      return ids.split(",").map((s: string) => Number(s.trim())).filter((n: number) => !isNaN(n) && n > 0);
    }
  }
  return [];
}

async function processOne(
  ch: { id: number; title: string; chapterNumber: number | null; content: string; summary?: string },
  stripTargetLength: number
): Promise<string | null> {
  let text: string;
  if (ch.summary && String(ch.summary).trim()) {
    text = String(ch.summary).trim();
  } else if (ch.content && ch.content.trim()) {
    try {
      text = await stripParagraphInternal(ch.content.trim(), stripTargetLength);
    } catch (err) {
      console.warn("[relatedChapterContext] strip failed for chapter:", ch.id, err);
      text = ch.content.trim().slice(0, stripTargetLength + 100);
    }
  } else {
    return null;
  }
  const title = ch.title ? String(ch.title).trim() : "未命名";
  const num = ch.chapterNumber != null ? ch.chapterNumber : ch.id;
  return `【第 ${num} 章 ${title}】\n${text}`;
}

/**
 * 按 related_chapter_ids 加载章节标题与正文（及 summary），有 summary 则直接用，否则 LLM 并发缩写，拼接为「关联章节引用」文本。
 * @param chapterIds 章节 ID 数组（可来自脑洞 related_chapter_ids，支持 number[] 或 JSON 字符串等）
 * @param stripTargetLength 无 summary 时缩写目标字数，默认 300
 * @returns 拼接后的引用文本，无有效章节时返回 ""
 */
export async function buildRelatedChapterContext(
  chapterIds: any,
  stripTargetLength: number = DEFAULT_STRIP_LENGTH
): Promise<string> {
  const ids = parseChapterIds(chapterIds);
  if (ids.length === 0) return "";

  const service = new ChaptersService();
  const chapters: { id: number; title: string; chapterNumber: number | null; content: string; summary?: string }[] = [];

  for (const id of ids) {
    try {
      const row: any = await service.queryOne({ id });
      if (!row) continue;
      const content = row.content ?? "";
      const summary = row.summary;
      const hasContent = content && String(content).trim();
      const hasSummary = summary != null && String(summary).trim();
      if (!hasContent && !hasSummary) continue;
      chapters.push({
        id: row.id,
        title: row.title ?? "",
        chapterNumber: row.chapter_number != null ? row.chapter_number : null,
        content: hasContent ? String(content).trim() : "",
        summary: hasSummary ? String(summary).trim() : undefined,
      });
    } catch (err) {
      console.warn("[relatedChapterContext] load chapter failed:", id, err);
    }
  }

  if (chapters.length === 0) return "";

  const parts: string[] = [];
  for (let i = 0; i < chapters.length; i += CONCURRENCY) {
    const chunk = chapters.slice(i, i + CONCURRENCY);
    const segment = await Promise.all(chunk.map((ch) => processOne(ch, stripTargetLength)));
    parts.push(...segment.filter((s): s is string => s != null));
  }

  return parts.join("\n\n");
}
