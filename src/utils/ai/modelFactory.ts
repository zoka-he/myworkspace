import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatOpenAI } from "@langchain/openai";
import { BaseLanguageModel } from "@langchain/core/language_models/base";

/**
 * DeepSeek 模型配置
 */
export interface DeepSeekModelConfig {
    /** 模型名称 */
    model: "deepseek-chat" | "deepseek-reasoner";
    /** 温度，默认 0.7 */
    temperature?: number;
}

/**
 * OpenRouter 模型配置
 */
export interface OpenRouterModelConfig {
    /** 模型名称，例如 "google/gemini-2.0-flash-exp:free", "openai/gpt-4o" */
    model: string;
    /** 温度，默认 0.7 */
    temperature?: number;
}

/**
 * 创建 DeepSeek 模型实例
 * 
 * @param config - 模型配置
 * @returns DeepSeek 模型实例
 */
export function createDeepSeekModel(config: DeepSeekModelConfig): BaseLanguageModel {
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_API_KEY) {
        throw new Error("DEEPSEEK_API_KEY is not configured");
    }

    const {
        model,
        temperature = 0.7,
    } = config;

    return new ChatDeepSeek({
        apiKey: DEEPSEEK_API_KEY,
        model,
        temperature,
    });
}

/**
 * 创建 OpenRouter 模型实例
 * 
 * @param config - 模型配置
 * @returns OpenRouter 模型实例
 */
export function createOpenRouterModel(config: OpenRouterModelConfig): BaseLanguageModel {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const {
        model,
        temperature = 0.7,
    } = config;

    return new ChatOpenAI({
        model,
        temperature,
        configuration: {
            apiKey: OPENROUTER_API_KEY,
            baseURL: "https://openrouter.ai/api/v1",
        },
    });
}

/**
 * 模型供应商类型
 */
export type ModelProvider = "deepseek" | "openrouter";

/**
 * 通用模型配置（根据供应商自动选择）
 */
export interface ModelConfig {
    /** 供应商类型 */
    provider: ModelProvider;
    /** 模型名称 */
    model?: string;
    /** 温度，默认 0.7 */
    temperature?: number;
}

/**
 * 创建模型实例（通用工厂方法）
 * 
 * @param config - 模型配置
 * @returns 模型实例
 */
export function createModel(config: ModelConfig): BaseLanguageModel {
    const { provider, model, temperature } = config;

    switch (provider) {
        case "deepseek":
            if (!model) {
                throw new Error("model is required for DeepSeek provider");
            }
            return createDeepSeekModel({
                model: model as DeepSeekModelConfig["model"],
                temperature,
            });
        case "openrouter":
            if (!model) {
                throw new Error("model is required for OpenRouter provider");
            }
            return createOpenRouterModel({
                model,
                temperature,
            });
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

