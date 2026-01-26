import { ChatOpenAI } from "@langchain/openai";

const OPENROUTER_API_KEY = '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';

const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.5,
    configuration: {
        apiKey: OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
    },
});

async function main() {
    const response = await model.invoke("Hello, this is a test, please simply reply me your version?");
    console.log(response);
}

main();