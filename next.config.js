/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',

  // Configure port for single service
  serverRuntimeConfig: {
    port: parseInt(process.env.PORT || '3100')
  },

  // Allow cross-origin dev requests from local network
  allowedDevOrigins: [
    'http://localhost:3100',
    'http://100.74.214.67:3100',
    'http://192.168.1.125:3100',
  ],

  // Trust proxy headers for reverse proxy setup
  serverExternalPackages: [],

  // Trust hosts behind proxy
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Forwarded-Proto',
            value: 'https'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig