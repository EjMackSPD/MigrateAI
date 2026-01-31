# Redis Setup Guide

## ⚠️ Eviction Policy Warning

If you see warnings about "Eviction policy is volatile-lru. It should be 'noeviction'", this is a BullMQ recommendation. 

**For Redis Cloud (Free Tier):**
- The warning is safe to ignore for development
- Jobs will still work, but there's a small risk of data loss if Redis runs out of memory
- Redis Cloud free tier uses `volatile-lru` by default and cannot be changed

**For Production:**
- Configure Redis with `maxmemory-policy noeviction` 
- This prevents Redis from evicting job data
- See your Redis provider's documentation for how to change this setting

## Quick Setup

## Getting Your Redis Connection URL

### If using Redis Cloud:

1. **Log in to Redis Cloud**: https://app.redislabs.com/
2. **Go to your database**:
   - Click on "Databases" in the left sidebar
   - Click on your database name
3. **Get the connection URL**:
   - Look for "Endpoint" or "Public endpoint"
   - You'll see something like: `redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345`
   - You'll also need your password (found in the database settings)
4. **Format the connection URL**:
   ```
   redis://default:YOUR_PASSWORD@redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345
   ```
   Or if you have a username:
   ```
   redis://USERNAME:PASSWORD@HOST:PORT
   ```

### If using local Redis:

If you installed Redis locally, the URL is:
```
redis://localhost:6379
```

(No password needed for local Redis by default)

## Update .env.local

Add or update this line in your `.env.local` file:

```env
REDIS_URL=redis://default:YOUR_PASSWORD@your-redis-host:port
```

Replace:
- `YOUR_PASSWORD` with your actual Redis password
- `your-redis-host` with your Redis hostname
- `port` with your Redis port (usually 12345 or 6379)

## Example

If your Redis Cloud endpoint is:
- Host: `redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com`
- Port: `12345`
- Password: `MySecurePassword123`

Then your `.env.local` should have:
```env
REDIS_URL=redis://default:MySecurePassword123@redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345
```

## Testing the Connection

After updating `.env.local`, you can test the connection by running:
```bash
node -e "const Redis = require('ioredis'); const redis = new Redis(process.env.REDIS_URL); redis.ping().then(r => console.log('✅ Redis connected!', r)).catch(e => console.error('❌ Redis error:', e.message));"
```

Or start the workers to test:
```bash
node workers.js
```

If you see "Workers started", the connection is working!
