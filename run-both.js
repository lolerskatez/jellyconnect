#!/usr/bin/env node

/**
 * Script to run both admin and public JellyConnect systems simultaneously
 * Uses unified codebase with NEXT_PUBLIC_APP_MODE environment variable
 */

const { spawn } = require('child_process')
const path = require('path')

console.log('🚀 Starting JellyConnect Admin and Public systems...\n')

// Start Admin System (Port 3000)
console.log('📊 Starting Admin System on port 3000...')
const adminProcess = spawn('npm', [
  'run', 'dev:admin'
], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
})

// Start Public System (Port 3001) after a short delay
setTimeout(() => {
  console.log('\n👥 Starting Public System on port 3001...')
  const publicProcess = spawn('npm', [
    'run', 'dev:public'
  ], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
  })

  // Handle process termination
  const cleanup = () => {
    console.log('\n🛑 Shutting down systems...')
    adminProcess.kill()
    publicProcess.kill()
    process.exit(0)
  }

  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)

  publicProcess.on('close', (code) => {
    if (code !== 0) {
      console.log(`\n❌ Public system exited with code ${code}`)
      adminProcess.kill()
      process.exit(code)
    }
  })

}, 3000) // Wait 3 seconds before starting public system

adminProcess.on('close', (code) => {
  if (code !== 0) {
    console.log(`\n❌ Admin system exited with code ${code}`)
    process.exit(code)
  }
})

// Handle main process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down...')
  adminProcess.kill()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...')
  adminProcess.kill()
  process.exit(0)
})
