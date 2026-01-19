import { ChromaClient } from "chromadb";

// Chroma 服务器配置
const CHROMA_URL = "http://192.168.0.175:28005";
const COLLECTION_NAME = "test_collection";

// 硅基流动 API 配置 (用于生成向量嵌入)
const SILICONFLOW_API_KEY = 'sk-ibxjepfovywzlqqormngkvqlygrzexumvcqosekbpagueqxd';
const SILICONFLOW_BASE_URL = 'https://api.siliconflow.cn/v1';
const EMBEDDING_MODEL = 'BAAI/bge-m3';

/**
 * 调用硅基流动 API 生成嵌入向量
 */
async function getEmbeddings(texts) {
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

async function main() {
    try {
        console.log("=== Chroma 原生客户端测试 ===\n");
        console.log(`服务地址: ${CHROMA_URL}`);
        console.log(`集合名称: ${COLLECTION_NAME}\n`);

        // 1. 创建 Chroma 客户端并检查连接
        console.log("1. 连接 Chroma 数据库...");
        const client = new ChromaClient({ path: CHROMA_URL });
        const heartbeat = await client.heartbeat();
        console.log(`   连接成功 (heartbeat: ${heartbeat})\n`);

        // 2. 创建或获取集合
        console.log("2. 获取/创建集合...");
        const collection = await client.getOrCreateCollection({
            name: COLLECTION_NAME,
            metadata: { description: "测试集合" },
        });
        console.log(`   集合 "${COLLECTION_NAME}" 已就绪\n`);

        // 3. 准备测试文档
        console.log("3. 准备测试文档...");
        const documents = [
            "人工智能正在改变世界的各个领域",
            "机器学习是人工智能的一个重要分支",
            "深度学习使用神经网络来处理复杂数据",
            "自然语言处理让计算机能够理解人类语言",
            "计算机视觉使机器能够识别和分析图像",
        ];

        const ids = documents.map((_, i) => `doc_${Date.now()}_${i}`);
        const metadatas = documents.map((_, i) => ({
            source: "test",
            index: i,
            timestamp: new Date().toISOString(),
        }));

        // 4. 生成嵌入向量
        console.log("4. 生成嵌入向量...");
        const embeddings = await getEmbeddings(documents);
        console.log(`   已生成 ${embeddings.length} 个向量，维度: ${embeddings[0].length}\n`);

        // 5. 添加文档到集合
        console.log("5. 添加文档到集合...");
        await collection.add({
            ids: ids,
            documents: documents,
            metadatas: metadatas,
            embeddings: embeddings,
        });
        console.log(`   已添加 ${documents.length} 个文档\n`);

        // 6. 相似度搜索
        console.log("6. 执行相似度搜索...");
        const query = "什么是机器学习？";
        console.log(`   查询: "${query}"`);

        const queryEmbedding = await getEmbeddings([query]);
        const searchResults = await collection.query({
            queryEmbeddings: queryEmbedding,
            nResults: 3,
            include: ["documents", "metadatas", "distances"],
        });

        console.log(`   找到 ${searchResults.documents[0].length} 个相关结果:\n`);
        searchResults.documents[0].forEach((doc, i) => {
            const distance = searchResults.distances[0][i];
            const metadata = searchResults.metadatas[0][i];
            console.log(`   [${i + 1}] 距离: ${distance.toFixed(4)}`);
            console.log(`       内容: ${doc}`);
            console.log(`       元数据: ${JSON.stringify(metadata)}\n`);
        });

        // 7. 带过滤条件的搜索
        console.log("7. 带过滤条件的搜索...");
        const query2 = "神经网络";
        console.log(`   查询: "${query2}", 过滤: index < 3`);

        const queryEmbedding2 = await getEmbeddings([query2]);
        const filteredResults = await collection.query({
            queryEmbeddings: queryEmbedding2,
            nResults: 3,
            where: { index: { "$lt": 3 } },
            include: ["documents", "metadatas", "distances"],
        });

        console.log(`   找到 ${filteredResults.documents[0].length} 个结果:\n`);
        filteredResults.documents[0].forEach((doc, i) => {
            console.log(`   [${i + 1}] ${doc}`);
        });
        console.log();

        // 8. 获取集合统计
        console.log("8. 集合统计...");
        const count = await collection.count();
        console.log(`   当前文档数: ${count}\n`);

        // 9. 更新文档
        console.log("9. 更新文档...");
        const updateId = ids[0];
        const newDoc = "人工智能（AI）正在深刻改变人类社会的方方面面";
        const newEmbedding = await getEmbeddings([newDoc]);
        
        await collection.update({
            ids: [updateId],
            documents: [newDoc],
            embeddings: newEmbedding,
            metadatas: [{ source: "test", index: 0, updated: true }],
        });
        console.log(`   已更新文档: ${updateId}\n`);

        // 10. 获取指定文档
        console.log("10. 获取指定文档...");
        const getResult = await collection.get({
            ids: [updateId],
            include: ["documents", "metadatas"],
        });
        console.log(`   ID: ${getResult.ids[0]}`);
        console.log(`   内容: ${getResult.documents[0]}`);
        console.log(`   元数据: ${JSON.stringify(getResult.metadatas[0])}\n`);

        // 11. 清理测试数据
        console.log("11. 清理测试数据...");
        await collection.delete({ ids: ids });
        const finalCount = await collection.count();
        console.log(`   已删除测试文档，剩余文档数: ${finalCount}\n`);

        console.log("=== 测试完成！===");

    } catch (error) {
        console.error("\n错误:", error.message);
        if (error.cause) {
            console.error("原因:", error.cause);
        }
        console.error("\n提示: 请确保 Chroma 服务已启动");
    }
}

main();
