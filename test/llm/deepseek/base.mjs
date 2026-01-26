import { ChatDeepSeek } from "@langchain/deepseek";
import { PromptTemplate } from "@langchain/core/prompts";
// Note: LLMChain has been deprecated in LangChain v1.x
// Using the new chain API instead
import { RunnableSequence } from "@langchain/core/runnables";

const DEEPSEEK_API_KEY = 'sk-793d020ab6bf46f38ef40d3f3d5d544c';

const model = new ChatDeepSeek({
    apiKey: DEEPSEEK_API_KEY,
    model: "deepseek-chat",
    temperature: 0.5,
});

const prompt = PromptTemplate.fromTemplate(
    "What is a good name for a company that makes {product}?"
);

// In LangChain v1.x, use RunnableSequence instead of LLMChain
const chain = RunnableSequence.from([prompt, model]);

async function main() {
    const response = await chain.invoke({
        product: "colorful socks"
    });
    console.log(response);
}

main();