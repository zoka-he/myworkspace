/**
 * Chroma 向量数据库工具类
 * 提供集合管理、文档存储和相似度搜索功能
 */

import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChromaClient } from "chromadb";
import chromaConfig from "@/src/config/chroma";

// 创建嵌入模型实例
const embeddings = new OpenAIEmbeddings({
    model: chromaConfig.EMBEDDING_MODEL,
    configuration: {
        apiKey: chromaConfig.EMBEDDING_API_KEY,
        baseURL: chromaConfig.EMBEDDING_BASE_URL,
    },
});

// 创建 Chroma 客户端
const chromaClient = new ChromaClient({
    path: chromaConfig.CHROMA_URL,
});

/**
 * 集合元数据定义
 */
interface CollectionMetadata {
    name: string;
    description: string;
    // 嵌入向量维度
    dimension?: number;
}

/**
 * 集合配置映射
 */
const COLLECTION_METADATA: Record<string, CollectionMetadata> = {
    [chromaConfig.COLLECTIONS.CHAPTERS]: {
        name: chromaConfig.COLLECTIONS.CHAPTERS,
        description: '小说章节内容向量存储，用于章节内容的语义搜索',
    },
    [chromaConfig.COLLECTIONS.ROLES]: {
        name: chromaConfig.COLLECTIONS.ROLES,
        description: '角色信息向量存储，包含角色描述、背景等',
    },
    [chromaConfig.COLLECTIONS.WORLDVIEWS]: {
        name: chromaConfig.COLLECTIONS.WORLDVIEWS,
        description: '世界观内容向量存储，包含世界设定、规则等',
    },
    [chromaConfig.COLLECTIONS.TIMELINE_EVENTS]: {
        name: chromaConfig.COLLECTIONS.TIMELINE_EVENTS,
        description: '时间线事件向量存储，用于事件搜索和关联',
    },
    [chromaConfig.COLLECTIONS.GEO_LOCATIONS]: {
        name: chromaConfig.COLLECTIONS.GEO_LOCATIONS,
        description: '地理位置向量存储，包含地点描述和特征',
    },
    [chromaConfig.COLLECTIONS.FACTIONS]: {
        name: chromaConfig.COLLECTIONS.FACTIONS,
        description: '势力/阵营向量存储，包含势力描述、关系等',
    },
};

/**
 * Chroma 集合管理类
 */
export class ChromaCollectionManager {
    private client: ChromaClient;

    constructor() {
        this.client = chromaClient;
    }

    /**
     * 检查 Chroma 服务是否可用
     */
    async checkConnection(): Promise<boolean> {
        try {
            await this.client.heartbeat();
            return true;
        } catch (error) {
            console.error('Chroma 连接失败:', error);
            return false;
        }
    }

    /**
     * 获取所有集合列表
     */
    async listCollections(): Promise<string[]> {
        try {
            const collections = await this.client.listCollections();
            return collections.map(c => c.name);
        } catch (error) {
            console.error('获取集合列表失败:', error);
            throw error;
        }
    }

    /**
     * 检查集合是否存在
     */
    async collectionExists(collectionName: string): Promise<boolean> {
        const collections = await this.listCollections();
        return collections.includes(collectionName);
    }

    /**
     * 创建单个集合
     */
    async createCollection(collectionName: string): Promise<void> {
        try {
            const exists = await this.collectionExists(collectionName);
            if (exists) {
                console.log(`集合 "${collectionName}" 已存在，跳过创建`);
                return;
            }

            await this.client.createCollection({
                name: collectionName,
                metadata: COLLECTION_METADATA[collectionName] || { name: collectionName, description: '' },
            });
            console.log(`集合 "${collectionName}" 创建成功`);
        } catch (error) {
            console.error(`创建集合 "${collectionName}" 失败:`, error);
            throw error;
        }
    }

    /**
     * 获取或创建集合
     */
    async getOrCreateCollection(collectionName: string) {
        try {
            const collection = await this.client.getOrCreateCollection({
                name: collectionName,
                metadata: COLLECTION_METADATA[collectionName] || { name: collectionName, description: '' },
            });
            return collection;
        } catch (error) {
            console.error(`获取/创建集合 "${collectionName}" 失败:`, error);
            throw error;
        }
    }

    /**
     * 删除集合
     */
    async deleteCollection(collectionName: string): Promise<void> {
        try {
            await this.client.deleteCollection({ name: collectionName });
            console.log(`集合 "${collectionName}" 已删除`);
        } catch (error) {
            console.error(`删除集合 "${collectionName}" 失败:`, error);
            throw error;
        }
    }

    /**
     * 获取集合信息
     */
    async getCollectionInfo(collectionName: string) {
        try {
            const collection = await this.client.getCollection({ name: collectionName });
            const count = await collection.count();
            return {
                name: collectionName,
                count,
                metadata: COLLECTION_METADATA[collectionName] || null,
            };
        } catch (error) {
            console.error(`获取集合信息失败:`, error);
            throw error;
        }
    }

    /**
     * 初始化所有预定义的集合
     * 检测并创建所有需要的集合
     */
    async initAllCollections(): Promise<{ created: string[]; existing: string[]; failed: string[] }> {
        const result = {
            created: [] as string[],
            existing: [] as string[],
            failed: [] as string[],
        };

        const collectionNames = Object.values(chromaConfig.COLLECTIONS);

        for (const name of collectionNames) {
            try {
                const exists = await this.collectionExists(name);
                if (exists) {
                    result.existing.push(name);
                    console.log(`✓ 集合 "${name}" 已存在`);
                } else {
                    await this.createCollection(name);
                    result.created.push(name);
                    console.log(`✓ 集合 "${name}" 创建成功`);
                }
            } catch (error) {
                result.failed.push(name);
                console.error(`✗ 集合 "${name}" 处理失败:`, error);
            }
        }

        return result;
    }

    /**
     * 获取所有集合的状态报告
     */
    async getCollectionsStatus(): Promise<Array<{ name: string; exists: boolean; count?: number }>> {
        const collectionNames = Object.values(chromaConfig.COLLECTIONS);
        const existingCollections = await this.listCollections();
        const status = [];

        for (const name of collectionNames) {
            const exists = existingCollections.includes(name);
            let count: number | undefined;

            if (exists) {
                try {
                    const info = await this.getCollectionInfo(name);
                    count = info.count;
                } catch {
                    count = undefined;
                }
            }

            status.push({ name, exists, count });
        }

        return status;
    }
}

/**
 * Chroma 向量存储服务类
 * 提供文档存储和搜索功能
 */
export class ChromaVectorStore {
    private collectionName: string;
    private vectorStore: Chroma | null = null;

    constructor(collectionName: string) {
        this.collectionName = collectionName;
    }

    /**
     * 获取向量存储实例
     */
    async getVectorStore(): Promise<Chroma> {
        if (!this.vectorStore) {
            this.vectorStore = await Chroma.fromExistingCollection(embeddings, {
                collectionName: this.collectionName,
                url: chromaConfig.CHROMA_URL,
            });
        }
        return this.vectorStore;
    }

    /**
     * 添加文档到向量存储
     */
    async addDocuments(
        documents: Array<{ content: string; metadata: Record<string, any> }>
    ): Promise<string[]> {
        const vectorStore = await this.getVectorStore();

        const docs = documents.map(doc => ({
            pageContent: doc.content,
            metadata: doc.metadata,
        }));

        const ids = await vectorStore.addDocuments(docs);
        return ids;
    }

    /**
     * 相似度搜索
     */
    async similaritySearch(
        query: string,
        k: number = 5,
        filter?: Record<string, any>
    ) {
        const vectorStore = await this.getVectorStore();
        return vectorStore.similaritySearch(query, k, filter);
    }

    /**
     * 带分数的相似度搜索
     */
    async similaritySearchWithScore(
        query: string,
        k: number = 5,
        filter?: Record<string, any>
    ) {
        const vectorStore = await this.getVectorStore();
        return vectorStore.similaritySearchWithScore(query, k, filter);
    }

    /**
     * 根据 ID 删除文档
     */
    async deleteByIds(ids: string[]): Promise<void> {
        const vectorStore = await this.getVectorStore();
        await vectorStore.delete({ ids });
    }

    /**
     * 根据过滤条件删除文档
     */
    async deleteByFilter(filter: Record<string, any>): Promise<void> {
        const vectorStore = await this.getVectorStore();
        await vectorStore.delete({ filter });
    }
}

// 导出单例实例
export const collectionManager = new ChromaCollectionManager();

// 导出便捷工厂函数
export function createVectorStore(collectionName: string): ChromaVectorStore {
    return new ChromaVectorStore(collectionName);
}

// 导出配置
export { chromaConfig };
