import { OpenAIEmbeddings } from "@langchain/openai";
import chromaConfig from "@/src/config/chroma";

/**
 * 嵌入向量服务
 * 使用硅基流动 API (兼容 OpenAI) 生成文本的嵌入向量
 */
class EmbedService {

    constructor() {
        this.embeddings = null;
        this.initialized = false;
    }

    /**
     * 初始化 embeddings 实例
     * @private
     */
    _initEmbeddings() {
        if (this.initialized) {
            return;
        }

        const apiKey = chromaConfig.EMBEDDING_API_KEY;
        if (!apiKey) {
            throw new Error('SILICONFLOW_API_KEY is not configured. Please set it in environment variables.');
        }

        this.embeddings = new OpenAIEmbeddings({
            model: chromaConfig.EMBEDDING_MODEL,
            configuration: {
                apiKey: apiKey,
                baseURL: chromaConfig.EMBEDDING_BASE_URL,
            },
        });

        this.initialized = true;
    }

    /**
     * 生成单个文本的嵌入向量
     * @param {string} text - 要生成嵌入的文本
     * @returns {Promise<number[]>} 嵌入向量
     */
    async embedQuery(text) {
        this._initEmbeddings();

        if (!text || typeof text !== 'string') {
            throw new Error('Invalid input: text must be a non-empty string');
        }

        return await this.embeddings.embedQuery(text);
    }

    /**
     * 批量生成多个文本的嵌入向量
     * @param {string[]} texts - 要生成嵌入的文本数组
     * @returns {Promise<number[][]>} 嵌入向量数组
     */
    async embedDocuments(texts) {
        this._initEmbeddings();

        if (!Array.isArray(texts) || texts.length === 0) {
            throw new Error('Invalid input: texts must be a non-empty array');
        }

        const invalidTexts = texts.filter(t => typeof t !== 'string' || !t);
        if (invalidTexts.length > 0) {
            throw new Error('Invalid input: all texts must be non-empty strings');
        }

        return await this.embeddings.embedDocuments(texts);
    }

    /**
     * 批量生成嵌入向量，支持大批量分批处理
     * @param {string[]} texts - 要生成嵌入的文本数组
     * @param {number} batchSize - 每批处理的数量，默认 100
     * @returns {Promise<number[][]>} 嵌入向量数组
     */
    async embedDocumentsBatch(texts, batchSize = 100) {
        this._initEmbeddings();

        if (!Array.isArray(texts) || texts.length === 0) {
            throw new Error('Invalid input: texts must be a non-empty array');
        }

        const results = [];
        
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const batchEmbeddings = await this.embedDocuments(batch);
            results.push(...batchEmbeddings);
        }

        return results;
    }

    /**
     * 计算两个向量的余弦相似度
     * @param {number[]} vectorA - 向量 A
     * @param {number[]} vectorB - 向量 B
     * @returns {number} 余弦相似度 (范围 -1 到 1)
     */
    cosineSimilarity(vectorA, vectorB) {
        if (!Array.isArray(vectorA) || !Array.isArray(vectorB)) {
            throw new Error('Invalid input: both vectors must be arrays');
        }

        if (vectorA.length !== vectorB.length) {
            throw new Error('Invalid input: vectors must have the same dimension');
        }

        const dotProduct = vectorA.reduce((sum, val, i) => sum + val * vectorB[i], 0);
        const magnitudeA = Math.sqrt(vectorA.reduce((sum, val) => sum + val * val, 0));
        const magnitudeB = Math.sqrt(vectorB.reduce((sum, val) => sum + val * val, 0));

        if (magnitudeA === 0 || magnitudeB === 0) {
            return 0;
        }

        return dotProduct / (magnitudeA * magnitudeB);
    }

    /**
     * 查找与查询文本最相似的文档
     * @param {string} query - 查询文本
     * @param {string[]} documents - 文档数组
     * @param {number} topK - 返回最相似的前 K 个结果
     * @returns {Promise<Array<{document: string, similarity: number, index: number}>>} 相似度排序结果
     */
    async findSimilar(query, documents, topK = 5) {
        const queryEmbedding = await this.embedQuery(query);
        const docEmbeddings = await this.embedDocuments(documents);

        const similarities = documents.map((doc, index) => ({
            document: doc,
            similarity: this.cosineSimilarity(queryEmbedding, docEmbeddings[index]),
            index: index,
        }));

        // 按相似度降序排序
        similarities.sort((a, b) => b.similarity - a.similarity);

        return similarities.slice(0, topK);
    }

    /**
     * 获取向量维度
     * @returns {Promise<number>} 向量维度
     */
    async getEmbeddingDimension() {
        const testEmbedding = await this.embedQuery('test');
        return testEmbedding.length;
    }

    /**
     * 获取当前配置信息
     * @returns {Object} 配置信息
     */
    getConfig() {
        return {
            model: chromaConfig.EMBEDDING_MODEL,
            baseURL: chromaConfig.EMBEDDING_BASE_URL,
            hasApiKey: !!chromaConfig.EMBEDDING_API_KEY,
        };
    }
}

// 导出单例实例和类
const embedService = new EmbedService();

export default EmbedService;
export { embedService };
