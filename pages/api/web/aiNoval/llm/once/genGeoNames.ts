import { NextApiRequest, NextApiResponse } from "next";
import { ApiResponse } from "@/src/types/ApiResponse";
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

export interface GenGeoNamesInput {
    worldview_id: number;
    locationType: string;
    regionFeature: string;
    namingBackground?: string;
    namingSource: string;
    namingHabit?: string;
    specialRequirement?: string;
    specialSuffix?: string;
    prohibition?: string;
    /** 相邻地点名称，用于参考地点的性质 */
    adjacentGeoNames?: string;
    /** 已有地名、势力名（由 FindGeo/FindFaction 等获取），生成时需避免重名/谐音 */
    excludeNames?: string;
}

export interface GeoAdviceItem {
    id: string;
    name: string;
    description?: string;
}

const SYSTEM_INSTRUCTION = `你是一个"世界观约束下的命名生成组件"。

你的职责是在自由创作的同时，创造符合既定世界观内的【候选地点名】。

你必须遵守以下原则：

- 世界观中已有的地名、势力、角色具有最高优先级，不可冲突

- 不使用现实地球直译风格的词汇

- 适当为名字编造背景或解释，但必须与世界观建立联系

- 不假设你生成的名字一定会被采用


你不会做最终裁决，也不会决定是否采用你的输出。你需要彻底释放创造力



在本世界中，地名通常来源于不同文明的原始语言。

这些语言已经部分失传，现存名称多为音译或二次转写。


因此：

- 地名不需要能够被完全拆解为现代汉语含义

- 即使使用汉字，也优先承载"发音"而非"语义"

- 后世对地名的解释，可能是附会或误解`;

const USER_PROMPT_TEMPLATE = `在以下条件下生成地名候选：


- 世界观 ID：{worldview_id}

- 地点类型：{locationType}

- 区域特征：{regionFeature}

- 命名权来源：{namingSource}


命名背景：

{namingBackground}


命名约束：

- 阵营命名习惯：{namingHabit}

- 特殊要求：{specialRequirement}

- 特殊后缀：{specialSuffix}

- 严禁事项：{prohibition}

- 相邻地点（需避免重名/谐音）：{adjacentGeoNames}
{excludeNamesBlock}

请生成 6 个【候选地点名】。


最终输出要求：

- 所有输出内容都要是中文

- 每个名字 2~10 个汉字

- 先输出名字列表

- 每个名字都要相应的解释，并且附上潜在的剧情设计

- 在最终输出前，检查你生成的地名、相关设定是否和世界观已有的地名相近，以及这种相近是否合理


注意：

- 名称应当"读起来顺，但不好解释"

- 如果一个名字可以被轻易翻译成一句话，说明它不合格`;

/**
 * 解析 LLM 输出的地名候选列表
 * 预期格式：先输出名字列表，每个名字有解释和剧情设计
 * 例如：1. 苍澜山脉 - 解释... 2. 北境裂谷 - ...
 */
function parseGeoAdviceOutput(text: string): GeoAdviceItem[] {
    const items: GeoAdviceItem[] = [];
    if (!text?.trim()) return items;

    // 匹配 "1. 名称" 或 "1．名称" 或 "1、名称" 开头的块
    const blocks = text.split(/(?=\d+[.．、]\s*)/);
    let id = 1;
    for (const block of blocks) {
        const trimmed = block.trim();
        if (!trimmed) continue;

        // 提取首行作为名称，余下作为描述
        const lines = trimmed.split(/\n/);
        const firstLine = lines[0] || "";
        const match = firstLine.replace(/^\d+[.．、]\s*/, "").match(/^([^\s\-:：]+)(?:\s*[-:：]\s*)?([\s\S]*)?$/);
        const name = match?.[1]?.trim() || firstLine.replace(/^\d+[.．、]\s*/, "").trim();
        const firstLineDesc = match?.[2]?.trim() || "";
        const restDesc = lines.slice(1).join("\n").trim();
        const description = [firstLineDesc, restDesc].filter(Boolean).join("\n");

        if (name && name.length >= 2 && name.length <= 20) {
            items.push({
                id: String(id++),
                name,
                description: description || undefined,
            });
        }
    }

    return items;
}

function buildExcludeNamesBlock(excludeNames?: string): string {
    if (!excludeNames?.trim()) return "";
    return `\n- 已有地名/势力名（需避免重名/谐音）：${excludeNames.trim()}`;
}

/**
 * POST /api/web/aiNoval/llm/once/genGeoNames
 *
 * 请求体：GenGeoNamesInput（与 Dify 版本字段一致）
 * 返回：ApiResponse<{ items: GeoAdviceItem[] }>
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse<{ items: GeoAdviceItem[] }>>
) {
    if (req.method !== "POST") {
        res.status(405).json({
            success: false,
            error: "Method not allowed, only POST method is allowed",
        });
        return;
    }

    if (!DEEPSEEK_API_KEY) {
        res.status(500).json({
            success: false,
            error: "DEEPSEEK_API_KEY is not configured",
        });
        return;
    }

    try {
        const {
            worldview_id,
            locationType,
            regionFeature,
            namingBackground,
            namingSource,
            namingHabit,
            specialRequirement,
            specialSuffix,
            prohibition,
            adjacentGeoNames,
            excludeNames,
        } = req.body as GenGeoNamesInput;

        if (worldview_id === null || worldview_id === undefined) {
            res.status(400).json({ success: false, error: "worldview_id is required" });
            return;
        }
        if (!locationType?.trim()) {
            res.status(400).json({ success: false, error: "locationType is required" });
            return;
        }
        if (!regionFeature?.trim()) {
            res.status(400).json({ success: false, error: "regionFeature is required" });
            return;
        }
        if (!namingSource?.trim()) {
            res.status(400).json({ success: false, error: "namingSource is required" });
            return;
        }

        const model = new ChatDeepSeek({
            apiKey: DEEPSEEK_API_KEY,
            model: "deepseek-chat",
            temperature: 1,
        });

        const prompt = ChatPromptTemplate.fromMessages([
            ["system", SYSTEM_INSTRUCTION],
            ["human", USER_PROMPT_TEMPLATE],
        ]);

        const chain = RunnableSequence.from([prompt, model]);

        const excludeNamesBlock = buildExcludeNamesBlock(excludeNames);

        const response = await chain.invoke({
            worldview_id: Number(worldview_id),
            locationType: String(locationType).trim(),
            regionFeature: String(regionFeature).trim(),
            namingBackground: String(namingBackground || "").trim() || "（未指定）",
            namingSource: String(namingSource).trim(),
            namingHabit: String(namingHabit || "").trim() || "（未指定）",
            specialRequirement: String(specialRequirement || "").trim() || "（未指定）",
            specialSuffix: String(specialSuffix || "").trim() || "（未指定）",
            prohibition: String(prohibition || "").trim() || "（未指定）",
            adjacentGeoNames: String(adjacentGeoNames || "").trim() || "（未指定）",
            excludeNamesBlock: excludeNamesBlock || "",
        });

        const text = (response.content as string) || "";
        const items = parseGeoAdviceOutput(text);

        res.status(200).json({
            success: true,
            data: { items },
        });
    } catch (error: unknown) {
        const err = error as Error;
        console.error("[genGeoNames] Error:", err);
        res.status(500).json({
            success: false,
            error: err?.message || "生成失败",
        });
    }
}
