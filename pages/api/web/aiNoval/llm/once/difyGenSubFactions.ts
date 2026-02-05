import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import ToolsConfigService from "@/src/services/aiNoval/toolsConfigService";
import { ApiResponse } from "@/src/types/ApiResponse";

const API_KEY_PREFIX = "DIFY_GEN_SUB_FACTIONS_API_KEY_";
const toolsConfigService = new ToolsConfigService();

export interface DifyGenSubFactionsInput {
    worldview_id: number;
    upper_faction_name: string;
    relation_to_upper: string;
    orthodox: string;
    ptsd: string;
    survival_mechanism: string;
    daily_stabilizer: string;
    contradiction_shifter: string;
    count?: number;
}

export interface DifyGenSubFactionsOutput {
    text1?: string; // 约束层输出
    text2?: string; // 风格展开层输出
    text3?: string; // 命名与语言规则输出
    text4?: string; // 结构张力层输出
    text5?: string[]; // 生成的子阵营列表（数组）
}

/**
 * POST /api/web/aiNoval/llm/once/difyGenSubFactions
 *
 * 请求体：DifyGenSubFactionsInput
 * 返回：ApiResponse<DifyGenSubFactionsOutput>
 */
const LOG_TAG = "[difyGenSubFactions]";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse<DifyGenSubFactionsOutput>>
) {
    if (req.method !== "POST") {
        res.status(405).json({
            success: false,
            error: "Method not allowed, only POST method is allowed",
        });
        return;
    }

    try {
        console.log(LOG_TAG, "request start");
        const body = req.body as DifyGenSubFactionsInput | undefined;
        if (!body || typeof body !== "object") {
            console.warn(LOG_TAG, "missing or invalid body", typeof req.body);
            res.status(400).json({ success: false, error: "请求体无效" });
            return;
        }
        const { worldview_id, upper_faction_name, relation_to_upper, orthodox, ptsd, survival_mechanism, daily_stabilizer, contradiction_shifter, count } = body;

        if (!worldview_id || worldview_id === null || worldview_id === undefined) {
            res.status(400).json({ success: false, error: "worldview_id is required" });
            return;
        }
        if (!upper_faction_name?.trim()) {
            res.status(400).json({ success: false, error: "upper_faction_name is required" });
            return;
        }
        if (!relation_to_upper?.trim()) {
            res.status(400).json({ success: false, error: "relation_to_upper is required" });
            return;
        }
        if (!orthodox?.trim()) {
            res.status(400).json({ success: false, error: "orthodox is required" });
            return;
        }
        if (!ptsd?.trim()) {
            res.status(400).json({ success: false, error: "ptsd is required" });
            return;
        }
        if (!survival_mechanism?.trim()) {
            res.status(400).json({ success: false, error: "survival_mechanism is required" });
            return;
        }
        if (!daily_stabilizer?.trim()) {
            res.status(400).json({ success: false, error: "daily_stabilizer is required" });
            return;
        }
        if (!contradiction_shifter?.trim()) {
            res.status(400).json({ success: false, error: "contradiction_shifter is required" });
            return;
        }

        const apiKey = await toolsConfigService.getConfig(API_KEY_PREFIX + worldview_id);
        if (!apiKey?.trim()) {
            res.status(500).json({
                success: false,
                error: `子阵营生成工作流 API Key 未配置，请在工具配置中设置 DIFY_GEN_SUB_FACTIONS_API_KEY_${worldview_id}`,
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

        const inputs: Record<string, string | number> = {
            upper_faction_name: String(upper_faction_name).trim(),
            relation_to_upper: String(relation_to_upper).trim(),
            orthodox: String(orthodox).trim(),
            ptsd: String(ptsd).trim(),
            survival_mechanism: String(survival_mechanism).trim(),
            daily_stabilizer: String(daily_stabilizer).trim(),
            contradiction_shifter: String(contradiction_shifter).trim(),
            count: count ? Number(count) : 1,
        };
        // 若 workflow 需要 worldview 上下文（如 MCP），一并传入
        if (worldview_id != null && worldview_id !== undefined) {
            inputs.worldview_id = Number(worldview_id);
        }

        const externalApiUrl = difyBaseUrl.replace(/\/$/, "") + "/workflows/run";
        console.log(LOG_TAG, "calling Dify", externalApiUrl);
        const response = await fetch(externalApiUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs,
                response_mode: "blocking",
                user: "sub-faction-generator-panel",
            }),
            timeout: 1000 * 60 * 10, // 10 minutes (工作流可能较长)
        });

        const responseText = await response.text();
        if (!response.ok) {
            console.error(LOG_TAG, "Dify API error", response.status, responseText?.slice(0, 500));
            res.status(500).json({
                success: false,
                error: `Dify 接口调用失败: ${response.status} ${response.statusText}`,
            });
            return;
        }

        let data: {
            data?: {
                outputs?: {
                    text1?: string;
                    text2?: string;
                    text3?: string;
                    text4?: string;
                    text5?: string[];
                };
                status?: string;
                error?: string;
            };
            workflow_run_id?: string;
        };
        try {
            data = JSON.parse(responseText) as typeof data;
        } catch (parseErr: any) {
            console.error(LOG_TAG, "Dify response JSON parse error", parseErr?.message, responseText?.slice(0, 300));
            res.status(500).json({
                success: false,
                error: "Dify 返回数据无法解析",
            });
            return;
        }

        const status = data?.data?.status;
        const error = data?.data?.error;
        const outputs = data?.data?.outputs;

        if (status === "failed" || error) {
            const rawError = error || "Dify 工作流执行失败";
            const isModelUnavailable =
                /Server Unavailable|Connection aborted|Remote end closed|RemoteDisconnected|read llm model failed|PluginInvokeError/i.test(
                    String(rawError)
                );
            console.error(LOG_TAG, "workflow failed", rawError?.slice(0, 500));
            if (isModelUnavailable) {
                res.status(503).json({
                    success: false,
                    error: "模型服务暂时不可用或连接中断，请稍后重试。若多次出现，请检查 Dify 中配置的 LLM 服务是否稳定。",
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: rawError,
                });
            }
            return;
        }

        if (!outputs) {
            res.status(500).json({
                success: false,
                error: "Dify 工作流返回数据格式错误：缺少 outputs",
            });
            return;
        }

        // 构建返回结果
        const result: DifyGenSubFactionsOutput = {
            text1: outputs.text1,
            text2: outputs.text2,
            text3: outputs.text3,
            text4: outputs.text4,
            text5: Array.isArray(outputs.text5) ? outputs.text5 : undefined,
        };

        console.log(LOG_TAG, "success");
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        const msg = error?.message ?? String(error);
        const stack = error?.stack;
        console.error(LOG_TAG, "Error", msg, stack || "");
        if (!res.writableEnded) {
            res.status(500).json({
                success: false,
                error: msg || "生成失败",
            });
        }
    }
}
