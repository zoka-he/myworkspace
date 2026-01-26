/**
 * 章节向量存储示例
 * 展示如何将章节内容存入 Chroma 并进行语义搜索
 */

import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChromaClient } from "chromadb";

// 配置
const SILICONFLOW_API_KEY = 'sk-ibxjepfovywzlqqormngkvqlygrzexumvcqosekbpagueqxd';
const CHROMA_URL = "http://192.168.0.175:28005";
const COLLECTION_NAME = "novel_chapters";

// 创建嵌入模型
const embeddings = new OpenAIEmbeddings({
    model: "BAAI/bge-m3",
    configuration: {
        apiKey: SILICONFLOW_API_KEY,
        baseURL: "https://api.siliconflow.cn/v1",
    },
});

// 模拟章节数据（实际使用时从 MySQL 获取）
const mockChapters = [
    {
        id: 1,
        novel_id: 1,
        chapter_number: 1,
        title: "初入江湖",
        content: "少年张无忌自幼生长在冰火岛上，与父母相依为命。他天资聪颖，在父亲的教导下习得了一身武艺。十五岁那年，一场意外改变了他的命运，他不得不独自踏上了闯荡江湖的道路。",
        worldview_id: 1,
    },
    {
        id: 2,
        novel_id: 1,
        chapter_number: 2,
        title: "奇遇神功",
        content: "张无忌在悬崖边发现了一个隐秘的山洞，洞中藏有一本上古秘籍——《九阳神功》。经过三个月的闭关修炼，他终于初窥门径，内力大增。",
        worldview_id: 1,
    },
    {
        id: 3,
        novel_id: 1,
        chapter_number: 3,
        title: "群雄聚会",
        content: "江湖六大门派齐聚光明顶，准备围攻明教总坛。张无忌意外卷入这场纷争，发现明教并非传言中的魔教，而是一群有着崇高理想的义士。",
        worldview_id: 1,
    },
    {
        id: 4,
        novel_id: 1,
        chapter_number: 4,
        title: "情定终身",
        content: "在与赵敏的多次交锋中，张无忌渐渐被她的聪慧与美貌所吸引。两人虽立场不同，却情愫暗生。一次生死关头，赵敏不顾一切救下了张无忌。",
        worldview_id: 1,
    },
    {
        id: 5,
        novel_id: 1,
        chapter_number: 5,
        title: "终极对决",
        content: "大战在即，张无忌率领明教众人迎战元朝大军。凭借九阳神功和乾坤大挪移的威力，他力挫群雄，最终击败了元朝武林第一高手。",
        worldview_id: 1,
    },
];

async function main() {
    console.log("=== 章节向量存储示例 ===\n");

    try {
        // 1. 检查/创建集合
        console.log("1. 检查 Chroma 集合...");
        const client = new ChromaClient({ path: CHROMA_URL });
        
        const collections = await client.listCollections();
        const exists = collections.map(c => c.name).includes(COLLECTION_NAME);
        
        if (!exists) {
            await client.createCollection({
                name: COLLECTION_NAME,
                metadata: { description: '小说章节内容向量存储' },
            });
            console.log(`   集合 "${COLLECTION_NAME}" 已创建\n`);
        } else {
            console.log(`   集合 "${COLLECTION_NAME}" 已存在\n`);
        }

        // 2. 创建向量存储实例
        console.log("2. 连接向量存储...");
        const vectorStore = await Chroma.fromExistingCollection(embeddings, {
            collectionName: COLLECTION_NAME,
            url: CHROMA_URL,
        });
        console.log("   连接成功\n");

        // 3. 添加章节文档
        console.log("3. 添加章节到向量存储...");
        const documents = mockChapters.map(chapter => ({
            pageContent: `${chapter.title}\n\n${chapter.content}`,
            metadata: {
                chapter_id: chapter.id,
                novel_id: chapter.novel_id,
                chapter_number: chapter.chapter_number,
                title: chapter.title,
                worldview_id: chapter.worldview_id,
                indexed_at: new Date().toISOString(),
            },
        }));

        await vectorStore.addDocuments(documents);
        console.log(`   已添加 ${documents.length} 个章节\n`);

        // 4. 语义搜索示例
        console.log("4. 语义搜索测试...\n");

        const queries = [
            "张无忌学习武功的经历",
            "爱情故事",
            "大战场面",
            "明教的真相",
        ];

        for (const query of queries) {
            console.log(`   查询: "${query}"`);
            const results = await vectorStore.similaritySearchWithScore(query, 2);
            
            results.forEach(([doc, score], index) => {
                console.log(`   [${index + 1}] 相似度: ${(1 - score).toFixed(4)}`);
                console.log(`       章节: ${doc.metadata.title} (第${doc.metadata.chapter_number}章)`);
                console.log(`       内容: ${doc.pageContent.substring(0, 50)}...`);
            });
            console.log();
        }

        // 5. 带过滤条件的搜索
        console.log("5. 带过滤条件的搜索...");
        const filteredResults = await vectorStore.similaritySearch(
            "武功秘籍",
            2,
            { novel_id: 1 }
        );
        console.log(`   过滤条件: novel_id = 1`);
        console.log(`   找到 ${filteredResults.length} 个结果\n`);

        // 6. 获取集合统计
        console.log("6. 集合统计...");
        const collection = await client.getCollection({ name: COLLECTION_NAME });
        const count = await collection.count();
        console.log(`   总文档数: ${count}\n`);

        console.log("=== 示例完成 ===");

    } catch (error) {
        console.error("\n错误:", error.message);
        if (error.cause) {
            console.error("原因:", error.cause);
        }
        console.error("\n提示: 请确保 Chroma 服务已启动");
        console.error("启动命令: docker run -p 8000:8000 chromadb/chroma");
    }
}

main();
