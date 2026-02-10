import { NextApiRequest, NextApiResponse } from "next";
import { ApiResponse } from "@/src/types/ApiResponse";
import { ChatDeepSeek } from "@langchain/deepseek";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const model = new ChatDeepSeek({
    apiKey: DEEPSEEK_API_KEY,
    model: "deepseek-chat",
    temperature: 0.92, // 高随机，每次输出不同
});

const seedPrompt = PromptTemplate.fromTemplate(`
仅根据「上级阵营名称」为子阵营生成 6 个种子字段。每项 1～2 句话，风格可科幻/奇幻/现实混搭，大胆随机、避免套路。

上级阵营：{upper_faction_name}
{relation_to_upper_condition}

严格按以下格式输出，不要多写：
【与上级关系】
（1-2句）
【阵营正统】
（1-2句）
【阵营创伤】
（1-2句）
【存续机制】
（1-2句）
【日常稳态来源】
（1-2句）
【矛盾转移方式】
（1-2句）
`);

const chain = RunnableSequence.from([seedPrompt, model]);

export interface SubFactionSeedsOutput {
    relation_to_upper: string;
    orthodox: string;
    ptsd: string;
    survival_mechanism: string;
    daily_stabilizer: string;
    contradiction_shifter: string;
}

function parseSeeds(text: string): SubFactionSeedsOutput {
    const section = (key: string) => {
        const r = new RegExp(`【${key}】\\s*([\\s\\S]*?)(?=【|$)`, "u");
        return (text.match(r)?.[1] || "").trim().slice(0, 256);
    };
    return {
        relation_to_upper: section("与上级关系"),
        orthodox: section("阵营正统"),
        ptsd: section("阵营创伤"),
        survival_mechanism: section("存续机制"),
        daily_stabilizer: section("日常稳态来源"),
        contradiction_shifter: section("矛盾转移方式"),
    };
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse<SubFactionSeedsOutput>>
) {
    if (req.method !== "POST") {
        res.status(405).json({ success: false, error: "Method not allowed" });
        return;
    }
    if (!DEEPSEEK_API_KEY) {
        res.status(500).json({ success: false, error: "DEEPSEEK_API_KEY is not configured" });
        return;
    }
    try {
        const { upper_faction_name, relation_to_upper } = req.body as { upper_faction_name?: string; relation_to_upper?: string };
        if (!upper_faction_name?.trim()) {
            res.status(400).json({ success: false, error: "upper_faction_name is required" });
            return;
        }
        const relation_to_upper_condition = relation_to_upper?.trim()
            ? `约束条件：与上级关系需符合以下设定，生成时【与上级关系】一项应与之一致或在其基础上细化。\n${relation_to_upper.trim()}`
            : "";
        const response = await chain.invoke({
            upper_faction_name: upper_faction_name.trim(),
            relation_to_upper_condition,
        });
        const text = (response.content as string) || "";
        const data = parseSeeds(text);
        res.status(200).json({ success: true, data });
    } catch (e: any) {
        console.error("[generateSubFactionSeeds]", e);
        res.status(500).json({ success: false, error: e?.message || "生成失败" });
    }
}
