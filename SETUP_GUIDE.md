# Setup and Running Guide

## ✅ Completed Steps

1. ✅ NextAuth secret generated and added to `.env.local`
2. ✅ Database schema pushed to Neon PostgreSQL
3. ✅ pgvector extension enabled

## 📋 Next Steps

### 1. Get API Keys

See `API_KEYS_SETUP.md` for detailed instructions on where to get:
- **Anthropic API Key** (required) - for Claude content generation
- **Voyage AI API Key** OR **OpenAI API Key** (required) - for embeddings

Once you have the keys, update `.env.local`:
```env
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
VOYAGE_API_KEY=your-voyage-key-here
# OR use OpenAI instead:
# EMBEDDING_API_KEY=sk-your-openai-key-here
```

### 2. Set Up Redis (for Background Jobs)

**Option A: Local Redis (Recommended for Development)**
```bash
# Windows (using Chocolatey)
choco install redis-64

# Or download from: https://github.com/microsoftarchive/redis/releases
# Then start Redis:
redis-server
```

**Option B: Redis Cloud (Free tier available)**
1. Go to https://redis.com/try-free/
2. Create a free account
3. Create a database
4. Copy the connection URL
5. Update `.env.local`:
```env
REDIS_URL=redis://your-redis-url
```

**Option C: Skip Redis for now** (some features won't work)
- Crawling, analysis, matching, and generation jobs require Redis
- You can still use the UI and view data, but background jobs won't run

### 3. Start the Application

**Terminal 1: Development Server**
```bash
npm run dev
```

The app will be available at: http://localhost:3000

**Terminal 2: Background Workers** (if you have Redis)
```bash
# Create a worker script (see below)
node workers.js
```

### 4. Create Your First User

1. Go to http://localhost:3000/register
2. Create an account
3. Log in

### 5. Start Using the App

1. **Create a Project**: Click "+ New Project" in the sidebar
2. **Start Crawling**: Go to your project → "Start Crawl"
3. **Analyze Pages**: After crawling, analyze pages to generate embeddings
4. **Create Pillars**: Define content pillars for your migration
5. **Match Content**: Match crawled pages to pillars
6. **Generate Drafts**: Generate GEO-optimized content
7. **Review & Export**: Edit drafts and export when approved

## 🚀 Quick Start (Without Background Jobs)

If you want to test the UI without setting up Redis:

1. Update `.env.local` with your API keys
2. Run `npm run dev`
3. Navigate to http://localhost:3000
4. Register and log in
5. Create a project (crawling won't work without Redis, but you can explore the UI)

## 📝 Notes

- Background jobs (crawling, analysis, matching, generation) require Redis
- The app will work for viewing data and creating projects without Redis
- For production, you'll need to set up proper worker processes
