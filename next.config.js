/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // 始终启用 standalone，供 Docker 等生产构建使用；next dev 不会生成此输出
  output: 'standalone',
  
  // 将服务端专用模块标记为 external，避免打包（chroma/amqplib 仅服务端用；postinstall 已裁剪 @chroma-core 避免 Unknown module type）
  serverExternalPackages: ['amqplib', 'chromadb', '@chroma-core/default-embed', '@chroma-core/ai-embeddings-common'],

  async rewrites() {
    console.debug('=============== >> rewrite called');
    return [
      {
        source: '/api/app/:path*',
        destination: '/api/app/:path*'
      },
      {
        source: '/app/:path*',
        destination: '/api/app/:path*'
      },
      {
        source: '/api/web/:path*',
        destination: '/api/web/:path*',
      },
      // 保证 /api/mcp 不被 /api/:path* 重写到 /api/web/mcp，必须放在 /api/:path* 之前
      {
        source: '/api/mcp',
        destination: '/api/mcp'
      },
      {
        source: '/api/mcp/:path*',
        destination: '/api/mcp/:path*'
      },
      {
        source: '/api/:path*',
        destination: '/api/web/:path*',
      },
      {
        source: '/login/:path*',
        destination: '/login/:path*'
      },
      {
        source: '/:path*',
        destination: '/'
      }
    ]
  },

  env: {
    ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY,
    ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
    VITE_INFURA_API_KEY: process.env.VITE_INFURA_API_KEY,
    SILICONFLOW_API_KEY: process.env.SILICONFLOW_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    CHROMA_URL: process.env.CHROMA_URL,
    RABBITMQ_STOMP_HOST: process.env.RABBITMQ_STOMP_HOST,
    RABBITMQ_STOMP_PORT: process.env.RABBITMQ_STOMP_PORT,
    RABBITMQ_STOMP_USER: process.env.RABBITMQ_STOMP_USER,
    RABBITMQ_STOMP_PASSWD: process.env.RABBITMQ_STOMP_PASSWD,
    RABBITMQ_STOMP_VHOST: process.env.RABBITMQ_STOMP_VHOST,
    RABBITMQ_MANAGEMENT_URL: process.env.RABBITMQ_MANAGEMENT_URL,
  },

  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
