/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // output: 'standalone' 只在生产构建时使用，开发模式会导致构建清单文件缺失
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),

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

  // webpack: ( config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack } ) => {
  //   // Important: return the modified config
  //   // console.debug('config.module', config.module);
  //   config.plugins.push(new webpack.DefinePlugin({
  //     'process.env.ETHERSCAN_API_KEY': JSON.stringify(process.env.ETHERSCAN_API_KEY),
  //     'process.env.VITE_INFURA_API_KEY': JSON.stringify(process.env.VITE_INFURA_API_KEY),
  //   }));

  //   return config;
  // },
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

  // eslint: {
  //   ignoreDuringBuilds: true, // 允许生产构建在存在 ESLint 错误时成功完成
  // },

  typescript: {
    ignoreBuildErrors: true, // 忽略类型错误，但仍然会运行类型检查
  },
}

module.exports = nextConfig
