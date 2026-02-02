import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import ToolsConfigService from "@/src/services/aiNoval/toolsConfigService";
import { ApiResponse } from "@/src/types/ApiResponse";

const API_KEY_PREFIX = "DIFY_GEN_GEO_NAMES_API_KEY_";
const toolsConfigService = new ToolsConfigService();

export interface DifyGenGeoNamesInput {
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

/**
 * 解析 Dify Agent 输出的地名候选列表
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

/**
 * POST /api/web/aiNoval/llm/once/difyGenGeoNames
 *
 * 请求体：DifyGenGeoNamesInput
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

    try {
        const { worldview_id, locationType, regionFeature, namingBackground, namingSource, namingHabit, specialRequirement, specialSuffix, prohibition, adjacentGeoNames, excludeNames } =
            req.body as DifyGenGeoNamesInput;

        if (!worldview_id || worldview_id === null || worldview_id === undefined) {
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

        const apiKey = await toolsConfigService.getConfig(API_KEY_PREFIX + worldview_id);
        if (!apiKey?.trim()) {
            res.status(500).json({
                success: false,
                error: `地理生成工作流 API Key 未配置，请在工具配置中设置 DIFY_GEN_GEO_NAMES_API_KEY_${worldview_id}`,
            });
            return;
        }

        let difyBaseUrl = await toolsConfigService.getConfig("DIFY_DATASET_BASE_URL");
        if (!difyBaseUrl) {
            const difyHost = await toolsConfigService.getConfig("DIFY_HOST");
            difyBaseUrl = difyHost ? `http://${difyHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}/v1` : "";
        }
        if (!difyBaseUrl) {
            res.status(500).json({
                success: false,
                error: "DIFY_DATASET_BASE_URL 或 DIFY_HOST 未配置",
            });
            return;
        }

        const inputs = {
            worldview_id: Number(worldview_id),
            locationType: String(locationType).trim(),
            regionFeature: String(regionFeature).trim(),
            namingBackground: String(namingBackground || "").trim(),
            namingSource: String(namingSource).trim(),
            namingHabit: String(namingHabit || "").trim(),
            specialRequirement: String(specialRequirement || "").trim(),
            specialSuffix: String(specialSuffix || "").trim(),
            prohibition: String(prohibition || "").trim(),
            adjacentGeoNames: String(adjacentGeoNames || "").trim(),
            excludeNames: String(excludeNames || "").trim(),
        };

        const externalApiUrl = difyBaseUrl.replace(/\/$/, "") + "/workflows/run";
        const response = await fetch(externalApiUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs,
                response_mode: "blocking",
                user: "geo-advice-panel",
            }),
            timeout: 1000 * 60 * 3, // 3 minutes
        });

        if (!response.ok) {
            const responseText = await response.text();
            console.error("[difyGenGeoNames] Dify API error:", response.status, responseText);
            res.status(500).json({
                success: false,
                error: `Dify 接口调用失败: ${response.status} ${response.statusText}`,
            });
            return;
        }

        const data = (await response.json()) as {
            data?: { outputs?: { text?: string }; status?: string; error?: string };
            workflow_run_id?: string;
        };

        const status = data?.data?.status;
        const error = data?.data?.error;
        const text = data?.data?.outputs?.text || "";

        if (status === "failed" || error) {
            res.status(500).json({
                success: false,
                error: error || "Dify 工作流执行失败",
            });
            return;
        }

        const items = parseGeoAdviceOutput(text);

        res.status(200).json({
            success: true,
            data: { items },
        });
    } catch (error: any) {
        console.error("[difyGenGeoNames] Error:", error);
        res.status(500).json({
            success: false,
            error: error?.message || "生成失败",
        });
    }
}
