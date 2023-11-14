/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',

  async rewrites() {
    console.debug('=============== >> rewrite called');
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
      {
        source: '/app/:path*',
        destination: '/app/:path*'
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
  }
}

module.exports = nextConfig
