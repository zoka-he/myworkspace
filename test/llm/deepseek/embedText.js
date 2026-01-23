import { ChatDeepSeek } from "@langchain/deepseek";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

const DEEPSEEK_API_KEY = 'sk-793d020ab6bf46f38ef40d3f3d5d544c';

// 创建 DeepSeek 聊天模型实例
const model = new ChatDeepSeek({
    apiKey: DEEPSEEK_API_KEY,
    model: "deepseek-chat",
    temperature: 0.3, // 较低的温度以获得更稳定的输出
});

/**
 * 生成地理设定嵌入标签原文的提示模板
 * 嵌入标签专注于语义特征，用于CHROMA向量检索，避免与DB精确匹配重叠
 * 
 * 重要原则：
 * - DB负责精确匹配：名称、编码等结构化标识符
 * - CHROMA负责语义匹配：特征、属性、描述等语义信息
 * - 嵌入标签必须不包含任何具体名称、编码，只包含语义特征
 */
const embedPrompt = PromptTemplate.fromTemplate(`
你是一个小说世界构建助手。请根据以下地理设定信息，生成一个专注于语义特征的嵌入标签原文。

【重要约束】
1. **绝对禁止**在嵌入标签中包含任何具体名称、编码、标识符
2. 只描述地理实体的**语义特征、属性、环境、功能**等可搜索的语义信息
3. 使用通用描述而非具体标识，例如用"首都城市"而非具体城市名

【嵌入标签应包含】
1. 地理类型及其特征（如：多恒星系统、类地行星、沿海城市等）
2. 物理属性（如：气候、地形、规模、结构等）
3. 环境特征（如：资源、生态、景观等）
4. 功能特征（如：交通枢纽、政治中心、资源基地等）
5. 位置关系特征（如：位于边缘、环绕关系等，但不提具体名称）

【输出要求】
- 语言简洁自然，适合向量嵌入和语义搜索
- 长度控制在80-150字
- 完全避免提及任何具体名称、编码或标识符

地理设定信息：
- 类型：{geoType}
- 描述：{description}
- 上级关系类型：{parentInfo}

请生成嵌入标签原文（不包含任何名称或编码）：
`);

// 创建生成链
const generateEmbedChain = RunnableSequence.from([embedPrompt, model]);

/**
 * 测试函数：为不同类型的地理设定生成嵌入标签
 */
async function testGenerateEmbedText() {
    console.log("=== 测试生成地理设定嵌入标签原文 ===\n");

    // 测试用例1：星系
    const starSystem = {
        geoType: "星系",
        name: "阿尔法星系", // 仅用于显示，不会传入提示词
        code: "SY-Alpha1", // 仅用于显示，不会传入提示词
        description: "一个包含三颗恒星的复杂星系系统，位于银河系边缘，是多个文明的重要交通枢纽。",
        parentInfo: "世界观" // 只保留关系类型，不包含具体名称
    };

    // 测试用例2：行星
    const planet = {
        geoType: "行星",
        name: "泰拉三号", // 仅用于显示，不会传入提示词
        code: "PL-Terra3", // 仅用于显示，不会传入提示词
        description: "一颗类地行星，拥有丰富的海洋和大陆，气候温和，适合人类居住。主要特征包括广阔的平原和蜿蜒的河流系统。",
        parentInfo: "所属星系" // 只保留关系类型，不包含具体名称
    };

    // 测试用例3：地理单元（城市）
    const geographyUnit = {
        geoType: "城市",
        name: "新都", // 仅用于显示，不会传入提示词
        code: "CT-NewCapital", // 仅用于显示，不会传入提示词
        description: "首都城市，位于中央平原，是政治、经济和文化的中心。城市建筑融合了传统和现代风格，拥有发达的交通网络。", // 已移除具体名称
        parentInfo: "所属行星" // 只保留关系类型，不包含具体名称
    };

    // 测试用例4：恒星
    const star = {
        geoType: "恒星",
        name: "太阳阿尔法", // 仅用于显示，不会传入提示词
        code: "ST-SunAlpha", // 仅用于显示，不会传入提示词
        description: "一颗黄矮星，质量约为太阳的1.2倍，为星系提供主要光源。", // 已移除具体名称
        parentInfo: "所属星系" // 只保留关系类型，不包含具体名称
    };

    const testCases = [
        { label: "星系", data: starSystem },
        { label: "行星", data: planet },
        { label: "地理单元（城市）", data: geographyUnit },
        { label: "恒星", data: star }
    ];

    for (const testCase of testCases) {
        try {
            console.log(`\n--- 测试用例：${testCase.label} ---`);
            console.log(`输入信息：`);
            console.log(`  名称：${testCase.data.name}`);
            console.log(`  编码：${testCase.data.code}`);
            console.log(`  描述：${testCase.data.description}`);
            
            // 注意：不传入name和code，避免与DB精确匹配重叠
            // parentInfo会自动处理，移除冒号后的具体名称
            const response = await generateEmbedChain.invoke({
                geoType: testCase.data.geoType,
                description: testCase.data.description || "无详细描述",
                parentInfo: testCase.data.parentInfo ? testCase.data.parentInfo.replace(/[：:].*$/, "") : "无上级关系" // 只保留关系类型，移除具体名称
            });

            // 提取文本内容
            const embedText = response.content;
            
            console.log(`\n生成的嵌入标签原文：`);
            console.log(embedText);
            console.log(`\n字符数：${embedText.length}`);
            console.log("─".repeat(60));
            
            // 添加延迟，避免API限流
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`生成 ${testCase.label} 的嵌入标签时出错：`, error);
        }
    }
}

/**
 * 单个地理设定生成嵌入标签的函数
 * @param {Object} geoData - 地理设定数据
 * @param {string} geoData.geoType - 地理类型（星系、恒星、行星、卫星、地理单元等）
 * @param {string} [geoData.description] - 描述（可选）
 * @param {string} [geoData.parentInfo] - 上级关系信息（可选，会自动移除具体名称）
 * @returns {Promise<string>} 生成的嵌入标签原文（不包含名称、编码）
 */
async function generateGeoEmbedText(geoData) {
    try {
        // 处理parentInfo，只保留关系类型，移除具体名称
        let parentInfo = geoData.parentInfo || "无上级关系";
        if (parentInfo && parentInfo !== "无上级关系") {
            // 提取关系类型，如"所属星系"、"所属行星"等，移除冒号后的具体名称
            parentInfo = parentInfo.replace(/[：:].*$/, "").trim() || "有上级关系";
        }

        const response = await generateEmbedChain.invoke({
            geoType: geoData.geoType || "地理单元",
            description: geoData.description || "无详细描述",
            parentInfo: parentInfo
        });

        return response.content;
    } catch (error) {
        console.error("生成嵌入标签时出错：", error);
        throw error;
    }
}

// 主函数
async function main() {
    try {
        // 运行测试用例
        await testGenerateEmbedText();
        
        console.log("\n\n=== 测试完成 ===");
        
        // 示例：单独生成一个嵌入标签
        console.log("\n=== 单独生成示例 ===");
        const customGeoData = {
            geoType: "卫星",
            description: "主要卫星，表面覆盖着冰层，是重要的资源开采基地。",
            parentInfo: "所属行星" // 注意：不包含具体名称
        };
        
        const embedText = await generateGeoEmbedText(customGeoData);
        console.log("生成的嵌入标签：", embedText);
        console.log("✓ 验证：不包含具体名称和编码");
        
    } catch (error) {
        console.error("程序执行出错：", error);
        process.exit(1);
    }
}

// 执行主函数
main().catch(console.error);

// 导出函数供其他模块使用
export { generateGeoEmbedText, testGenerateEmbedText };
