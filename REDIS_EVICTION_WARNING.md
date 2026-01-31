# Redis Eviction Policy Warning

## What You're Seeing

If you see repeated warnings like:
```
IMPORTANT! Eviction policy is volatile-lru. It should be "noeviction"
```

This is a **BullMQ warning**, not an error. Your workers are still functioning correctly.

## What It Means

- **Eviction policy** controls what Redis does when it runs out of memory
- `volatile-lru` = Redis may delete keys to free up memory (Least Recently Used)
- `noeviction` = Redis won't delete keys (recommended for job queues)

## Is This a Problem?

**For Development (Redis Cloud Free Tier):**
- ✅ **Safe to ignore** - Jobs will still work
- ⚠️ Small risk: If Redis runs out of memory, some job data might be deleted
- Redis Cloud free tier uses `volatile-lru` by default and cannot be changed

**For Production:**
- ⚠️ Should configure Redis with `noeviction` policy
- Prevents any risk of job data loss
- Check your Redis provider's documentation for how to change this

## How to Suppress the Warning (Optional)

The warning is informational and helps ensure data safety. However, if it's cluttering your logs, you can:

1. **Ignore it** - It's just a warning, not an error
2. **Use a different Redis instance** - Local Redis or paid Redis Cloud tier allows policy changes
3. **Filter logs** - Use log filtering tools to hide these specific messages

## Bottom Line

✅ **Your workers are working correctly**  
✅ **Jobs will process normally**  
⚠️ **For production, consider upgrading Redis to allow policy changes**

The warning is BullMQ being helpful by alerting you to a potential configuration issue, but it won't prevent your application from functioning.
