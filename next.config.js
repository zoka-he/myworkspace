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
        destination: '/api/app/:path*',
      },
      {
        source: '/app/:path*',
        destination: '/api/app/:path*',
      },
      {
        source: '/api/web/:path*',
        destination: '/api/web/:path*',
      },
      {
        // Backward-compatible alias: worldview -> worldView
        source: '/api/web/aiNoval/worldview/:path*',
        destination: '/api/web/aiNoval/worldView/:path*',
      },
      {
        // Backward-compatible alias when calling through /api/*
        source: '/api/aiNoval/worldview/:path*',
        destination: '/api/web/aiNoval/worldView/:path*',
      },
      {
        source: '/api/mcp',
        destination: '/api/mcp',
      },
      {
        source: '/api/mcp/:path*',
        destination: '/api/mcp/:path*',
      },
      {
        source: '/api/:path*',
        destination: '/api/web/:path*',
      },
      {
        source: '/login/:path*',
        destination: '/login/:path*',
      },
    ];
  },

  env: {
    ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY,
    ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
    VITE_INFURA_API_KEY: process.env.VITE_INFURA_API_KEY,
    SILICONFLOW_API_KEY: process.env.SILICONFLOW_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  // 避免被上层 yarn.lock 影响 root 推断，确保生产/开发使用当前项目依赖
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
