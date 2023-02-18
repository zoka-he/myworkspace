/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    console.debug('=============== >> rewrite called');
    return [
      {
        source: '/api/:path*',
        destination: '/api'
      },
      {
        source: '/:path*',
        destination: '/'
      }
    ]
  }
}

module.exports = nextConfig
