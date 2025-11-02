/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',

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

  webpack: ( config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack } ) => {
    // Important: return the modified config
    console.debug('config.module', config.module);

    return config;
  },

  eslint: {
    ignoreDuringBuilds: true, // 允许生产构建在存在 ESLint 错误时成功完成
  },

  typescript: {
    ignoreBuildErrors: true, // 忽略类型错误，但仍然会运行类型检查
  },
}

module.exports = nextConfig
