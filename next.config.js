/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

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
