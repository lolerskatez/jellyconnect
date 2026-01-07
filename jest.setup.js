import '@testing-library/jest-dom'

// Set up test environment variables
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-jest-development-only';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret-for-jest-development-only';
process.env.JELLYFIN_SERVER_URL = 'http://test-jellyfin:8096';
process.env.JELLYFIN_API_KEY = 'test-api-key';