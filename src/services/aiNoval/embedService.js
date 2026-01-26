import { OpenAIEmbeddings } from "@langchain/openai";
import chromaConfig from "@/src/config/chroma";
import ChromaServer from "@/src/server/chroma";
import { ChromaDocument } from "@langchain/community/vectorstores/chroma";

/**
 * 嵌入向量服务
 * 使用硅基流动 API (兼容 OpenAI) 生成文本的嵌入向量
 * 支持在运行时选择不同的 embed 模型
 */
class EmbedService {

    constructor() {
        // 缓存不同模型的 embeddings 实例
        this.embeddingsCache = new Map();
    }

    /**
     * 获取或创建指定模型的 embeddings 实例
     * @param {string} [model] - 模型名称，不传则使用默认配置
     * @returns {OpenAIEmbeddings} embeddings 实例
     * @private
     */
    _getEmbeddings(model) {
        const targetModel = model || chromaConfig.EMBEDDING_MODEL;
        
        // 如果缓存中已有该模型的实例，直接返回
        if (this.embeddingsCache.has(targetModel)) {
            return this.embeddingsCache.get(targetModel);
        }

        const apiKey = chromaConfig.EMBEDDING_API_KEY;
        if (!apiKey) {
            throw new Error('SILICONFLOW_API_KEY is not configured. Please set it in environment variables.');
        }

        const embeddings = new OpenAIEmbeddings({
            model: targetModel,
            configuration: {
                apiKey: apiKey,
                baseURL: chromaConfig.EMBEDDING_BASE_URL,
            },
        });

        // 缓存实例
        this.embeddingsCache.set(targetModel, embeddings);
        
        return embeddings;
    }

    /**
     * 生成单个文本的嵌入向量
     * @param {string} text - 要生成嵌入的文本
     * @param {Object} [options] - 可选配置
     * @param {string} [options.model] - 指定使用的模型，不传则使用默认模型
     * @returns {Promise<number[]>} 嵌入向量
     */
    async embedQuery(text, options = {}) {
        const embeddings = this._getEmbeddings(options.model);

        if (!text || typeof text !== 'string') {
            throw new Error('Invalid input: text must be a non-empty string');
        }

        return await embeddings.embedQuery(text);
    }

    /**
     * 批量生成多个文本的嵌入向量
     * @param {string[]} texts - 要生成嵌入的文本数组
     * @param {Object} [options] - 可选配置
     * @param {string} [options.model] - 指定使用的模型，不传则使用默认模型
     * @returns {Promise<number[][]>} 嵌入向量数组
     */
    async embedDocuments(texts, options = {}) {
        const embeddings = this._getEmbeddings(options.model);

        if (!Array.isArray(texts) || texts.length === 0) {
            throw new Error('Invalid input: texts must be a non-empty array');
        }

        const invalidTexts = texts.filter(t => typeof t !== 'string' || !t);
        if (invalidTexts.length > 0) {
            throw new Error('Invalid input: all texts must be non-empty strings');
        }

        return await embeddings.embedDocuments(texts);
    }

    /**
     * 批量生成嵌入向量，支持大批量分批处理
     * @param {string[]} texts - 要生成嵌入的文本数组
     * @param {Object} [options] - 可选配置
     * @param {number} [options.batchSize] - 每批处理的数量，默认 100
     * @param {string} [options.model] - 指定使用的模型，不传则使用当前模型
     * @returns {Promise<number[][]>} 嵌入向量数组
     */
    async embedDocumentsBatch(texts, options = {}) {
        const { batchSize = 100, model } = options;

        if (!Array.isArray(texts) || texts.length === 0) {
            throw new Error('Invalid input: texts must be a non-empty array');
        }

        const results = [];
        
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const batchEmbeddings = await this.embedDocuments(batch, { model });
            results.push(...batchEmbeddings);
        }

        return results;
    }

    // /**
    //  * 计算两个向量的余弦相似度
    //  * @param {number[]} vectorA - 向量 A
    //  * @param {number[]} vectorB - 向量 B
    //  * @returns {number} 余弦相似度 (范围 -1 到 1)
    //  */
    // cosineSimilarity(vectorA, vectorB) {
    //     if (!Array.isArray(vectorA) || !Array.isArray(vectorB)) {
    //         throw new Error('Invalid input: both vectors must be arrays');
    //     }

    //     if (vectorA.length !== vectorB.length) {
    //         throw new Error('Invalid input: vectors must have the same dimension');
    //     }

    //     const dotProduct = vectorA.reduce((sum, val, i) => sum + val * vectorB[i], 0);
    //     const magnitudeA = Math.sqrt(vectorA.reduce((sum, val) => sum + val * val, 0));
    //     const magnitudeB = Math.sqrt(vectorB.reduce((sum, val) => sum + val * val, 0));

    //     if (magnitudeA === 0 || magnitudeB === 0) {
    //         return 0;
    //     }

    //     return dotProduct / (magnitudeA * magnitudeB);
    // }

    // /**
    //  * 查找与查询文本最相似的文档
    //  * @param {string} query - 查询文本
    //  * @param {string[]} documents - 文档数组
    //  * @param {Object} [options] - 可选配置
    //  * @param {number} [options.topK] - 返回最相似的前 K 个结果，默认 5
    //  * @param {string} [options.model] - 指定使用的模型，不传则使用默认模型
    //  * @returns {Promise<Array<{document: string, similarity: number, index: number}>>} 相似度排序结果
    //  */
    // async findSimilar(query, documents, options = {}) {
    //     const { topK = 5, model } = options;
    //     const queryEmbedding = await this.embedQuery(query, { model });
    //     const docEmbeddings = await this.embedDocuments(documents, { model });

    //     const similarities = documents.map((doc, index) => ({
    //         document: doc,
    //         similarity: this.cosineSimilarity(queryEmbedding, docEmbeddings[index]),
    //         index: index,
    //     }));

    //     // 按相似度降序排序
    //     similarities.sort((a, b) => b.similarity - a.similarity);

    //     return similarities.slice(0, topK);
    // }

    /**
     * 获取向量维度
     * @param {Object} [options] - 可选配置
     * @param {string} [options.model] - 指定使用的模型，不传则使用默认模型
     * @returns {Promise<number>} 向量维度
     */
    async getEmbeddingDimension(options = {}) {
        const testEmbedding = await this.embedQuery('test', options);
        return testEmbedding.length;
    }

    /**
     * 获取当前配置信息
     * @returns {Object} 配置信息
     */
    getConfig() {
        return {
            defaultModel: chromaConfig.EMBEDDING_MODEL,
            baseURL: chromaConfig.EMBEDDING_BASE_URL,
            hasApiKey: !!chromaConfig.EMBEDDING_API_KEY,
            cachedModels: Array.from(this.embeddingsCache.keys()),
        };
    }

    /**
     * 清除模型缓存
     * @param {string} [model] - 指定要清除的模型，不传则清除所有缓存
     */
    clearCache(model) {
        if (model) {
            this.embeddingsCache.delete(model);
        } else {
            this.embeddingsCache.clear();
        }
    }

    getWorldviewCollectionName() {
        return 'ai_noval_worldviews';
    }

    getChapterCollectionName(worldview_id) {
        return `ai_noval_chapters_${worldview_id}`;
    }

    getCharacterCollectionName(worldview_id) {
        return `ai_noval_roles_${worldview_id}`;
    }

    getEventCollectionName(worldview_id) {
        return `ai_noval_events_${worldview_id}`;
    }

    getFactionCollectionName(worldview_id) {
        return `ai_noval_factions_${worldview_id}`;
    }

    getGeoCollectionName(worldview_id) {
        return `ai_noval_geo_${worldview_id}`;
    }

    nomalizeId(id) {
        if (typeof id !== 'string') {
            return String(id);
        }
        return id;
    }

    /**
     * 规范化 metadata，确保符合 ChromaDB 要求
     * ChromaDB 只支持 string、number、boolean 及其数组，不支持 null、undefined、嵌套对象
     * @param {Object} metadata - 原始 metadata
     * @returns {Object} 规范化后的 metadata
     */
    normalizeMetadata(metadata) {
        if (!metadata) return {};
        
        const normalized = {};
        for (const [key, value] of Object.entries(metadata)) {
            // 跳过 null/undefined
            if (value === null || value === undefined) {
                continue;
            }
            // 嵌套对象转 JSON 字符串
            if (typeof value === 'object' && !Array.isArray(value)) {
                normalized[key] = JSON.stringify(value);
            } else if (Array.isArray(value)) {
                // 数组中如果有 null/undefined/对象，需要处理
                const cleanArray = value.filter(v => v !== null && v !== undefined);
                if (cleanArray.length > 0 && typeof cleanArray[0] === 'object') {
                    normalized[key] = JSON.stringify(cleanArray);
                } else {
                    normalized[key] = cleanArray;
                }
            } else {
                normalized[key] = value;
            }
        }
        return normalized;
    }

    async saveWorldviewDocument(worldview_id, document, metadata, embedding_model = chromaConfig.EMBEDDING_MODEL) {
        const embedding = await this.embedQuery(document, { model: embedding_model });
        const chromaServer = ChromaServer.getInstance();
        const collectionName = this.getWorldviewCollectionName();
        const documentId = this.nomalizeId(metadata.id);
        
        // 先删除后创建
        try {
            await chromaServer.deleteById(collectionName, documentId);
        } catch (error) {
            // 如果文档不存在，忽略删除错误
        }
        
        await chromaServer.addDocument(collectionName, {
            id: documentId,
            content: document,
            metadata: this.normalizeMetadata(metadata),
            embedding: embedding,
        });
    }

    async saveChapterDocument(worldview_id, document, metadata, embedding_model = chromaConfig.EMBEDDING_MODEL) {
        const embedding = await this.embedQuery(document, { model: embedding_model });
        const chromaServer = ChromaServer.getInstance();
        const collectionName = this.getChapterCollectionName(worldview_id);
        const documentId = this.nomalizeId(metadata.id);
        
        // 先删除后创建
        try {
            await chromaServer.deleteById(collectionName, documentId);
        } catch (error) {
            // 如果文档不存在，忽略删除错误
        }
        
        await chromaServer.addDocument(collectionName, {
            id: documentId,
            content: document,
            metadata: this.normalizeMetadata(metadata),
            embedding: embedding,
        });
    }

    async saveCharacterDocument(worldview_id, document, metadata, embedding_model = chromaConfig.EMBEDDING_MODEL) {
        const embedding = await this.embedQuery(document, { model: embedding_model });
        const chromaServer = ChromaServer.getInstance();
        const collectionName = this.getCharacterCollectionName(worldview_id);
        const documentId = this.nomalizeId(metadata.id);
        
        // 先删除后创建
        try {
            await chromaServer.deleteById(collectionName, documentId);
        } catch (error) {
            // 如果文档不存在，忽略删除错误
        }
        
        await chromaServer.addDocument(collectionName, {
            id: documentId,
            content: document,
            metadata: this.normalizeMetadata(metadata),
            embedding: embedding,
        });
    }

    async saveEventDocument(worldview_id, document, metadata, embedding_model = chromaConfig.EMBEDDING_MODEL) {
        const embedding = await this.embedQuery(document, { model: embedding_model });
        const chromaServer = ChromaServer.getInstance();
        const collectionName = this.getEventCollectionName(worldview_id);
        const documentId = this.nomalizeId(metadata.id);
        
        // 先删除后创建
        try {
            await chromaServer.deleteById(collectionName, documentId);
        } catch (error) {
            // 如果文档不存在，忽略删除错误
        }
        
        await chromaServer.addDocument(collectionName, {
            id: documentId,
            content: document,
            metadata: this.normalizeMetadata(metadata),
            embedding: embedding,
        });
    }

    async saveFactionDocument(worldview_id, document, metadata, embedding_model = chromaConfig.EMBEDDING_MODEL) {
        const embedding = await this.embedQuery(document, { model: embedding_model });
        const chromaServer = ChromaServer.getInstance();
        const collectionName = this.getFactionCollectionName(worldview_id);
        const documentId = this.nomalizeId(metadata.id);
        
        // 先删除后创建
        try {
            await chromaServer.deleteById(collectionName, documentId);
        } catch (error) {
            // 如果文档不存在，忽略删除错误
        }
        
        await chromaServer.addDocument(collectionName, {
            id: documentId,
            content: document,
            metadata: this.normalizeMetadata(metadata),
            embedding: embedding,
        });
    }

    async saveGeoDocument(worldview_id, document, metadata, embedding_model = chromaConfig.EMBEDDING_MODEL) {
        const embedding = await this.embedQuery(document, { model: embedding_model });
        const chromaServer = ChromaServer.getInstance();
        const collectionName = this.getGeoCollectionName(worldview_id);
        const documentId = this.nomalizeId(metadata.code);
        
        // 先删除后创建
        try {
            await chromaServer.deleteById(collectionName, documentId);
        } catch (error) {
            // 如果文档不存在，忽略删除错误
        }
        
        await chromaServer.addDocument(collectionName, {
            id: documentId,
            content: document,
            metadata: this.normalizeMetadata(metadata),
            embedding: embedding,
        });
    }

    async queryWorldviewDocument(worldview_id, document) {
        const chromaServer = ChromaServer.getInstance();
        const collection = await chromaServer.getCollection(this.getWorldviewCollectionName());
        if (!collection) {
            return [];
        }
        
    }

    async queryChapterDocument(worldview_id, document) {
        const chromaServer = ChromaServer.getInstance();
        const collection = await chromaServer.getCollection(this.getChapterCollectionName(worldview_id));
        if (!collection) {
            return [];
        }
    }

    async queryCharacterDocument(worldview_id, document) {
        const chromaServer = ChromaServer.getInstance();
        const collection = await chromaServer.getCollection(this.getCharacterCollectionName(worldview_id));
        if (!collection) {
            return [];
        }
    }

    async queryEventDocument(worldview_id, document) {
        const chromaServer = ChromaServer.getInstance();
        const collection = await chromaServer.getCollection(this.getEventCollectionName(worldview_id));
        if (!collection) {
            return [];
        }
    }

    async queryFactionDocument(worldview_id, document) {
        const chromaServer = ChromaServer.getInstance();
        const collection = await chromaServer.getCollection(this.getFactionCollectionName(worldview_id));
        if (!collection) {
            return [];
        }
    }

    async queryGeoDocument(worldview_id, document) {
        const chromaServer = ChromaServer.getInstance();
        const collection = await chromaServer.getCollection(this.getGeoCollectionName(worldview_id));
        if (!collection) {
            return [];
        }
    }

    // ==================== 获取 Collection 所有 Metadata ====================

    /**
     * 获取角色 collection 中所有文档的 metadata
     * @param {number|string} worldview_id - 世界观 ID
     * @param {number} [limit=1000] - 最大返回数量
     * @returns {Promise<Array<{id: string, metadata: Object}>>}
     */
    async getCharacterMetadataList(worldview_id, limit = 1000) {
        const chromaServer = ChromaServer.getInstance();
        const collectionName = this.getCharacterCollectionName(worldview_id);
        
        try {
            const exists = await chromaServer.collectionExists(collectionName);
            if (!exists) {
                return [];
            }
            return await chromaServer.listAllMetadata(collectionName, limit);
        } catch (error) {
            console.error(`[EmbedService] 获取角色 metadata 列表失败:`, error);
            return [];
        }
    }

    /**
     * 获取事件 collection 中所有文档的 metadata
     * @param {number|string} worldview_id - 世界观 ID
     * @param {number} [limit=1000] - 最大返回数量
     * @returns {Promise<Array<{id: string, metadata: Object}>>}
     */
    async getEventMetadataList(worldview_id, limit = 1000) {
        const chromaServer = ChromaServer.getInstance();
        const collectionName = this.getEventCollectionName(worldview_id);
        
        try {
            const exists = await chromaServer.collectionExists(collectionName);
            if (!exists) {
                return [];
            }
            return await chromaServer.listAllMetadata(collectionName, limit);
        } catch (error) {
            console.error(`[EmbedService] 获取事件 metadata 列表失败:`, error);
            return [];
        }
    }

    /**
     * 获取势力 collection 中所有文档的 metadata
     * @param {number|string} worldview_id - 世界观 ID
     * @param {number} [limit=1000] - 最大返回数量
     * @returns {Promise<Array<{id: string, metadata: Object}>>}
     */
    async getFactionMetadataList(worldview_id, limit = 1000) {
        const chromaServer = ChromaServer.getInstance();
        const collectionName = this.getFactionCollectionName(worldview_id);
        
        try {
            const exists = await chromaServer.collectionExists(collectionName);
            if (!exists) {
                return [];
            }
            return await chromaServer.listAllMetadata(collectionName, limit);
        } catch (error) {
            console.error(`[EmbedService] 获取势力 metadata 列表失败:`, error);
            return [];
        }
    }

    /**
     * 获取地理 collection 中所有文档的 metadata
     * @param {number|string} worldview_id - 世界观 ID
     * @param {number} [limit=1000] - 最大返回数量
     * @returns {Promise<Array<{id: string, metadata: Object}>>}
     */
    async getGeoMetadataList(worldview_id, limit = 1000) {
        const chromaServer = ChromaServer.getInstance();
        const collectionName = this.getGeoCollectionName(worldview_id);
        
        try {
            const exists = await chromaServer.collectionExists(collectionName);
            if (!exists) {
                return [];
            }
            return await chromaServer.listAllMetadata(collectionName, limit);
        } catch (error) {
            console.error(`[EmbedService] 获取地理 metadata 列表失败:`, error);
            return [];
        }
    }

    /**
     * 获取章节 collection 中所有文档的 metadata
     * @param {number|string} worldview_id - 世界观 ID
     * @param {number} [limit=1000] - 最大返回数量
     * @returns {Promise<Array<{id: string, metadata: Object}>>}
     */
    async getChapterMetadataList(worldview_id, limit = 1000) {
        const chromaServer = ChromaServer.getInstance();
        const collectionName = this.getChapterCollectionName(worldview_id);
        
        try {
            const exists = await chromaServer.collectionExists(collectionName);
            if (!exists) {
                return [];
            }
            return await chromaServer.listAllMetadata(collectionName, limit);
        } catch (error) {
            console.error(`[EmbedService] 获取章节 metadata 列表失败:`, error);
            return [];
        }
    }
}

// 导出单例实例和类
const embedService = new EmbedService();

export default EmbedService;
export { embedService };


