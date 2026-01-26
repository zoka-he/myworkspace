/**
 * ChromaDB 数据同步检查工具
 * 基于 MD5 指纹检测数据变更，支持增量同步
 */

import { ChromaClient } from "chromadb";
import mysql from "mysql2/promise";

// ============ 配置 ============
const CHROMA_URL = "http://192.168.0.175:28005";
const COLLECTION_NAME = "novel_chapters";

const MYSQL_CONFIG = {
    host: '192.168.0.175',
    port: 3306,
    user: 'myworksite',
    password: 'nsds123456',
    database: 'dify_novel',
};

// 硅基流动 API 配置
const SILICONFLOW_API_KEY = 'sk-ibxjepfovywzlqqormngkvqlygrzexumvcqosekbpagueqxd';
const SILICONFLOW_BASE_URL = 'https://api.siliconflow.cn/v1';
const EMBEDDING_MODEL = 'BAAI/bge-m3';

// ============ 工具函数 ============

/**
 * 调用硅基流动 API 生成嵌入向量
 */
async function getEmbeddings(texts) {
    if (texts.length === 0) return [];
    
    const response = await fetch(`${SILICONFLOW_BASE_URL}/embeddings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
        },
        body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input: texts,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`嵌入 API 调用失败: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.data.map(item => item.embedding);
}

/**
 * 同步检查结果
 */
class SyncCheckResult {
    constructor() {
        this.toAdd = [];      // 需要新增的记录
        this.toUpdate = [];   // 需要更新的记录
        this.toDelete = [];   // 需要删除的记录
        this.unchanged = [];  // 无变化的记录
    }

    get summary() {
        return {
            toAdd: this.toAdd.length,
            toUpdate: this.toUpdate.length,
            toDelete: this.toDelete.length,
            unchanged: this.unchanged.length,
            total: this.toAdd.length + this.toUpdate.length + this.toDelete.length + this.unchanged.length,
        };
    }
}

/**
 * 数据同步检查器
 */
class ChromaSyncChecker {
    constructor(chromaClient, mysqlPool) {
        this.chromaClient = chromaClient;
        this.mysqlPool = mysqlPool;
    }

    /**
     * 从 MySQL 获取章节数据（带 MD5 指纹）
     */
    async getMysqlChapters(novelId) {
        const [rows] = await this.mysqlPool.execute(`
            SELECT 
                id,
                novel_id,
                chapter_number,
                title,
                content,
                MD5(CONCAT(IFNULL(title,''), IFNULL(content,''))) AS fingerprint,
                updated_at
            FROM chapters 
            WHERE novel_id = ?
            ORDER BY chapter_number
        `, [novelId]);
        
        return rows;
    }

    /**
     * 从 ChromaDB 获取已存储的数据指纹
     */
    async getChromaFingerprints(collectionName, novelId) {
        try {
            // 先检查集合是否存在
            const collections = await this.chromaClient.listCollections();
            const exists = collections.some(c => c.name === collectionName);
            
            if (!exists) {
                console.log(`  集合 "${collectionName}" 不存在，将创建新集合`);
                return new Map();
            }

            const collection = await this.chromaClient.getCollection({ name: collectionName });
            
            // 获取所有数据的 metadata
            const allData = await collection.get({
                include: ["metadatas"],
                where: { novel_id: novelId },
            });

            // 构建 ID -> fingerprint 映射
            const fingerprintMap = new Map();
            allData.ids.forEach((id, index) => {
                const metadata = allData.metadatas[index];
                if (metadata) {
                    fingerprintMap.set(metadata.chapter_id, {
                        chromaId: id,
                        fingerprint: metadata.fingerprint,
                        chapter_id: metadata.chapter_id,
                    });
                }
            });

            return fingerprintMap;
        } catch (error) {
            // 集合不存在或其他错误，返回空 Map
            console.log(`  获取 ChromaDB 数据时出错: ${error.message}，将作为全新同步处理`);
            return new Map();
        }
    }

    /**
     * 检查数据同步状态
     */
    async checkSync(collectionName, novelId) {
        console.log(`\n检查同步状态: collection=${collectionName}, novel_id=${novelId}`);

        // 1. 获取 MySQL 数据
        const mysqlChapters = await this.getMysqlChapters(novelId);
        console.log(`  MySQL 章节数: ${mysqlChapters.length}`);

        // 2. 获取 ChromaDB 指纹
        const chromaFingerprints = await this.getChromaFingerprints(collectionName, novelId);
        console.log(`  ChromaDB 记录数: ${chromaFingerprints.size}`);

        // 3. 对比分析
        const result = new SyncCheckResult();
        const mysqlIds = new Set();

        for (const chapter of mysqlChapters) {
            mysqlIds.add(chapter.id);
            const chromaRecord = chromaFingerprints.get(chapter.id);

            if (!chromaRecord) {
                // ChromaDB 中不存在 → 需要新增
                result.toAdd.push({
                    chapter_id: chapter.id,
                    title: chapter.title,
                    content: chapter.content,
                    fingerprint: chapter.fingerprint,
                    metadata: {
                        chapter_id: chapter.id,
                        novel_id: chapter.novel_id,
                        chapter_number: chapter.chapter_number,
                        title: chapter.title,
                    },
                });
            } else if (chromaRecord.fingerprint !== chapter.fingerprint) {
                // 指纹不同 → 需要更新
                result.toUpdate.push({
                    chapter_id: chapter.id,
                    chromaId: chromaRecord.chromaId,
                    title: chapter.title,
                    content: chapter.content,
                    fingerprint: chapter.fingerprint,
                    oldFingerprint: chromaRecord.fingerprint,
                    metadata: {
                        chapter_id: chapter.id,
                        novel_id: chapter.novel_id,
                        chapter_number: chapter.chapter_number,
                        title: chapter.title,
                    },
                });
            } else {
                // 指纹相同 → 无变化
                result.unchanged.push({
                    chapter_id: chapter.id,
                    title: chapter.title,
                });
            }
        }

        // 4. 检查 ChromaDB 中多余的记录（MySQL 已删除）
        for (const [chapterId, chromaRecord] of chromaFingerprints) {
            if (!mysqlIds.has(chapterId)) {
                result.toDelete.push({
                    chapter_id: chapterId,
                    chromaId: chromaRecord.chromaId,
                });
            }
        }

        return result;
    }

    /**
     * 执行同步操作
     */
    async executeSync(collectionName, checkResult, options = {}) {
        const { dryRun = false, batchSize = 10 } = options;

        if (dryRun) {
            console.log("\n[DRY RUN] 仅显示将要执行的操作，不实际执行\n");
        }

        const collection = await this.chromaClient.getOrCreateCollection({
            name: collectionName,
            metadata: { description: "小说章节向量存储" },
        });

        let stats = { added: 0, updated: 0, deleted: 0 };

        // 1. 删除失效数据
        if (checkResult.toDelete.length > 0) {
            console.log(`\n删除失效数据 (${checkResult.toDelete.length} 条)...`);
            const deleteIds = checkResult.toDelete.map(r => r.chromaId);
            
            if (!dryRun) {
                await collection.delete({ ids: deleteIds });
            }
            
            checkResult.toDelete.forEach(r => {
                console.log(`  - 删除: chapter_id=${r.chapter_id}`);
            });
            stats.deleted = checkResult.toDelete.length;
        }

        // 2. 新增数据（分批处理）
        if (checkResult.toAdd.length > 0) {
            console.log(`\n新增数据 (${checkResult.toAdd.length} 条)...`);
            
            for (let i = 0; i < checkResult.toAdd.length; i += batchSize) {
                const batch = checkResult.toAdd.slice(i, i + batchSize);
                console.log(`  处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(checkResult.toAdd.length / batchSize)}`);

                if (!dryRun) {
                    const embeddings = await getEmbeddings(batch.map(r => r.content));
                    
                    await collection.add({
                        ids: batch.map(r => `chapter_${r.chapter_id}`),
                        documents: batch.map(r => r.content),
                        embeddings: embeddings,
                        metadatas: batch.map(r => ({
                            ...r.metadata,
                            fingerprint: r.fingerprint,
                            synced_at: new Date().toISOString(),
                        })),
                    });
                }

                batch.forEach(r => {
                    console.log(`    + 新增: chapter_id=${r.chapter_id}, title="${r.title}"`);
                });
            }
            stats.added = checkResult.toAdd.length;
        }

        // 3. 更新数据（分批处理）
        if (checkResult.toUpdate.length > 0) {
            console.log(`\n更新数据 (${checkResult.toUpdate.length} 条)...`);

            for (let i = 0; i < checkResult.toUpdate.length; i += batchSize) {
                const batch = checkResult.toUpdate.slice(i, i + batchSize);
                console.log(`  处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(checkResult.toUpdate.length / batchSize)}`);

                if (!dryRun) {
                    const embeddings = await getEmbeddings(batch.map(r => r.content));

                    await collection.update({
                        ids: batch.map(r => r.chromaId),
                        documents: batch.map(r => r.content),
                        embeddings: embeddings,
                        metadatas: batch.map(r => ({
                            ...r.metadata,
                            fingerprint: r.fingerprint,
                            synced_at: new Date().toISOString(),
                        })),
                    });
                }

                batch.forEach(r => {
                    console.log(`    ~ 更新: chapter_id=${r.chapter_id}, title="${r.title}"`);
                });
            }
            stats.updated = checkResult.toUpdate.length;
        }

        return stats;
    }
}

// ============ 主程序 ============

async function main() {
    console.log("=== ChromaDB 数据同步检查工具 ===\n");

    // 创建连接
    const chromaClient = new ChromaClient({ path: CHROMA_URL });
    const mysqlPool = mysql.createPool(MYSQL_CONFIG);

    try {
        // 检查连接
        await chromaClient.heartbeat();
        console.log("✓ ChromaDB 连接成功");
        
        await mysqlPool.execute("SELECT 1");
        console.log("✓ MySQL 连接成功");

        // 创建检查器
        const checker = new ChromaSyncChecker(chromaClient, mysqlPool);

        // 执行同步检查（这里假设 novel_id = 1，实际使用时可以改成参数）
        const novelId = 1;
        const checkResult = await checker.checkSync(COLLECTION_NAME, novelId);

        // 显示检查结果
        console.log("\n=== 同步检查结果 ===");
        console.log(`  需要新增: ${checkResult.summary.toAdd} 条`);
        console.log(`  需要更新: ${checkResult.summary.toUpdate} 条`);
        console.log(`  需要删除: ${checkResult.summary.toDelete} 条`);
        console.log(`  无需变更: ${checkResult.summary.unchanged} 条`);

        // 显示详情
        if (checkResult.toAdd.length > 0) {
            console.log("\n待新增:");
            checkResult.toAdd.forEach(r => console.log(`  + ${r.title} (id=${r.chapter_id})`));
        }

        if (checkResult.toUpdate.length > 0) {
            console.log("\n待更新:");
            checkResult.toUpdate.forEach(r => console.log(`  ~ ${r.title} (id=${r.chapter_id})`));
        }

        if (checkResult.toDelete.length > 0) {
            console.log("\n待删除:");
            checkResult.toDelete.forEach(r => console.log(`  - chapter_id=${r.chapter_id}`));
        }

        // 执行同步（设置 dryRun: true 先预览，确认无误后改为 false）
        if (checkResult.summary.toAdd + checkResult.summary.toUpdate + checkResult.summary.toDelete > 0) {
            console.log("\n=== 执行同步 ===");
            const stats = await checker.executeSync(COLLECTION_NAME, checkResult, {
                dryRun: true,   // 改为 false 实际执行
                batchSize: 5,   // 每批处理数量
            });

            console.log("\n同步完成:");
            console.log(`  新增: ${stats.added}`);
            console.log(`  更新: ${stats.updated}`);
            console.log(`  删除: ${stats.deleted}`);
        } else {
            console.log("\n数据已同步，无需操作");
        }

    } catch (error) {
        console.error("\n错误:", error.message);
        console.error(error.stack);
    } finally {
        await mysqlPool.end();
    }
}

main();
