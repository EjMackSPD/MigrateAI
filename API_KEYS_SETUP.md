# API Keys Setup Guide

## 1. Anthropic API Key (Claude)

**Where to get it:**
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to "API Keys" in the dashboard
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-`)

**Add to .env.local:**
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

## 2. Voyage AI API Key (Embeddings - Recommended)

**Where to get it:**
1. Go to https://www.voyageai.com/
2. Sign up for an account
3. Navigate to your dashboard/API section
4. Generate an API key
5. Copy the key

**Add to .env.local:**
```
VOYAGE_API_KEY=your-voyage-key-here
```

**Note:** Voyage AI is recommended for embeddings as it's optimized for this use case.

## 3. OpenAI API Key (Alternative Embeddings)

If you prefer OpenAI instead of Voyage:

**Where to get it:**
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to "API Keys" section
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)

**Add to .env.local:**
```
EMBEDDING_API_KEY=sk-your-openai-key-here
# OR
OPENAI_API_KEY=sk-your-openai-key-here
```

**Note:** You only need ONE embedding service (either Voyage OR OpenAI, not both).

## Summary

You need:
- ✅ **Anthropic API Key** (required for content generation)
- ✅ **Voyage AI API Key** OR **OpenAI API Key** (required for embeddings)

The app will use Voyage if `VOYAGE_API_KEY` is set, otherwise it will fall back to OpenAI if `EMBEDDING_API_KEY` or `OPENAI_API_KEY` is set.
