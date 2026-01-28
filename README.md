# Content Migration & GEO Transformation Tool

A Next.js application for migrating legacy website content while simultaneously transforming it for Generative Engine Optimization (GEO).

## Features

- **Project Management**: Create and manage migration projects based on URLs
- **Web Crawling**: Automated crawling with Playwright for JavaScript-rendered content
- **Content Analysis**: Semantic analysis with embeddings, topic extraction, and quality scoring
- **Pillar-Based Organization**: Organize content around strategic pillars
- **AI-Powered Generation**: Generate GEO-optimized content using Claude API
- **Draft Editor**: Markdown editor with preview, source viewer, and version history
- **Export**: Export approved content as Markdown files with metadata and schema recommendations
- **Project Sharing**: Share projects with team members
- **User Authentication**: Secure authentication with NextAuth.js

## Tech Stack

- **Frontend/Backend**: Next.js 14+ (App Router) with TypeScript
- **Styling**: CSS Modules
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL (Neon) with pgvector extension
- **ORM**: Prisma
- **Background Jobs**: BullMQ with Redis
- **AI**: Anthropic Claude API for content generation
- **Embeddings**: Voyage AI or OpenAI
- **Crawling**: Playwright

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
- Redis (for background jobs)
- API keys:
  - Anthropic API key (for Claude)
  - Voyage AI or OpenAI API key (for embeddings)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your database URL, API keys, and other configuration.

4. Set up the database:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Start the background workers (in a separate terminal):
   ```bash
   # Workers need to be set up separately
   # See queue workers in src/lib/queue/
   ```

## Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
├── components/       # React components
├── lib/              # Utilities and services
│   ├── services/     # Business logic services
│   ├── queue/        # Background job workers
│   └── prompts/      # AI prompt templates
├── types/            # TypeScript type definitions
└── styles/           # Global styles
```

## Environment Variables

See `.env.example` for required environment variables.

## Database Schema

The application uses Prisma with PostgreSQL. Key tables:
- `users` - User accounts
- `projects` - Migration projects
- `project_members` - Project sharing
- `pages` - Crawled pages with embeddings
- `pillars` - Content pillars
- `matches` - Page-to-pillar matches
- `drafts` - Generated content drafts
- `draft_versions` - Version history
- `jobs` - Background job tracking

## License

MIT
