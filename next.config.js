/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',

  // Configure port based on APP_MODE
  serverRuntimeConfig: {
    port: process.env.APP_MODE === 'public'
      ? parseInt(process.env.PUBLIC_PORT || '3001')
      : parseInt(process.env.ADMIN_PORT || '3000')
  },

  // Make APP_MODE available to the client
  publicRuntimeConfig: {
    appMode: process.env.APP_MODE || 'admin'
  },

  // Environment variables to expose to the client
  env: {
    NEXT_PUBLIC_APP_MODE: process.env.APP_MODE || 'admin'
  },

  // Allow cross-origin dev requests from local network
  allowedDevOrigins: [
    'http://localhost:3010',
    'http://localhost:3020',
    'http://100.74.214.67:3010',
    'http://100.74.214.67:3020',
    'http://192.168.1.125:3010',
    'http://192.168.1.125:3020',
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