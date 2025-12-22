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
    'http://localhost:3000',
    'http://localhost:3001',
    'http://192.168.1.125:3000',
    'http://192.168.1.125:3001',
  ],
}

module.exports = nextConfig