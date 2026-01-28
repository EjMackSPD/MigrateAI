// Quick Redis connection test
require('dotenv').config({ path: '.env.local' })

const Redis = require('ioredis')

async function testRedis() {
  const redisUrl = process.env.REDIS_URL
  
  if (!redisUrl) {
    console.error('❌ REDIS_URL not found in .env.local')
    process.exit(1)
  }

  console.log('🔌 Testing Redis connection...')
  console.log('📍 URL:', redisUrl.replace(/:[^:@]+@/, ':****@')) // Hide password

  try {
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          return null // Stop retrying
        }
        return Math.min(times * 200, 2000)
      }
    })

    // Test connection
    const result = await redis.ping()
    console.log('✅ Redis connected successfully!')
    console.log('📊 Response:', result)
    
    // Test set/get
    await redis.set('test:connection', 'ok', 'EX', 10)
    const value = await redis.get('test:connection')
    console.log('✅ Read/Write test passed:', value)
    
    await redis.quit()
    console.log('✅ Connection closed. Redis is ready to use!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Redis connection failed:')
    console.error('   Error:', error.message)
    console.error('\n💡 Check:')
    console.error('   1. Is your Redis database running?')
    console.error('   2. Is the URL correct in .env.local?')
    console.error('   3. Is the password correct?')
    console.error('   4. Are firewall rules allowing your IP?')
    process.exit(1)
  }
}

testRedis()
