import { ChatOpenAI } from "@langchain/openai";
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';

if (!OPENROUTER_API_KEY) {
    console.error('Error: OPENROUTER_API_KEY is not set. Please set it in your .env file or environment variables.');
    process.exit(1);
}

console.log('Using API Key prefix:', OPENROUTER_API_KEY.substring(0, 15) + '...');
console.log('API Key length:', OPENROUTER_API_KEY.length);

const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.5,
    configuration: {
        apiKey: OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
    },
});

async function main() {
    try {
        console.log('Testing OpenRouter API...');
        const response = await model.invoke("Hello, this is a test, please simply reply me your version?");
        console.log('Success! Response:', response);
        console.log('Content:', response.content);
    } catch (error) {
        console.error('Error:', error.message);
        if (error.status === 401 || error.message.includes('401') || error.message.includes('User not found')) {
            console.error('\n⚠️  Authentication failed (401). Possible causes:');
            console.error('1. API Key is invalid or expired');
            console.error('2. API Key format is incorrect (should start with sk-or-v1- or sk-)');
            console.error('3. API Key has been disabled in your OpenRouter account');
            console.error('\nPlease check:');
            console.error('- Your OPENROUTER_API_KEY environment variable');
            console.error('- Your OpenRouter account settings');
            console.error('- Generate a new API key if needed: https://openrouter.ai/keys');
        }
        process.exit(1);
    }
}

main();