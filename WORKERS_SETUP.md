# Workers Setup Guide

## ⚠️ Important: Workers Must Be Running

Background jobs (crawling, analysis, matching, generation) require a **separate worker process** to be running. The main Next.js server only queues jobs - it doesn't process them.

## Quick Start

You need **TWO terminals** running:

### Terminal 1: Next.js Development Server
```bash
npm run dev
```
This runs the web application at http://localhost:3000

### Terminal 2: Background Workers
```bash
npm run workers
```

You should see output like:
```
✅ Redis URL loaded: redis://default:****@...
🚀 Starting background workers...
✅ Worker [crawl] initialized and listening for jobs
✅ Worker [analysis] initialized and listening for jobs
✅ Worker [match] initialized and listening for jobs
✅ Worker [generation] initialized and listening for jobs
✅ Workers started for: crawl, analysis, match, generation
📊 Listening for jobs...
Press Ctrl+C to stop
```

## Troubleshooting

### Job Stuck in "Pending" Status

If your crawl job stays in "pending" status:

1. **Check if workers are running**: Look for the worker terminal output
2. **Check Redis connection**: Make sure `REDIS_URL` is set in `.env.local`
3. **Check worker logs**: Look for error messages in the worker terminal
4. **Restart workers**: Stop (Ctrl+C) and restart `npm run workers`

### Common Issues

**"REDIS_URL not found"**
- Make sure `.env.local` exists and contains `REDIS_URL=...`
- The workers script loads `.env.local` automatically

**"Redis connection error"**
- Verify your Redis server is running
- Check that `REDIS_URL` is correct
- For Redis Cloud, make sure the database is active

**Workers start but jobs don't process**
- Check the worker terminal for error messages
- Verify the job was actually queued (check API response)
- Try restarting the workers

## Production Deployment

In production, you'll need to:
1. Run workers as a separate service/process
2. Use a process manager (PM2, systemd, etc.)
3. Set up monitoring and auto-restart for workers

## Development Tips

- Keep the worker terminal visible to see job progress
- Worker logs show when jobs start, complete, or fail
- You can run multiple worker processes for parallel processing (not recommended for development)
