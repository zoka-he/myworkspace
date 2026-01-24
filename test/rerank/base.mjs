/**
 * SiliconFlow 重排序测试 Demo
 * 演示如何使用硅基流动 API 对文档进行重排序
 */

// 硅基流动 API 配置
const SILICONFLOW_API_KEY = 'sk-ibxjepfovywzlqqormngkvqlygrzexumvcqosekbpagueqxd'; // 替换为你的硅基流动 API Key
const SILICONFLOW_BASE_URL = 'https://api.siliconflow.cn/v1';
const RERANK_MODEL = 'Qwen/Qwen3-Reranker-8B'; // 重排序模型

/**
 * 调用硅基流动重排序 API
 */
async function rerank(query, documents, model = RERANK_MODEL, debug = false) {
    const response = await fetch(`${SILICONFLOW_BASE_URL}/rerank`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
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
    
    // 调试模式：打印完整响应结构
    if (debug) {
        console.log('\n[调试] API 响应结构:');
        console.log(JSON.stringify(data, null, 2));
    }
    
    return data;
}

/**
 * 从重排序结果中提取文档文本
 * 处理不同的 API 响应格式
 */
function getDocumentText(item, originalDocuments) {
    if (item.document) {
        // 如果 document 是字符串，直接返回
        if (typeof item.document === 'string') {
            return item.document;
        }
        // 如果 document 是对象，尝试获取 text 属性
        if (item.document.text) {
            return item.document.text;
        }
    }
    // 如果 document 不存在或无法获取，使用原始文档数组
    return originalDocuments[item.index] || '';
}

async function main() {
    try {
        console.log("=== SiliconFlow 重排序测试 Demo ===\n");

        // 测试用例 1: 简单文本重排序
        console.log("【测试用例 1】简单文本重排序");
        console.log("查询: '苹果'");
        const documents1 = [
            "苹果是一种水果",
            "香蕉是黄色的",
            "苹果公司生产 iPhone",
            "蔬菜很健康"
        ];
        console.log("文档列表:");
        documents1.forEach((doc, idx) => console.log(`  ${idx + 1}. ${doc}`));
        
        const result1 = await rerank("苹果", documents1, RERANK_MODEL, false);
        console.log("\n重排序结果:");
        result1.results.forEach((item, idx) => {
            const docText = getDocumentText(item, documents1);
            console.log(`  ${idx + 1}. [索引 ${item.index}] 相关性分数: ${item.relevance_score.toFixed(4)}`);
            console.log(`     文档: "${docText}"`);
        });
        console.log();

        // 测试用例 2: 技术文档重排序
        console.log("【测试用例 2】技术文档重排序");
        console.log("查询: '如何使用机器学习进行文本分类'");
        const documents2 = [
            "机器学习是人工智能的一个分支，通过算法让计算机从数据中学习",
            "文本分类是自然语言处理中的基础任务，可以使用多种算法实现",
            "深度学习使用神经网络处理复杂的数据模式",
            "Python 是一种流行的编程语言，广泛用于数据科学",
            "使用 scikit-learn 可以快速实现文本分类任务",
            "BERT 模型在文本分类任务上表现优异"
        ];
        console.log("文档列表:");
        documents2.forEach((doc, idx) => console.log(`  ${idx + 1}. ${doc}`));
        
        const result2 = await rerank("如何使用机器学习进行文本分类", documents2);
        console.log("\n重排序结果 (Top 3):");
        result2.results.slice(0, 3).forEach((item, idx) => {
            const docText = getDocumentText(item, documents2);
            console.log(`  ${idx + 1}. [索引 ${item.index}] 相关性分数: ${item.relevance_score.toFixed(4)}`);
            console.log(`     文档: "${docText}"`);
        });
        console.log();

        // 测试用例 3: 长文本重排序
        console.log("【测试用例 3】长文本重排序");
        console.log("查询: '人工智能的发展历史'");
        const documents3 = [
            "人工智能（AI）是计算机科学的一个分支，旨在创建能够执行通常需要人类智能的任务的系统。",
            "1950 年代，图灵提出了著名的图灵测试，这是人工智能研究的起点。",
            "深度学习是机器学习的一个子领域，使用多层神经网络来学习数据的表示。",
            "2010 年代以来，随着大数据和计算能力的提升，人工智能取得了突破性进展。",
            "自然语言处理是人工智能的一个重要应用领域，使计算机能够理解和生成人类语言。"
        ];
        console.log("文档列表:");
        documents3.forEach((doc, idx) => console.log(`  ${idx + 1}. ${doc.substring(0, 50)}...`));
        
        const result3 = await rerank("人工智能的发展历史", documents3);
        console.log("\n重排序结果:");
        result3.results.forEach((item, idx) => {
            const docText = getDocumentText(item, documents3);
            console.log(`  ${idx + 1}. [索引 ${item.index}] 相关性分数: ${item.relevance_score.toFixed(4)}`);
            console.log(`     文档: "${docText.substring(0, 60)}..."`);
        });
        console.log();

        // 测试用例 4: 对比原始顺序和重排序后的顺序
        console.log("【测试用例 4】对比原始顺序和重排序后的顺序");
        console.log("查询: 'JavaScript 异步编程'");
        const documents4 = [
            "JavaScript 是一种动态类型的编程语言",
            "Promise 是 JavaScript 中处理异步操作的重要机制",
            "async/await 语法让异步代码看起来像同步代码",
            "回调函数是 JavaScript 中最早的异步处理方式",
            "事件循环是 JavaScript 异步执行的核心机制"
        ];
        console.log("\n原始顺序:");
        documents4.forEach((doc, idx) => console.log(`  ${idx + 1}. ${doc}`));
        
        const result4 = await rerank("JavaScript 异步编程", documents4);
        console.log("\n重排序后的顺序:");
        result4.results.forEach((item, idx) => {
            const originalIdx = item.index;
            const docText = getDocumentText(item, documents4);
            console.log(`  ${idx + 1}. [原索引 ${originalIdx}] 分数: ${item.relevance_score.toFixed(4)} - ${docText}`);
        });
        console.log();

        console.log("✅ 所有测试完成！");
    } catch (error) {
        console.error("❌ 错误:", error.message);
        if (error.stack) {
            console.error("错误堆栈:", error.stack);
        }
        process.exit(1);
    }
}

main();
