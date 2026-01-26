/**
 * Chroma 集合初始化脚本
 * 用于检测并创建所有需要的向量数据库集合
 */

import { ChromaClient } from "chromadb";

// Chroma 配置
const CHROMA_URL = "http://192.168.0.175:28005";

// 集合定义
const COLLECTIONS = {
    CHAPTERS: 'novel_chapters',
    ROLES: 'novel_roles',
    WORLDVIEWS: 'novel_worldviews',
    TIMELINE_EVENTS: 'novel_timeline_events',
    GEO_LOCATIONS: 'novel_geo_locations',
    FACTIONS: 'novel_factions',
};

// 集合元数据
const COLLECTION_METADATA = {
    [COLLECTIONS.CHAPTERS]: {
        description: '小说章节内容向量存储，用于章节内容的语义搜索',
    },
    [COLLECTIONS.ROLES]: {
        description: '角色信息向量存储，包含角色描述、背景等',
    },
    [COLLECTIONS.WORLDVIEWS]: {
        description: '世界观内容向量存储，包含世界设定、规则等',
    },
    [COLLECTIONS.TIMELINE_EVENTS]: {
        description: '时间线事件向量存储，用于事件搜索和关联',
    },
    [COLLECTIONS.GEO_LOCATIONS]: {
        description: '地理位置向量存储，包含地点描述和特征',
    },
    [COLLECTIONS.FACTIONS]: {
        description: '势力/阵营向量存储，包含势力描述、关系等',
    },
};

async function main() {
    console.log("=== Chroma 集合初始化工具 ===\n");
    console.log(`Chroma 服务地址: ${CHROMA_URL}\n`);

    // 创建 Chroma 客户端
    const client = new ChromaClient({ path: CHROMA_URL });

    try {
        // 1. 检查连接
        console.log("1. 检查 Chroma 服务连接...");
        const heartbeat = await client.heartbeat();
        console.log(`   ✓ 连接成功 (heartbeat: ${heartbeat})\n`);

        // 2. 获取现有集合
        console.log("2. 获取现有集合列表...");
        const existingCollections = await client.listCollections();
        const existingNames = existingCollections.map(c => c.name);
        console.log(`   现有集合数量: ${existingNames.length}`);
        if (existingNames.length > 0) {
            existingNames.forEach(name => {
                console.log(`   - ${name}`);
            });
        }
        console.log();

        // 3. 检测并创建集合
        console.log("3. 检测并创建所需集合...\n");

        const collectionNames = Object.values(COLLECTIONS);
        const results = {
            created: [],
            existing: [],
            failed: [],
        };

        for (const name of collectionNames) {
            const exists = existingNames.includes(name);
            const metadata = COLLECTION_METADATA[name] || {};

            if (exists) {
                // 集合已存在，获取文档数量
                try {
                    const collection = await client.getCollection({ name });
                    const count = await collection.count();
                    results.existing.push({ name, count });
                    console.log(`   ✓ [已存在] ${name} (${count} 条文档)`);
                } catch (err) {
                    results.existing.push({ name, count: '未知' });
                    console.log(`   ✓ [已存在] ${name}`);
                }
            } else {
                // 创建新集合
                try {
                    await client.createCollection({
                        name,
                        metadata,
                    });
                    results.created.push(name);
                    console.log(`   ✓ [已创建] ${name}`);
                } catch (err) {
                    results.failed.push({ name, error: err.message });
                    console.log(`   ✗ [失败] ${name}: ${err.message}`);
                }
            }
        }

        // 4. 汇总报告
        console.log("\n=== 初始化报告 ===\n");
        console.log(`总集合数: ${collectionNames.length}`);
        console.log(`已存在: ${results.existing.length}`);
        console.log(`新创建: ${results.created.length}`);
        console.log(`失败: ${results.failed.length}`);

        if (results.created.length > 0) {
            console.log("\n新创建的集合:");
            results.created.forEach(name => console.log(`  - ${name}`));
        }

        if (results.failed.length > 0) {
            console.log("\n创建失败的集合:");
            results.failed.forEach(({ name, error }) => console.log(`  - ${name}: ${error}`));
        }

        // 5. 最终状态
        console.log("\n=== 集合状态汇总 ===\n");
        const finalCollections = await client.listCollections();
        for (const name of collectionNames) {
            const exists = finalCollections.map(c => c.name).includes(name);
            const status = exists ? '✓' : '✗';
            let info = '';
            if (exists) {
                try {
                    const col = await client.getCollection({ name });
                    const count = await col.count();
                    info = `(${count} 条文档)`;
                } catch { }
            }
            console.log(`  ${status} ${name} ${info}`);
        }

        console.log("\n=== 初始化完成 ===");

    } catch (error) {
        console.error("\n错误:", error.message);
        if (error.cause) {
            console.error("原因:", error.cause);
        }
        console.error("\n提示: 请确保 Chroma 服务已启动");
        console.error("启动命令: docker run -p 8000:8000 chromadb/chroma");
        process.exit(1);
    }
}

main();
