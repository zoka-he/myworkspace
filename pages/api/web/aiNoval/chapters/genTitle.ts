import ToolsConfigService from "@/src/services/aiNoval/toolsConfigService";
import ChaptersService from "@/src/services/aiNoval/chaptersService";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatDeepSeek } from "@langchain/deepseek";
import { NextApiRequest, NextApiResponse } from "next";
import _ from "lodash";
import { withErrorHandler, createApiError } from "@/src/utils/api/errorHandler";

type Data = {
    message?: string;
    error?: string;
    data?: { outputs?: { output?: string } };
    [key: string]: any;
};

const toolsConfigService = new ToolsConfigService();
const DEEPSEEK_API_KEY_NAME = "DEEPSEEK_API_KEY";

async function handleGenTitle(req: NextApiRequest, res: NextApiResponse<Data>) {
    let chapterId = _.toNumber(req.query.chapterId);
    if (typeof chapterId !== "number" || _.isNaN(chapterId)) {
        throw createApiError("chapterId is not a number", 400);
    }

    let chapter = await new ChaptersService().queryOne({ id: chapterId });
    if (!chapter) {
        throw createApiError("chapter not found", 404);
    }

    const src_text = chapter.content;
    if (!src_text?.length) {
        throw createApiError("chapter content is empty", 400);
    }

    let apiKey = await toolsConfigService.getConfig(DEEPSEEK_API_KEY_NAME);
    if (!apiKey?.length) {
        throw createApiError(`${DEEPSEEK_API_KEY_NAME} is not set`, 500);
    }

    const prompt = PromptTemplate.fromTemplate(`你是一位专业的中文网文编辑，擅长为小说章节起标题。你的输出将直接给编辑/作者阅读，用于挑选或参考。

【任务】根据下方章节内容概要，给出一份完整的标题建议：包含一个主推荐标题、推荐理由，以及 2～3 个备选标题及各自理由。

【章节内容概要】
{src_text}

【标题要求】
1. 长度：4～12 个汉字，简洁有力，不冗长。
2. 风格：符合网文习惯，可带悬念或情绪，避免过于文艺或晦涩。
3. 内容：准确概括本章核心情节或转折，让读者一眼能感知本章重点。
4. 主推荐与备选之间应有差异（如侧重点不同、语气不同），方便人选。

【输出格式】请严格按以下结构输出，方便人阅读：

---
## 主推荐
**标题：** （此处只写标题文字，不要加引号、书名号）

**理由：** （一两句话说明为何推荐这个标题，例如突出什么情节、什么情绪或悬念）

## 备选标题

**备选一：** （标题文字）  
理由：（简短说明）

**备选二：** （标题文字）  
理由：（简短说明）

**备选三：** （标题文字，可选）  
理由：（简短说明）
---

只输出上述结构中的内容，不要输出「好的，我来…」等开场白。`);

    const model = new ChatDeepSeek({
        apiKey: apiKey,
        model: "deepseek-chat",
        temperature: 0.5,
    });

    const chain = RunnableSequence.from([prompt, model]);
    const result = await chain.invoke({ src_text });
    const rawContent = typeof result.content === "string" ? result.content : String(result.content ?? "");
    const suggestion = rawContent.trim();

    // response.data?.outputs?.output
    res.status(200).json({ data: { outputs: { output: suggestion } } });
}

export default withErrorHandler(handleGenTitle);