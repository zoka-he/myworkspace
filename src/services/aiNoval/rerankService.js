import chromaConfig from "@/src/config/chroma";

/**
 * 重排序服务
 * 使用硅基流动 API 对文档进行重排序
 * 支持在运行时选择不同的 rerank 模型
 */
class RerankService {
    constructor() {
        this.apiKey = chromaConfig.EMBEDDING_API_KEY;
        this.baseURL = chromaConfig.EMBEDDING_BASE_URL || 'https://api.siliconflow.cn/v1';
        this.defaultModel = 'Qwen/Qwen3-Reranker-8B'; // 默认重排序模型
    }

    /**
     * 调用硅基流动重排序 API
     * @param {string} query - 查询文本
     * @param {string[]} documents - 待排序的文档数组
     * @param {Object} [options] - 可选配置
     * @param {string} [options.model] - 指定使用的模型，不传则使用默认模型
     * @param {number} [options.topK] - 返回前 K 个结果，不传则返回所有结果
     * @returns {Promise<Array<{document: string, index: number, relevance_score: number}>>} 重排序结果
     */
    async rerank(query, documents, options = {}) {
        const { model = this.defaultModel, topK } = options;

        if (!this.apiKey) {
            throw new Error('SILICONFLOW_API_KEY is not configured. Please set it in environment variables.');
        }

        if (!query || typeof query !== 'string') {
            throw new Error('Invalid input: query must be a non-empty string');
        }

        if (!Array.isArray(documents) || documents.length === 0) {
            throw new Error('Invalid input: documents must be a non-empty array');
        }

        const invalidDocs = documents.filter(d => typeof d !== 'string' || !d);
        if (invalidDocs.length > 0) {
            throw new Error('Invalid input: all documents must be non-empty strings');
        }

        try {
            const response = await fetch(`${this.baseURL}/rerank`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: model,
                    query: query,
                    documents: documents,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`重排序 API 调用失败: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            // 转换结果格式，从 {document: {text: "..."}, index, relevance_score} 转换为 {document: "...", index, relevance_score}
            const results = data.results.map(result => ({
                document: result.document?.text || result.document || documents[result.index],
                index: result.index,
                relevance_score: result.relevance_score,
            }));

            // 如果指定了 topK，只返回前 K 个结果
            if (topK && topK > 0) {
                return results.slice(0, topK);
            }

            return results;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(`重排序服务调用失败: ${error.message || error}`);
        }
    }

    /**
     * 批量重排序，支持大批量分批处理
     * @param {string} query - 查询文本
     * @param {string[]} documents - 待排序的文档数组
     * @param {Object} [options] - 可选配置
     * @param {number} [options.batchSize] - 每批处理的数量，默认 100
     * @param {string} [options.model] - 指定使用的模型，不传则使用默认模型
     * @param {number} [options.topK] - 返回前 K 个结果，不传则返回所有结果
     * @returns {Promise<Array<{document: string, index: number, relevance_score: number}>>} 重排序结果
     */
    async rerankBatch(query, documents, options = {}) {
        const { batchSize = 100, model, topK } = options;

        if (!Array.isArray(documents) || documents.length === 0) {
            throw new Error('Invalid input: documents must be a non-empty array');
        }

        // 如果文档数量小于等于批次大小，直接调用单次重排序
        if (documents.length <= batchSize) {
            return await this.rerank(query, documents, { model, topK });
        }

        // 分批处理
        const allResults = [];
        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            const batchResults = await this.rerank(query, batch, { model });
            
            // 调整索引，使其对应原始文档数组的索引
            const adjustedResults = batchResults.map(result => ({
                ...result,
                index: result.index + i, // 调整索引
            }));
            
            allResults.push(...adjustedResults);
        }

        // 按相关性分数降序排序
        allResults.sort((a, b) => b.relevance_score - a.relevance_score);

        // 如果指定了 topK，只返回前 K 个结果
        if (topK && topK > 0) {
            return allResults.slice(0, topK);
        }

        return allResults;
    }

    /**
     * 获取当前配置信息
     * @returns {Object} 配置信息
     */
    getConfig() {
        return {
            defaultModel: this.defaultModel,
            baseURL: this.baseURL,
            hasApiKey: !!this.apiKey,
        };
    }

    /**
     * 设置默认模型
     * @param {string} model - 模型名称
     */
    setDefaultModel(model) {
        if (!model || typeof model !== 'string') {
            throw new Error('Invalid input: model must be a non-empty string');
        }
        this.defaultModel = model;
    }
}

// 导出单例实例和类
const rerankService = new RerankService();

export default RerankService;
export { rerankService };
