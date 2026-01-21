/**
 * ChromaDB 服务层
 * 提供基础的增删改查操作
 */

import { ChromaClient, Collection, IncludeEnum, EmbeddingFunction } from "chromadb";
import chromaConfig from "@/src/config/chroma";

/**
 * 空的 Embedding Function
 * 用于禁用 chromadb 的默认 embedding 功能
 * 因为我们自己提供 embedding 向量，不需要 chromadb 自动生成
 */
class NoopEmbeddingFunction implements EmbeddingFunction {
    async generate(texts: string[]): Promise<number[][]> {
        // 返回空数组，因为我们总是自己提供 embedding
        // 这个方法实际上不会被调用，因为我们在 add/update/query 时都显式提供了 embeddings
        throw new Error(
            "NoopEmbeddingFunction.generate() should not be called. " +
            "Please provide embeddings explicitly when adding/updating/querying documents."
        );
    }
}

// 单例 embedding function 实例
const noopEmbeddingFunction = new NoopEmbeddingFunction();

/**
 * 文档接口
 */
/**
 * 文档输入接口（用于添加/更新操作）
 */
export interface ChromaDocumentInput {
    id: string;
    content: string;
    metadata?: Record<string, any>;
    embedding: number[];
}

/**
 * 文档输出接口（用于查询返回）
 */
export interface ChromaDocument {
    id: string;
    content: string;
    metadata?: Record<string, any>;
    embedding?: number[];
}

/**
 * 查询结果接口
 */
export interface QueryResult {
    id: string;
    content: string;
    metadata: Record<string, any> | null;
    distance: number;
}

/**
 * 批量操作结果
 */
export interface BatchResult {
    success: boolean;
    count: number;
    ids: string[];
    errors?: string[];
}

/**
 * ChromaDB 服务类
 * 封装 ChromaDB 的基础操作
 */
class ChromaService {
    private client: ChromaClient;
    private initialized: boolean = false;

    constructor() {
        this.client = new ChromaClient({
            path: chromaConfig.CHROMA_URL,
        });
    }

    /**
     * 检查服务连接状态
     */
    async checkHealth(): Promise<boolean> {
        try {
            await this.client.heartbeat();
            this.initialized = true;
            return true;
        } catch (error) {
            console.error("[ChromaService] 连接检查失败:", error);
            return false;
        }
    }

    /**
     * 获取或创建集合
     * 使用 NoopEmbeddingFunction 来避免 DefaultEmbeddingFunction 警告
     */
    async getCollection(collectionName: string): Promise<Collection> {
        try {
            return await this.client.getOrCreateCollection({
                name: collectionName,
                embeddingFunction: noopEmbeddingFunction,
            });
        } catch (error) {
            console.error(`[ChromaService] 获取集合 "${collectionName}" 失败:`, error);
            throw error;
        }
    }

    // ==================== 增 (Create) ====================

    /**
     * 添加单个文档
     * @param collectionName 集合名称
     * @param document 文档对象
     */
    async addDocument(
        collectionName: string,
        document: ChromaDocumentInput
    ): Promise<string> {
        const collection = await this.getCollection(collectionName);

        await collection.add({
            ids: [document.id],
            embeddings: [document.embedding],
            documents: [document.content],
            metadatas: document.metadata ? [document.metadata] : undefined,
        });

        return document.id;
    }

    /**
     * 批量添加文档
     * @param collectionName 集合名称
     * @param documents 文档数组
     */
    async addDocuments(
        collectionName: string,
        documents: ChromaDocumentInput[]
    ): Promise<BatchResult> {
        if (documents.length === 0) {
            return { success: true, count: 0, ids: [] };
        }

        const collection = await this.getCollection(collectionName);

        const ids = documents.map(doc => doc.id);
        const contents = documents.map(doc => doc.content);
        const metadatas = documents.map(doc => doc.metadata || {});
        const embeddings = documents.map(doc => doc.embedding);

        await collection.add({
            ids,
            embeddings,
            documents: contents,
            metadatas,
        });

        return {
            success: true,
            count: documents.length,
            ids,
        };
    }

    // ==================== 删 (Delete) ====================

    /**
     * 根据 ID 删除单个文档
     * @param collectionName 集合名称
     * @param id 文档 ID
     */
    async deleteById(collectionName: string, id: string): Promise<boolean> {
        const collection = await this.getCollection(collectionName);

        await collection.delete({
            ids: [id],
        });

        return true;
    }

    /**
     * 根据 ID 批量删除文档
     * @param collectionName 集合名称
     * @param ids 文档 ID 数组
     */
    async deleteByIds(collectionName: string, ids: string[]): Promise<BatchResult> {
        if (ids.length === 0) {
            return { success: true, count: 0, ids: [] };
        }

        const collection = await this.getCollection(collectionName);

        await collection.delete({
            ids,
        });

        return {
            success: true,
            count: ids.length,
            ids,
        };
    }

    /**
     * 根据条件删除文档
     * @param collectionName 集合名称
     * @param where 过滤条件
     */
    async deleteByFilter(
        collectionName: string,
        where: Record<string, any>
    ): Promise<boolean> {
        const collection = await this.getCollection(collectionName);

        await collection.delete({
            where,
        });

        return true;
    }

    /**
     * 清空集合中的所有文档
     * @param collectionName 集合名称
     */
    async clearCollection(collectionName: string): Promise<boolean> {
        try {
            // 删除并重新创建集合是清空的最快方式
            await this.client.deleteCollection({ name: collectionName });
            await this.client.createCollection({ 
                name: collectionName,
                embeddingFunction: noopEmbeddingFunction,
            });
            return true;
        } catch (error) {
            console.error(`[ChromaService] 清空集合 "${collectionName}" 失败:`, error);
            throw error;
        }
    }

    // ==================== 改 (Update) ====================

    /**
     * 更新单个文档
     * @param collectionName 集合名称
     * @param document 文档对象（必须包含 id）
     */
    async updateDocument(
        collectionName: string,
        document: ChromaDocumentInput
    ): Promise<boolean> {
        const collection = await this.getCollection(collectionName);

        await collection.update({
            ids: [document.id],
            embeddings: [document.embedding],
            documents: [document.content],
            metadatas: document.metadata ? [document.metadata] : undefined,
        });

        return true;
    }

    /**
     * 批量更新文档
     * @param collectionName 集合名称
     * @param documents 文档数组
     */
    async updateDocuments(
        collectionName: string,
        documents: ChromaDocumentInput[]
    ): Promise<BatchResult> {
        if (documents.length === 0) {
            return { success: true, count: 0, ids: [] };
        }

        const collection = await this.getCollection(collectionName);

        const ids = documents.map(doc => doc.id);
        const contents = documents.map(doc => doc.content);
        const metadatas = documents.map(doc => doc.metadata || {});
        const embeddings = documents.map(doc => doc.embedding);

        await collection.update({
            ids,
            embeddings,
            documents: contents,
            metadatas,
        });

        return {
            success: true,
            count: documents.length,
            ids,
        };
    }

    /**
     * 更新或插入文档（如果存在则更新，不存在则插入）
     * @param collectionName 集合名称
     * @param document 文档对象
     */
    async upsertDocument(
        collectionName: string,
        document: ChromaDocumentInput
    ): Promise<string> {
        const collection = await this.getCollection(collectionName);

        await collection.upsert({
            ids: [document.id],
            embeddings: [document.embedding],
            documents: [document.content],
            metadatas: document.metadata ? [document.metadata] : undefined,
        });

        return document.id;
    }

    /**
     * 批量更新或插入文档
     * @param collectionName 集合名称
     * @param documents 文档数组
     */
    async upsertDocuments(
        collectionName: string,
        documents: ChromaDocumentInput[]
    ): Promise<BatchResult> {
        if (documents.length === 0) {
            return { success: true, count: 0, ids: [] };
        }

        const collection = await this.getCollection(collectionName);

        const ids = documents.map(doc => doc.id);
        const contents = documents.map(doc => doc.content);
        const metadatas = documents.map(doc => doc.metadata || {});
        const embeddings = documents.map(doc => doc.embedding);

        await collection.upsert({
            ids,
            embeddings,
            documents: contents,
            metadatas,
        });

        return {
            success: true,
            count: documents.length,
            ids,
        };
    }

    // ==================== 查 (Query) ====================

    /**
     * 根据 ID 获取单个文档
     * @param collectionName 集合名称
     * @param id 文档 ID
     */
    async getById(collectionName: string, id: string): Promise<ChromaDocument | null> {
        const collection = await this.getCollection(collectionName);

        const result = await collection.get({
            ids: [id],
            include: [IncludeEnum.documents, IncludeEnum.metadatas, IncludeEnum.embeddings],
        });

        if (!result.ids || result.ids.length === 0) {
            return null;
        }

        return {
            id: result.ids[0],
            content: result.documents?.[0] || "",
            metadata: result.metadatas?.[0] || {},
            embedding: result.embeddings?.[0] as number[] | undefined,
        };
    }

    /**
     * 根据 ID 批量获取文档
     * @param collectionName 集合名称
     * @param ids 文档 ID 数组
     */
    async getByIds(collectionName: string, ids: string[]): Promise<ChromaDocument[]> {
        if (ids.length === 0) {
            return [];
        }

        const collection = await this.getCollection(collectionName);

        const result = await collection.get({
            ids,
            include: [IncludeEnum.documents, IncludeEnum.metadatas],
        });

        return result.ids.map((id, index) => ({
            id,
            content: result.documents?.[index] || "",
            metadata: result.metadatas?.[index] || {},
        }));
    }

    /**
     * 根据条件查询文档
     * @param collectionName 集合名称
     * @param where 过滤条件
     * @param limit 返回数量限制
     */
    async getByFilter(
        collectionName: string,
        where: Record<string, any>,
        limit?: number
    ): Promise<ChromaDocument[]> {
        const collection = await this.getCollection(collectionName);

        const result = await collection.get({
            where,
            limit,
            include: [IncludeEnum.documents, IncludeEnum.metadatas],
        });

        return result.ids.map((id, index) => ({
            id,
            content: result.documents?.[index] || "",
            metadata: result.metadatas?.[index] || {},
        }));
    }

    /**
     * 相似度搜索
     * @param collectionName 集合名称
     * @param embedding 查询向量
     * @param k 返回结果数量
     * @param where 可选的过滤条件
     */
    async similaritySearch(
        collectionName: string,
        embedding: number[],
        k: number = 5,
        where?: Record<string, any>
    ): Promise<QueryResult[]> {
        const collection = await this.getCollection(collectionName);

        const result = await collection.query({
            queryEmbeddings: [embedding],
            nResults: k,
            where,
            include: [IncludeEnum.documents, IncludeEnum.metadatas, IncludeEnum.distances],
        });

        if (!result.ids || result.ids.length === 0 || !result.ids[0]) {
            return [];
        }

        return result.ids[0].map((id, index) => ({
            id,
            content: result.documents?.[0]?.[index] || "",
            metadata: result.metadatas?.[0]?.[index] || null,
            distance: result.distances?.[0]?.[index] || 0,
        }));
    }

    /**
     * 获取集合中的文档数量
     * @param collectionName 集合名称
     */
    async count(collectionName: string): Promise<number> {
        const collection = await this.getCollection(collectionName);
        return await collection.count();
    }

    /**
     * 分页获取文档
     * @param collectionName 集合名称
     * @param offset 偏移量
     * @param limit 每页数量
     */
    async list(
        collectionName: string,
        offset: number = 0,
        limit: number = 10
    ): Promise<{ documents: ChromaDocument[]; total: number }> {
        const collection = await this.getCollection(collectionName);

        const total = await collection.count();
        const result = await collection.get({
            limit,
            offset,
            include: [IncludeEnum.documents, IncludeEnum.metadatas],
        });

        const documents = result.ids.map((id, index) => ({
            id,
            content: result.documents?.[index] || "",
            metadata: result.metadatas?.[index] || {},
        }));

        return { documents, total };
    }

    // ==================== 集合管理 ====================

    /**
     * 列出所有集合
     */
    async listCollections(): Promise<string[]> {
        const collections = await this.client.listCollections();
        return collections.map(c => c.name);
    }

    /**
     * 删除集合
     * @param collectionName 集合名称
     */
    async deleteCollection(collectionName: string): Promise<boolean> {
        await this.client.deleteCollection({ name: collectionName });
        return true;
    }

    /**
     * 检查集合是否存在
     * @param collectionName 集合名称
     */
    async collectionExists(collectionName: string): Promise<boolean> {
        const collections = await this.listCollections();
        return collections.includes(collectionName);
    }

    static getInstance() {
        return getInstance();
    }
}

// 导出单例实例
export const chromaService = new ChromaService();

function getInstance() {
    return chromaService;
}

// 导出类以便需要时创建新实例
export default ChromaService;
