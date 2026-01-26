import { OpenAIEmbeddings } from "@langchain/openai";

// 硅基流动 API 配置
// 硅基流动兼容 OpenAI API，可以使用 @langchain/openai 的 OpenAIEmbeddings
const SILICONFLOW_API_KEY = 'sk-ibxjepfovywzlqqormngkvqlygrzexumvcqosekbpagueqxd'; // 替换为你的硅基流动 API Key

const embeddings = new OpenAIEmbeddings({
    model: "BAAI/bge-m3", // 硅基流动支持的嵌入模型
    configuration: {
        apiKey: SILICONFLOW_API_KEY,
        baseURL: "https://api.siliconflow.cn/v1",
    },
});

async function main() {
    try {
        // 测试单个文本嵌入
        console.log("=== 测试单个文本嵌入 ===");
        const singleText = "你好，这是一个测试文本";
        const singleEmbedding = await embeddings.embedQuery(singleText);
        console.log(`文本: "${singleText}"`);
        console.log(`向量维度: ${singleEmbedding.length}`);
        console.log(`向量前5个值: ${singleEmbedding.slice(0, 5)}`);
        
        // 测试批量文本嵌入
        console.log("\n=== 测试批量文本嵌入 ===");
        const documents = [
            "人工智能正在改变世界",
            "机器学习是人工智能的一个分支",
            "深度学习使用神经网络处理数据",
            "自然语言处理让计算机理解人类语言"
        ];
        const batchEmbeddings = await embeddings.embedDocuments(documents);
        console.log(`文档数量: ${documents.length}`);
        console.log(`每个向量维度: ${batchEmbeddings[0].length}`);
        
        // 计算相似度示例
        console.log("\n=== 计算向量相似度 ===");
        const cosineSimilarity = (a, b) => {
            const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
            const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
            const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
            return dotProduct / (magnitudeA * magnitudeB);
        };
        
        for (let i = 0; i < documents.length; i++) {
            for (let j = i + 1; j < documents.length; j++) {
                const similarity = cosineSimilarity(batchEmbeddings[i], batchEmbeddings[j]);
                console.log(`"${documents[i]}" <-> "${documents[j]}"`);
                console.log(`相似度: ${similarity.toFixed(4)}\n`);
            }
        }
        
        console.log("测试完成！");
    } catch (error) {
        console.error("错误:", error.message);
        if (error.response) {
            console.error("响应状态:", error.response.status);
            console.error("响应数据:", error.response.data);
        }
    }
}

main();
