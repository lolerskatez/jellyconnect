// Quick script to test rate limit status
// Run: node reset-rate-limits.js

const fetch = require('node-fetch');

async function testLogin() {
  const baseUrl = 'http://localhost:3100'; // or your deployed URL
  
  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'test',
        password: 'test'
      })
    });
    
    console.log('Status:', response.status);
    console.log('Rate Limit Info:');
    console.log('  Limit:', response.headers.get('X-RateLimit-Limit'));
    console.log('  Remaining:', response.headers.get('X-RateLimit-Remaining'));
    console.log('  Reset:', response.headers.get('X-RateLimit-Reset'));
    
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLogin();
