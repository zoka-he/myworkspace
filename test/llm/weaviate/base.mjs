// 连接 Weaviate 云服务 (WCS)
import weaviate from 'weaviate-ts-client';
import { ApiKey } from 'weaviate-ts-client'; // 用于API密钥认证

const client = weaviate.client({
  scheme: 'https',
  host: 'your-cluster-id.weaviate.network', // 替换为你的WCS集群URL[citation:2]
  apiKey: new ApiKey('YOUR-WEAVIATE-API-KEY'), // 替换为你的API密钥[citation:1]
  headers: {
    'X-OpenAI-Api-Key': 'YOUR-OPENAI-API-KEY' // 如果使用OpenAI模块[citation:2]
  }
});

// 或者，连接本地运行的Docker实例
const localClient = weaviate.client({
  scheme: 'http',
  host: '192.168.0.175:8080',
});

// 检查连接是否就绪
console.log(await client.misc.liveChecker().do());