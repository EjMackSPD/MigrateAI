# Content Migration & GEO Transformation Tool

## Specification Document v1.0

**Project Codename**: Pilot (or rename as desired)
**Document Version**: 1.0
**Last Updated**: January 2025

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [Technical Architecture](#4-technical-architecture)
5. [Database Schema](#5-database-schema)
6. [API Specification](#6-api-specification)
7. [Core Components](#7-core-components)
8. [GEO Content Framework](#8-geo-content-framework)
9. [User Interface Specifications](#9-user-interface-specifications)
10. [Technology Stack](#10-technology-stack)
11. [File Structure](#11-file-structure)
12. [Build Phases](#12-build-phases)
13. [Future Considerations](#13-future-considerations)

---

## 1. Executive Summary

This tool enables content teams to efficiently migrate legacy website content to new platforms while simultaneously transforming that content to be optimized for Generative Engine Optimization (GEO), Answer Engine Optimization (AEO), and Conversational Engine Optimization (CEO).

The tool crawls legacy websites, analyzes and indexes content semantically, allows administrators to define strategic content pillars, matches legacy content to those pillars, generates GEO-optimized drafts using AI, facilitates human review and editing, and exports finalized content as portable Markdown files with metadata.

### Key Value Propositions

- **Efficiency**: Reduce content migration time by 60-80% through automated crawling, matching, and draft generation
- **Quality**: Ensure all migrated content follows GEO best practices from the start
- **Strategy**: Enable strategic content reorganization around pillars rather than 1:1 page migration
- **Control**: Maintain human oversight with required editorial review before any content is finalized

---

## 2. Problem Statement

### The Challenge

Clients with hundreds or thousands of legacy web pages face a massive undertaking when migrating to a new website. Traditional approaches involve:

1. Manual page-by-page analysis to determine what content has value
2. Copy-paste migration that preserves outdated SEO patterns
3. Retroactive optimization for modern search requirements
4. Significant time and labor costs

### The Compounding Factor: AI Search

The rise of AI-powered search (ChatGPT, Google AI Overviews, Perplexity, etc.) has fundamentally changed how content needs to be structured. Content optimized for traditional SEO often performs poorly in AI contexts because:

- It's keyword-stuffed rather than conversationally written
- It lacks clear, extractable answers
- It doesn't include structured data for AI consumption
- It lacks authority signals (authorship, credentials, citations)

### The Opportunity

By combining migration with GEO transformation, we can:

- Extract value from legacy content without preserving its outdated structure
- Reorganize content around strategic pillars rather than legacy site architecture
- Generate AI-optimized drafts that editors refine rather than create from scratch
- Deliver migration projects faster while producing higher-quality outcomes

---

## 3. Solution Overview

### Core Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   INGEST           ANALYZE          CONFIGURE        MATCH                  │
│   ──────           ───────          ─────────        ─────                  │
│   Crawl legacy     Extract topics,  Define content   Find relevant          │
│   site content     generate         pillars &        legacy content         │
│                    embeddings       strategy         per pillar             │
│                                                                             │
│   GENERATE         REVIEW           EXPORT                                  │
│   ────────         ──────           ──────                                  │
│   Create GEO-      Human editor     Markdown files                          │
│   optimized        refines &        with metadata                           │
│   drafts           approves         & schema recs                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **Admin** | System administrator | Full access, user management, system settings |
| **Project Lead** | Manages migration projects | Create projects, configure pillars, approve content |
| **Editor** | Reviews and refines content | Edit drafts, submit for approval, export |

For v1.0, we assume a small team (1-2 people) and can simplify to a single authenticated user role with full permissions.

### Key Principles

1. **Human in the Loop**: All generated content requires human review and approval
2. **Source Traceability**: Every generated piece links back to its source content
3. **Strategic Flexibility**: Pillars and matching can be reconfigured as strategy evolves
4. **Portable Output**: Markdown + JSON exports work with any downstream system

---

## 4. Technical Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     React SPA (Single Page App)                       │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │  │
│  │  │Projects │ │ Crawl   │ │ Pillars │ │ Content │ │ Review  │         │  │
│  │  │ List    │ │ Status  │ │ Config  │ │ Match   │ │ Editor  │         │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP/REST
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     FastAPI Application                               │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │  │
│  │  │  Projects   │ │   Crawl     │ │   Pillars   │ │  Content    │     │  │
│  │  │  Router     │ │   Router    │ │   Router    │ │  Router     │     │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                     │  │
│  │  │ Generation  │ │   Export    │ │    Auth     │                     │  │
│  │  │   Router    │ │   Router    │ │   Router    │                     │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘                     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────────────┐
│    SERVICE LAYER      │ │   QUEUE LAYER     │ │    EXTERNAL SERVICES      │
│  ┌─────────────────┐  │ │ ┌───────────────┐ │ │  ┌─────────────────────┐  │
│  │ Crawl Service   │  │ │ │ Redis Queue   │ │ │  │   Claude API        │  │
│  │ Content Service │  │ │ │               │ │ │  │   (Generation)      │  │
│  │ Match Service   │  │ │ │ Celery Workers│ │ │  └─────────────────────┘  │
│  │ Generate Service│  │ │ │ - crawl_task  │ │ │  ┌─────────────────────┐  │
│  │ Export Service  │  │ │ │ - embed_task  │ │ │  │   Embedding Model   │  │
│  └─────────────────┘  │ │ │ - gen_task    │ │ │  │   (Voyage/OpenAI)   │  │
│                       │ │ └───────────────┘ │ │  └─────────────────────┘  │
└───────────────────────┘ └───────────────────┘ └───────────────────────────┘
                    │                                       
                    ▼                                       
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                PostgreSQL + pgvector                                  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │  │
│  │  │ projects │ │  pages   │ │ pillars  │ │ matches  │ │  drafts  │    │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Request Flow Examples

**Crawl Initiation:**
```
User clicks "Start Crawl" 
  → POST /api/projects/{id}/crawl
  → API enqueues crawl_task to Redis
  → Returns job_id immediately
  → Celery worker picks up task
  → Worker crawls pages, stores in DB
  → Worker updates job status
  → Frontend polls GET /api/jobs/{job_id} for status
```

**Content Generation:**
```
User selects pages, clicks "Generate Draft"
  → POST /api/pillars/{id}/generate
  → API enqueues generation_task
  → Worker retrieves source content
  → Worker calls Claude API with GEO framework prompt
  → Worker stores draft in DB
  → Frontend receives notification, displays draft
```

---

## 5. Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   projects  │       │    pages    │       │   pillars   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │──┐    │ id (PK)     │    ┌──│ id (PK)     │
│ name        │  │    │ project_id  │────┘  │ project_id  │──┐
│ client_name │  └───▶│ (FK)        │       │ (FK)        │  │
│ base_url    │       │ url         │       │ name        │  │
│ description │       │ title       │       │ description │  │
│ status      │       │ content     │       │ target_aud  │  │
│ created_at  │       │ raw_html    │       │ themes      │  │
│ updated_at  │       │ word_count  │       │ tone_notes  │  │
└─────────────┘       │ content_type│       │ priority    │  │
                      │ topics[]    │       │ created_at  │  │
                      │ quality_scr │       └─────────────┘  │
                      │ embedding   │              │         │
                      │ crawled_at  │              │         │
                      │ status      │              │         │
                      └─────────────┘              │         │
                             │                    │         │
                             │    ┌───────────────┘         │
                             ▼    ▼                         │
                      ┌─────────────┐                       │
                      │   matches   │                       │
                      ├─────────────┤                       │
                      │ id (PK)     │                       │
                      │ page_id(FK) │                       │
                      │ pillar_id   │───────────────────────┘
                      │ (FK)        │
                      │ relevance   │
                      │ is_selected │
                      │ matched_at  │
                      └─────────────┘
                             │
                             ▼
                      ┌─────────────┐       ┌─────────────┐
                      │   drafts    │       │  versions   │
                      ├─────────────┤       ├─────────────┤
                      │ id (PK)     │──────▶│ id (PK)     │
                      │ pillar_id   │       │ draft_id(FK)│
                      │ (FK)        │       │ content     │
                      │ title       │       │ version_num │
                      │ content     │       │ created_by  │
                      │ content_type│       │ created_at  │
                      │ source_ids[]│       │ notes       │
                      │ status      │       └─────────────┘
                      │ created_at  │
                      │ updated_at  │
                      │ approved_at │
                      │ approved_by │
                      └─────────────┘
```

### Table Definitions

#### projects
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',  -- active, paused, completed, archived
    settings JSONB DEFAULT '{}',  -- crawl settings, preferences
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_client ON projects(client_name);
```

#### pages
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    url VARCHAR(2000) NOT NULL,
    url_hash VARCHAR(64) NOT NULL,  -- SHA256 for deduplication
    title VARCHAR(500),
    meta_description TEXT,
    raw_html TEXT,
    extracted_content TEXT,  -- Clean flat text (for embeddings)
    structured_content TEXT,  -- Semantic Markdown preserving headings, lists, FAQ, tables
    word_count INTEGER,
    content_type VARCHAR(50),  -- blog, product, faq, landing, about, etc.
    detected_topics TEXT[],  -- Array of topic strings
    quality_score DECIMAL(3,2),  -- 0.00 to 1.00
    embedding vector(1536),  -- For semantic search (dimension depends on model)
    crawl_depth INTEGER,  -- How many clicks from base_url
    status VARCHAR(50) DEFAULT 'crawled',  -- crawled, analyzed, matched, used
    crawled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    analyzed_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(project_id, url_hash)
);

CREATE INDEX idx_pages_project ON pages(project_id);
CREATE INDEX idx_pages_status ON pages(status);
CREATE INDEX idx_pages_content_type ON pages(content_type);
CREATE INDEX idx_pages_embedding ON pages USING ivfflat (embedding vector_cosine_ops);
```

#### pillars
```sql
CREATE TABLE pillars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,  -- Used for semantic matching
    target_audience TEXT,
    key_themes TEXT[],  -- Array of theme strings
    tone_notes TEXT,
    primary_keywords TEXT[],
    priority INTEGER DEFAULT 0,  -- Higher = more important
    status VARCHAR(50) DEFAULT 'active',  -- active, paused, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(project_id, slug)
);

CREATE INDEX idx_pillars_project ON pillars(project_id);
CREATE INDEX idx_pillars_status ON pillars(status);
```

#### matches
```sql
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    pillar_id UUID NOT NULL REFERENCES pillars(id) ON DELETE CASCADE,
    relevance_score DECIMAL(5,4),  -- 0.0000 to 1.0000
    is_selected BOOLEAN DEFAULT FALSE,  -- User confirmed this match
    is_excluded BOOLEAN DEFAULT FALSE,  -- User explicitly excluded
    matched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    selected_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(page_id, pillar_id)
);

CREATE INDEX idx_matches_pillar ON matches(pillar_id);
CREATE INDEX idx_matches_page ON matches(page_id);
CREATE INDEX idx_matches_selected ON matches(pillar_id, is_selected) WHERE is_selected = TRUE;
```

#### drafts
```sql
CREATE TABLE drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pillar_id UUID NOT NULL REFERENCES pillars(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,  -- Markdown content
    content_type VARCHAR(50) NOT NULL,  -- pillar_page, article, faq, glossary, comparison
    source_page_ids UUID[],  -- Array of page IDs used as source
    schema_recommendations JSONB,  -- Structured data suggestions
    generation_prompt TEXT,  -- The prompt used (for debugging/iteration)
    status VARCHAR(50) DEFAULT 'draft',  -- draft, in_review, approved, exported
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by VARCHAR(255),
    exported_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(pillar_id, slug)
);

CREATE INDEX idx_drafts_pillar ON drafts(pillar_id);
CREATE INDEX idx_drafts_status ON drafts(status);
```

#### draft_versions
```sql
CREATE TABLE draft_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    change_notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(draft_id, version_number)
);

CREATE INDEX idx_versions_draft ON draft_versions(draft_id);
```

#### jobs (for tracking async tasks)
```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL,  -- crawl, analyze, match, generate
    status VARCHAR(50) DEFAULT 'pending',  -- pending, running, completed, failed
    progress INTEGER DEFAULT 0,  -- 0-100
    total_items INTEGER,
    processed_items INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_jobs_project ON jobs(project_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(job_type);
```

---

## 6. API Specification

### Base URL
```
Production: https://api.yourdomain.com/v1
Development: http://localhost:8000/api/v1
```

### Authentication
For v1.0, simple API key authentication:
```
Header: X-API-Key: <api_key>
```

### Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Projects** | | |
| GET | /projects | List all projects |
| POST | /projects | Create a new project |
| GET | /projects/{id} | Get project details |
| PUT | /projects/{id} | Update project |
| DELETE | /projects/{id} | Delete project |
| **Crawling** | | |
| POST | /projects/{id}/crawl | Start crawling a project |
| GET | /projects/{id}/pages | List crawled pages |
| GET | /pages/{id} | Get page details |
| POST | /projects/{id}/analyze | Analyze/embed crawled pages |
| **Pillars** | | |
| GET | /projects/{id}/pillars | List pillars for project |
| POST | /projects/{id}/pillars | Create a pillar |
| GET | /pillars/{id} | Get pillar details |
| PUT | /pillars/{id} | Update pillar |
| DELETE | /pillars/{id} | Delete pillar |
| **Matching** | | |
| POST | /pillars/{id}/match | Find matching pages |
| GET | /pillars/{id}/matches | List matches for pillar |
| PUT | /matches/{id} | Update match (select/exclude) |
| POST | /pillars/{id}/matches/bulk | Bulk update matches |
| **Generation** | | |
| POST | /pillars/{id}/generate | Generate draft from matches |
| GET | /pillars/{id}/drafts | List drafts for pillar |
| GET | /drafts/{id} | Get draft details |
| PUT | /drafts/{id} | Update draft content |
| POST | /drafts/{id}/approve | Approve draft |
| GET | /drafts/{id}/versions | List draft versions |
| **Export** | | |
| POST | /projects/{id}/export | Export all approved drafts |
| POST | /pillars/{id}/export | Export pillar drafts |
| GET | /exports/{id} | Download export file |
| **Jobs** | | |
| GET | /jobs/{id} | Get job status |
| GET | /projects/{id}/jobs | List jobs for project |

### Detailed Endpoint Specifications

#### POST /projects
Create a new migration project.

**Request:**
```json
{
  "name": "Acme Learning Migration",
  "client_name": "Acme Learning Corp",
  "base_url": "https://www.acmelearning.com",
  "description": "Migration of corporate training content to new platform",
  "settings": {
    "crawl_depth": 5,
    "respect_robots": true,
    "rate_limit_ms": 1000,
    "exclude_patterns": ["/admin/*", "/login/*"]
  }
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Acme Learning Migration",
  "client_name": "Acme Learning Corp",
  "base_url": "https://www.acmelearning.com",
  "description": "Migration of corporate training content to new platform",
  "status": "active",
  "settings": {
    "crawl_depth": 5,
    "respect_robots": true,
    "rate_limit_ms": 1000,
    "exclude_patterns": ["/admin/*", "/login/*"]
  },
  "stats": {
    "pages_crawled": 0,
    "pages_analyzed": 0,
    "pillars_count": 0,
    "drafts_count": 0,
    "drafts_approved": 0
  },
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

#### POST /projects/{id}/crawl
Initiate crawling of a project's base URL.

**Request:**
```json
{
  "max_pages": 500,
  "crawl_depth": 5,
  "include_patterns": ["/blog/*", "/resources/*", "/about/*"],
  "exclude_patterns": ["/admin/*", "/cart/*"]
}
```

**Response:**
```json
{
  "job_id": "660e8400-e29b-41d4-a716-446655440001",
  "status": "pending",
  "message": "Crawl job queued successfully"
}
```

#### GET /projects/{id}/pages
List crawled pages with filtering and pagination.

**Query Parameters:**
- `status`: Filter by status (crawled, analyzed, matched, used)
- `content_type`: Filter by detected content type
- `search`: Full-text search in title/content
- `min_quality`: Minimum quality score (0-1)
- `page`: Page number (default 1)
- `per_page`: Items per page (default 50, max 200)

**Response:**
```json
{
  "items": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "url": "https://www.acmelearning.com/blog/effective-onboarding",
      "title": "5 Keys to Effective Onboarding Training Programs",
      "meta_description": "Learn the essential components of...",
      "word_count": 1240,
      "content_type": "blog",
      "detected_topics": ["onboarding", "training", "employee development"],
      "quality_score": 0.85,
      "status": "analyzed",
      "crawled_at": "2025-01-15T11:00:00Z"
    }
  ],
  "total": 342,
  "page": 1,
  "per_page": 50,
  "pages": 7
}
```

#### POST /projects/{id}/pillars
Create a content pillar.

**Request:**
```json
{
  "name": "Corporate Training Strategies",
  "description": "Comprehensive strategies for designing, implementing, and measuring effective corporate training programs. Covers needs assessment, instructional design, delivery methods, and ROI measurement.",
  "target_audience": "L&D professionals, HR managers, training coordinators at mid-to-large enterprises",
  "key_themes": [
    "training needs assessment",
    "instructional design",
    "learning objectives",
    "training delivery methods",
    "training evaluation and ROI"
  ],
  "tone_notes": "Professional but accessible. Emphasize practical, actionable advice. Reference industry research where relevant.",
  "primary_keywords": [
    "corporate training",
    "employee training programs",
    "training strategy"
  ],
  "priority": 1
}
```

**Response:**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Corporate Training Strategies",
  "slug": "corporate-training-strategies",
  "description": "Comprehensive strategies for designing...",
  "target_audience": "L&D professionals, HR managers...",
  "key_themes": ["training needs assessment", "..."],
  "tone_notes": "Professional but accessible...",
  "primary_keywords": ["corporate training", "..."],
  "priority": 1,
  "status": "active",
  "stats": {
    "matched_pages": 0,
    "selected_pages": 0,
    "drafts_count": 0,
    "drafts_approved": 0
  },
  "created_at": "2025-01-15T12:00:00Z"
}
```

#### POST /pillars/{id}/match
Find pages that match a pillar's description.

**Request:**
```json
{
  "min_relevance": 0.7,
  "max_results": 100,
  "include_previously_matched": false
}
```

**Response:**
```json
{
  "job_id": "990e8400-e29b-41d4-a716-446655440004",
  "status": "pending",
  "message": "Matching job queued"
}
```

#### GET /pillars/{id}/matches
Get matched pages for a pillar.

**Response:**
```json
{
  "pillar_id": "880e8400-e29b-41d4-a716-446655440003",
  "matches": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440005",
      "page": {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "url": "https://www.acmelearning.com/blog/effective-onboarding",
        "title": "5 Keys to Effective Onboarding Training Programs",
        "word_count": 1240,
        "content_type": "blog"
      },
      "relevance_score": 0.94,
      "is_selected": true,
      "is_excluded": false,
      "matched_at": "2025-01-15T12:30:00Z"
    }
  ],
  "total": 42,
  "selected_count": 8,
  "excluded_count": 3
}
```

#### POST /pillars/{id}/generate
Generate a draft from selected matches.

**Request:**
```json
{
  "content_type": "pillar_page",
  "title_suggestion": "The Complete Guide to Corporate Training",
  "additional_guidance": "Emphasize ROI and measurement. Include a section on remote/hybrid training considerations.",
  "source_page_ids": [
    "770e8400-e29b-41d4-a716-446655440002",
    "770e8400-e29b-41d4-a716-446655440006"
  ]
}
```

**Content Types:**
- `pillar_page`: Comprehensive hub content
- `supporting_article`: Detailed subtopic article
- `faq_page`: Consolidated Q&A
- `glossary`: Definition-focused reference
- `comparison`: Side-by-side evaluation

**Response:**
```json
{
  "job_id": "bb0e8400-e29b-41d4-a716-446655440007",
  "status": "pending",
  "message": "Generation job queued"
}
```

#### GET /drafts/{id}
Get draft details including content.

**Response:**
```json
{
  "id": "cc0e8400-e29b-41d4-a716-446655440008",
  "pillar_id": "880e8400-e29b-41d4-a716-446655440003",
  "title": "The Complete Guide to Corporate Training",
  "slug": "complete-guide-corporate-training",
  "content": "# The Complete Guide to Corporate Training\n\nEffective corporate training...",
  "content_type": "pillar_page",
  "source_pages": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "url": "https://www.acmelearning.com/blog/effective-onboarding",
      "title": "5 Keys to Effective Onboarding Training Programs"
    }
  ],
  "schema_recommendations": {
    "article": {
      "@type": "Article",
      "headline": "The Complete Guide to Corporate Training",
      "author": "[PLACEHOLDER]",
      "datePublished": "[PLACEHOLDER]"
    },
    "faq": {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is corporate training?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "..."
          }
        }
      ]
    }
  },
  "status": "draft",
  "current_version": 1,
  "created_at": "2025-01-15T13:00:00Z",
  "updated_at": "2025-01-15T13:00:00Z"
}
```

#### PUT /drafts/{id}
Update draft content.

**Request:**
```json
{
  "title": "The Complete Guide to Corporate Training in 2025",
  "content": "# The Complete Guide to Corporate Training in 2025\n\nUpdated content...",
  "change_notes": "Updated title with year, refined introduction"
}
```

#### POST /projects/{id}/export
Export all approved drafts for a project.

**Request:**
```json
{
  "format": "markdown",
  "include_metadata": true,
  "include_schema_files": true
}
```

**Response:**
```json
{
  "export_id": "dd0e8400-e29b-41d4-a716-446655440009",
  "status": "processing",
  "download_url": null
}
```

After processing:
```json
{
  "export_id": "dd0e8400-e29b-41d4-a716-446655440009",
  "status": "completed",
  "download_url": "/exports/dd0e8400-e29b-41d4-a716-446655440009/download",
  "file_count": 24,
  "total_size_bytes": 156234
}
```

---

## 7. Core Components

### 7.1 Crawler Service

**Responsibilities:**
- Fetch web pages from legacy sites
- Handle JavaScript-rendered content
- Extract clean text content from HTML
- Respect robots.txt and rate limits
- Track crawl progress and errors

**Key Classes:**

```python
class CrawlerService:
    """Manages web crawling operations."""
    
    async def start_crawl(
        self, 
        project_id: UUID, 
        config: CrawlConfig
    ) -> Job:
        """Initialize and queue a crawl job."""
        
    async def crawl_page(
        self, 
        url: str, 
        config: CrawlConfig
    ) -> CrawledPage:
        """Fetch and extract content from a single URL."""
        
    def extract_content(
        self, 
        html: str
    ) -> ExtractedContent:
        """Extract clean text, title, meta from HTML."""
        
    def extract_links(
        self, 
        html: str, 
        base_url: str
    ) -> List[str]:
        """Extract internal links for further crawling."""


class ContentExtractor:
    """Extracts meaningful content from HTML."""
    
    def extract(self, html: str) -> ExtractedContent:
        """
        Remove boilerplate (nav, footer, sidebar, ads).
        Return main content area.
        """
        
    def detect_content_type(
        self, 
        url: str, 
        content: ExtractedContent
    ) -> str:
        """Classify page as blog, product, faq, etc."""
```

**Content Extraction Strategy:**
1. Parse HTML with Cheerio (or similar DOM parser)
2. Remove known boilerplate elements (nav, footer, aside, script, style)
3. Identify main content area using heuristics:
   - Look for `<main>`, `<article>`, `role="main"`
   - Fall back to body (with nav/footer/aside removed)
4. Extract and produce dual output:
   - **extracted_content**: Flattened plain text for embeddings and analysis
   - **structured_content**: Semantic Markdown preserving structure for migration
5. Preserve structure in structured_content:
   - Headings (H1–H6) as `#`–`######` Markdown
   - Paragraphs as plain blocks
   - Lists (ul/ol) as `-` or `1.` Markdown
   - Tables as Markdown tables
   - FAQ-style `dl/dt/dd` as `### Question` / answer blocks
   - Blockquotes as `>` Markdown

**Structured Content Format Example:**
```markdown
# Page Title

## Introduction
Opening paragraph text...

## Key Features
- Feature one
- Feature two

## FAQ
### What is X?
Answer to X.

### How does Y work?
Answer to Y.
```

The generator prefers `structured_content` when available for migration, falling back to `extracted_content`. This enables the AI to leverage section boundaries (e.g. FAQ, product specs) when transforming content.

### 7.2 Analysis Service

**Responsibilities:**
- Generate embeddings for semantic search
- Extract topics from content
- Score content quality
- Detect content type if not already classified

```python
class AnalysisService:
    """Analyzes crawled content for intelligence."""
    
    async def analyze_page(
        self, 
        page: Page
    ) -> AnalyzedPage:
        """Run full analysis pipeline on a page."""
        
    async def generate_embedding(
        self, 
        text: str
    ) -> List[float]:
        """Generate vector embedding for text."""
        
    async def extract_topics(
        self, 
        content: str
    ) -> List[str]:
        """Use LLM to extract main topics."""
        
    def calculate_quality_score(
        self, 
        page: Page
    ) -> float:
        """
        Score based on:
        - Word count (longer generally better, to a point)
        - Structure (has headings, lists)
        - Freshness (if date detectable)
        - Readability metrics
        """


class EmbeddingService:
    """Handles vector embedding generation."""
    
    async def embed_text(
        self, 
        text: str
    ) -> List[float]:
        """Generate embedding using configured model."""
        
    async def embed_batch(
        self, 
        texts: List[str]
    ) -> List[List[float]]:
        """Batch embedding for efficiency."""
```

**Topic Extraction Prompt:**
```
Analyze the following web page content and extract 3-7 main topics or themes.
Return only the topics as a JSON array of strings.
Focus on substantive topics, not generic terms.

Content:
{content}

Topics (JSON array):
```

### 7.3 Matching Service

**Responsibilities:**
- Find pages relevant to a pillar's description
- Score relevance using vector similarity
- Rank and filter results
- Track match selections

```python
class MatchingService:
    """Matches pages to content pillars."""
    
    async def find_matches(
        self, 
        pillar: Pillar, 
        config: MatchConfig
    ) -> List[Match]:
        """
        Find pages matching pillar description.
        Uses vector similarity search.
        """
        
    async def calculate_relevance(
        self, 
        pillar: Pillar, 
        page: Page
    ) -> float:
        """Calculate relevance score between pillar and page."""
        
    def rank_matches(
        self, 
        matches: List[Match]
    ) -> List[Match]:
        """
        Rank by relevance, with adjustments for:
        - Content quality
        - Word count (more content = more source material)
        - Recency if available
        """
```

**Matching Algorithm:**
1. Generate embedding for pillar description + key themes
2. Query vector index for top N similar pages
3. Calculate cosine similarity score
4. Apply quality score weighting
5. Filter by minimum relevance threshold
6. Return ranked results

### 7.4 Generation Service

**Responsibilities:**
- Construct prompts using GEO framework
- Call Claude API for content generation
- Handle different content types
- Track source attribution

```python
class GenerationService:
    """Generates GEO-optimized content using AI."""
    
    async def generate_draft(
        self, 
        pillar: Pillar,
        source_pages: List[Page],
        content_type: ContentType,
        additional_guidance: str = ""
    ) -> Draft:
        """Generate a draft from source content."""
        
    def build_prompt(
        self, 
        pillar: Pillar,
        source_pages: List[Page],
        content_type: ContentType,
        additional_guidance: str
    ) -> str:
        """Construct the generation prompt."""
        
    def extract_schema_recommendations(
        self, 
        content: str,
        content_type: ContentType
    ) -> dict:
        """Determine appropriate structured data."""


class PromptBuilder:
    """Builds prompts for content generation."""
    
    def build_system_prompt(self) -> str:
        """Return the GEO framework system prompt."""
        
    def build_user_prompt(
        self, 
        pillar: Pillar,
        source_pages: List[Page],
        content_type: ContentType,
        additional_guidance: str
    ) -> str:
        """Build the specific generation request."""
```

### 7.5 Export Service

**Responsibilities:**
- Generate Markdown files from approved drafts
- Create metadata/manifest files
- Package exports for download
- Support various export formats

```python
class ExportService:
    """Handles content export operations."""
    
    async def export_project(
        self, 
        project: Project,
        config: ExportConfig
    ) -> ExportResult:
        """Export all approved content for a project."""
        
    async def export_pillar(
        self, 
        pillar: Pillar,
        config: ExportConfig
    ) -> ExportResult:
        """Export approved content for a single pillar."""
        
    def generate_manifest(
        self, 
        drafts: List[Draft]
    ) -> dict:
        """Create manifest.json with metadata."""
        
    def generate_redirects_map(
        self, 
        drafts: List[Draft]
    ) -> dict:
        """Map source URLs to new content slugs."""
        
    def package_export(
        self, 
        files: List[ExportFile]
    ) -> bytes:
        """Create ZIP archive of export files."""
```

**Export Structure:**
```
export-acme-learning-2025-01-15/
├── manifest.json
├── redirects.json
├── schema-templates/
│   ├── article.json
│   ├── faq.json
│   └── organization.json
├── pillars/
│   ├── corporate-training-strategies/
│   │   ├── _pillar-meta.json
│   │   ├── complete-guide-corporate-training.md
│   │   ├── training-needs-assessment.md
│   │   └── measuring-training-roi.md
│   └── learning-management-systems/
│       └── ...
```

---

## 8. GEO Content Framework

This section defines the templates and rules for generating GEO-optimized content.

### 8.1 Core GEO Principles

All generated content must embody these principles:

1. **Clear Value Proposition First**: State what the reader will learn/gain in the first screenful
2. **Conversational Headings**: Frame H2s as questions users would actually ask
3. **Direct Answers**: Provide 2-3 sentence answers immediately, then elaborate
4. **Scannable Structure**: Short paragraphs, strategic bullets, clear hierarchy
5. **Authority Signals**: Include authorship placeholders, cite sources, note update dates
6. **FAQ Integration**: Include relevant Q&A with concise (25-40 word) answers
7. **Structured Data Ready**: Format content to support schema markup
8. **Natural Language**: Write conversationally, matching how people ask questions

### 8.2 Content Type Templates

#### Pillar Page Template

```markdown
# [Value-Driven Headline That Answers a Core Question]

[2-3 sentence hook that immediately delivers value. State what the reader will learn. Include the primary keyword naturally.]

**Expert Insight**: [Author Name], [Title/Credentials]  
**Last Updated**: [Date]

---

## What is [Topic]?

[Clear, definition-style paragraph. Conversational but authoritative. 50-100 words.]

### Key Takeaway
> [Single most important point in 1-2 sentences. This is what AI engines will extract.]

## Why Does [Topic] Matter for [Target Audience]?

[Explain relevance and stakes. Connect to real business outcomes. 2-3 short paragraphs.]

[Include a specific statistic or research citation if available from source content.]

## How Do You [Primary Action Question]?

[Practical, actionable guidance. Structure as steps or key considerations.]

### Essential Elements

[Use bullets here only if genuinely a list of items:]
- **[Element 1]**: Brief explanation (one sentence)
- **[Element 2]**: Brief explanation
- **[Element 3]**: Brief explanation

## What Are Common [Topic] Challenges?

[Address pain points. Show understanding of audience struggles. Provide solutions.]

## [Additional Relevant Question from Source Content]?

[Continue pattern: question heading, direct answer, elaboration.]

---

## Frequently Asked Questions

**What is [fundamental question]?**  
[25-40 word conversational answer. Complete thought, no fluff.]

**How do I [action question]?**  
[25-40 word answer focusing on first steps or key principle.]

**Why is [topic aspect] important?**  
[25-40 word answer connecting to outcomes/benefits.]

**When should I [timing question]?**  
[25-40 word answer with specific guidance.]

---

## Summary

[Brief recap: 3-4 sentences capturing the essential takeaways. Reinforce key message.]

---

**Ready to [desired action]?** [CTA placeholder - e.g., "Contact our team" / "Download the guide" / "Start your free trial"]

---

<!-- 
METADATA FOR IMPLEMENTATION:

Source Content:
- [URL 1]: [Title 1]
- [URL 2]: [Title 2]

Schema Recommendations:
- Article Schema: Include author, datePublished, dateModified, headline
- FAQ Schema: Apply to FAQ section
- Organization Schema: Link from author to org

Internal Linking Opportunities:
- Link to: [related pillar or article suggestions]
- Link from: [pages that should reference this]
-->
```

#### Supporting Article Template

```markdown
# [Specific Question or How-To as Headline]

[Opening sentence that directly addresses the headline question. Follow with 1-2 sentences of context. Total: 40-60 words.]

**Written by**: [Author Name], [Credentials]  
**Reviewed**: [Date] | **Read time**: [X] minutes

---

## The Short Answer

> [2-3 sentence direct answer. If someone reads nothing else, they get the key point. This is optimized for AI extraction.]

## Understanding [Specific Subtopic]

[Deeper context. Why this matters. Background the reader needs. 2-3 paragraphs.]

## [How-To or Process Section]

[Step-by-step or structured guidance. Use numbered steps for processes:]

1. **[Step 1 Name]**: [Explanation in 1-2 sentences]
2. **[Step 2 Name]**: [Explanation]
3. **[Step 3 Name]**: [Explanation]

### Pro Tip
> [Insider advice or common mistake to avoid. 1-2 sentences.]

## [Real-World Application/Example]

[Concrete example showing the concept in practice. Specificity builds credibility.]

## Common Questions

**[Specific question about this subtopic]?**  
[25-40 word answer.]

**[Another specific question]?**  
[25-40 word answer.]

---

## Key Takeaways

- [Takeaway 1: One sentence]
- [Takeaway 2: One sentence]
- [Takeaway 3: One sentence]

---

**Related Reading**: [Link placeholder to pillar page] | [Link to related article]

<!-- 
Source Content: [URLs]
Parent Pillar: [Pillar name and link]
Schema: Article with HowTo if step-based
-->
```

#### FAQ Page Template

```markdown
# [Topic]: Frequently Asked Questions

[1-2 sentence intro. State what questions this page answers and who it's for.]

**Last Updated**: [Date]

---

## General Questions

### What is [topic]?
[40-60 word comprehensive answer. Define clearly for newcomers.]

### Why is [topic] important for [audience]?
[40-60 word answer focusing on benefits and outcomes.]

### Who needs [topic]?
[40-60 word answer describing ideal use cases or audiences.]

---

## Getting Started

### How do I [first step question]?
[40-60 word practical answer with clear starting point.]

### What do I need before [starting action]?
[40-60 word answer listing prerequisites or requirements.]

### How long does [process] take?
[40-60 word answer with realistic timeframes or "it depends" factors.]

---

## [Topic-Specific Category]

### [Specific technical or detailed question]?
[40-60 word answer. Be precise.]

### [Another detailed question]?
[40-60 word answer.]

### [Problem/troubleshooting question]?
[40-60 word answer focusing on solution.]

---

## Costs and Considerations

### How much does [topic] cost?
[40-60 word answer. Give ranges or factors if exact numbers unavailable.]

### What are the risks of [topic or not doing topic]?
[40-60 word answer. Be honest about challenges.]

---

## Still Have Questions?

[CTA to contact, consultation, or additional resources.]

<!-- 
Schema: FAQPage (apply to entire page)
Source Content: [URLs]
-->
```

#### Glossary Template

```markdown
# [Topic] Glossary: Key Terms and Definitions

[1-2 sentence intro explaining what terms are covered and who this glossary serves.]

**Last Updated**: [Date]

---

## A

### [Term]
**Definition**: [Clear, concise definition in 20-40 words.]

**Related terms**: [Link to related term], [Link to related term]

---

## B

### [Term]
**Definition**: [20-40 word definition.]

**Example**: [Optional: One sentence showing the term in context.]

---

[Continue alphabetically with relevant terms from source content]

---

## Quick Reference

| Term | Brief Definition |
|------|------------------|
| [Term 1] | [10-15 word definition] |
| [Term 2] | [10-15 word definition] |
| [Term 3] | [10-15 word definition] |

---

**Looking for more detail?** Explore our [Pillar Page link] or [Related Article link].

<!--
Schema: DefinedTermSet or individual DefinedTerm schemas
Source: Extracted from [URLs]
-->
```

#### Comparison Page Template

```markdown
# [Option A] vs [Option B]: [Decision Context]

[2-3 sentence intro framing the comparison. Who faces this decision? What's at stake?]

**Last Updated**: [Date] | **Expert Review**: [Author/Credentials]

---

## Quick Comparison

| Factor | [Option A] | [Option B] |
|--------|------------|------------|
| Best for | [1-2 word description] | [1-2 word description] |
| Key strength | [1-2 word description] | [1-2 word description] |
| Key limitation | [1-2 word description] | [1-2 word description] |
| Typical cost | [Range] | [Range] |

---

## What is [Option A]?

[2-3 paragraph explanation. Cover: what it is, how it works, who uses it.]

### [Option A] Strengths
- [Strength 1]: [Brief explanation]
- [Strength 2]: [Brief explanation]

### [Option A] Limitations
- [Limitation 1]: [Brief explanation]
- [Limitation 2]: [Brief explanation]

---

## What is [Option B]?

[Same structure as Option A section]

### [Option B] Strengths
- [Strength 1]: [Brief explanation]
- [Strength 2]: [Brief explanation]

### [Option B] Limitations
- [Limitation 1]: [Brief explanation]
- [Limitation 2]: [Brief explanation]

---

## Head-to-Head: Key Factors

### [Factor 1: e.g., Ease of Use]
**[Option A]**: [2-3 sentence assessment]

**[Option B]**: [2-3 sentence assessment]

**Winner**: [Option A/B/Tie] for [specific use case]

### [Factor 2]
[Same structure]

### [Factor 3]
[Same structure]

---

## Which Should You Choose?

### Choose [Option A] if:
- [Scenario 1]
- [Scenario 2]
- [Scenario 3]

### Choose [Option B] if:
- [Scenario 1]
- [Scenario 2]
- [Scenario 3]

---

## Frequently Asked Questions

**Can I use both [Option A] and [Option B]?**
[25-40 word answer.]

**Which is better for [specific use case]?**
[25-40 word answer.]

---

## The Bottom Line

[3-4 sentence summary. Clear recommendation framework without being prescriptive about "the right answer."]

<!--
Schema: Article with comparison structure
Consider: Product or Service schema if comparing specific offerings
Source: [URLs]
-->
```

### 8.3 Generation System Prompt

This is the system prompt used when calling Claude for content generation:

```
You are an expert content strategist specializing in Generative Engine Optimization (GEO). Your task is to transform legacy website content into modern, AI-optimized content that performs well in both traditional search and AI-powered answer engines (ChatGPT, Google AI Overviews, Perplexity, etc.).

## Your Core Mission

Take the provided source content and pillar context to generate new content that:
1. Preserves valuable information and insights from the original
2. Restructures it for AI readability and extraction
3. Matches the target content type template
4. Embodies all GEO best practices

## GEO Best Practices You Must Follow

### Structure
- Lead with value: The first screenful must clearly state what the reader will learn
- Use conversational H2 headings framed as questions users actually ask
- Provide direct 2-3 sentence answers immediately after question headings, then elaborate
- Keep paragraphs short (2-4 sentences max)
- Include a "Key Takeaway" callout box for the most important point
- Add an FAQ section with 25-40 word answers per question

### Authority Signals
- Include placeholders for author name and credentials
- Note "Last Updated" date placeholder
- Reference specific statistics or research when present in source content
- Maintain professional but accessible tone

### AI Optimization
- Write in natural, conversational language matching how people ask questions
- Structure information in extractable units (not buried in long paragraphs)
- Include definition-style explanations for key concepts
- Ensure the content can answer specific queries without reading the whole page

### What to Avoid
- Keyword stuffing or unnatural repetition
- Long, dense paragraphs
- Generic filler content
- Hedging language that dilutes clear answers
- Marketing hyperbole without substance

## Source Content Guidelines

You will receive:
1. Pillar context (name, description, target audience, themes, tone)
2. Source page content (the legacy content to transform)
3. Content type (pillar_page, supporting_article, faq_page, glossary, comparison)
4. Additional guidance (optional specific instructions)

Your job is to:
1. Extract valuable information from source content
2. Reorganize it according to the target content type structure
3. Fill gaps with reasonable inferences (but don't invent facts)
4. Output clean, well-formatted Markdown

## Output Format

Return ONLY the Markdown content. Do not include explanations or commentary outside the content itself.

Use the exact template structure for the specified content type. Include HTML comments at the end for metadata (source URLs, schema recommendations).

If the source content is insufficient for a complete piece, note gaps with [NEEDS: description of what's missing] so the editor knows what to add.
```

### 8.4 Content Type-Specific Prompts

Each content type has additional prompt instructions:

**Pillar Page:**
```
Generate comprehensive pillar page content. This should be the definitive resource on this topic, covering all major aspects. Aim for 1500-2500 words. Include 4-6 FAQ questions. Link opportunities to subtopics that could become supporting articles.
```

**Supporting Article:**
```
Generate a focused supporting article on a specific subtopic. This should go deeper on one aspect rather than covering everything. Aim for 800-1200 words. Include 2-3 FAQ questions. Reference how this connects to the broader pillar topic.
```

**FAQ Page:**
```
Generate a comprehensive FAQ page. Extract questions from the source content or infer questions users would have. Organize into logical categories. Each answer should be 40-60 words - complete but concise. Aim for 15-25 questions.
```

**Glossary:**
```
Generate a glossary of key terms from the source content. Each definition should be 20-40 words. Include related terms where connections exist. Organize alphabetically. Include a quick reference table at the end.
```

**Comparison:**
```
Generate a balanced comparison between the options or approaches discussed in the source content. Be fair to both sides. Include a quick comparison table. Cover 3-4 key comparison factors in detail. Provide clear "choose this if" guidance without being prescriptive.
```

---

## 9. User Interface Specifications

### 9.1 Application Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo]  Content Migration Tool          [User] ▼   [Settings]   [Logout]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────────────────────────────────────────────┐   │
│  │             │  │                                                     │   │
│  │  Sidebar    │  │              Main Content Area                      │   │
│  │             │  │                                                     │   │
│  │  Projects   │  │                                                     │   │
│  │  ─────────  │  │                                                     │   │
│  │  > Acme     │  │                                                     │   │
│  │    Learning │  │                                                     │   │
│  │    - Pages  │  │                                                     │   │
│  │    - Pillars│  │                                                     │   │
│  │    - Drafts │  │                                                     │   │
│  │             │  │                                                     │   │
│  │  > Other    │  │                                                     │   │
│  │    Project  │  │                                                     │   │
│  │             │  │                                                     │   │
│  │  ─────────  │  │                                                     │   │
│  │  [+ New     │  │                                                     │   │
│  │   Project]  │  │                                                     │   │
│  │             │  │                                                     │   │
│  └─────────────┘  └─────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Key Views

#### Project Dashboard
Primary landing after selecting a project. Shows:
- Project summary stats (pages crawled, pillars, drafts, approved)
- Active/recent jobs status
- Quick actions (Start Crawl, Add Pillar)
- Recent activity feed

#### Pages View
Browsable list of crawled pages:
- Filterable by status, content type, quality score
- Searchable by title/content
- Bulk selection capabilities
- Quick preview panel

#### Pillar Configuration
Pillar creation/editing form:
- Name and description (prominently featured)
- Target audience
- Key themes (tag input)
- Tone notes
- Primary keywords
- Preview of how this will guide matching/generation

#### Content Matching View
Within a pillar, shows matched pages:
- Relevance score visualization
- Page previews
- Select/exclude checkboxes
- Bulk actions
- "Generate from Selected" button

#### Draft Editor
Side-by-side editing interface:
- Left: Source content viewer (collapsible panels per source page)
- Right: Markdown editor with live preview toggle
- Top toolbar: Save, Regenerate Section, Version History, Submit for Approval
- Bottom: Status bar, word count, reading time estimate

#### Export View
Export configuration and download:
- Select what to export (all approved, specific pillars)
- Choose format options
- Preview export structure
- Download button

### 9.3 Key User Flows

#### Flow 1: Start a New Migration Project

```
1. Click [+ New Project] in sidebar
2. Fill project form:
   - Project name
   - Client name
   - Legacy site URL
   - Description
   - Crawl settings (depth, exclusions)
3. Click [Create Project]
4. System creates project, redirects to project dashboard
5. Click [Start Crawl]
6. System queues crawl job, shows progress
7. Pages populate as crawled
```

#### Flow 2: Define Content Pillars

```
1. From project, navigate to Pillars tab
2. Click [+ Add Pillar]
3. Fill pillar form:
   - Name: "Corporate Training Strategies"
   - Description: "Comprehensive strategies for..."
   - Target Audience: "L&D professionals..."
   - Key Themes: [add tags]
   - Tone Notes: "Professional but accessible..."
4. Click [Save Pillar]
5. System creates pillar, runs initial matching
6. View matched pages in pillar detail view
```

#### Flow 3: Generate and Review Content

```
1. Navigate to pillar detail view
2. Review matched pages, select best sources (checkboxes)
3. Click [Generate Draft]
4. Select content type (Pillar Page)
5. Optionally add guidance ("Emphasize ROI measurement")
6. Click [Generate]
7. System queues generation, shows progress
8. When complete, opens draft in editor
9. Review generated content against source
10. Make edits in Markdown editor
11. Click [Save Draft] to preserve changes
12. When satisfied, click [Submit for Approval]
```

#### Flow 4: Export Approved Content

```
1. Navigate to project or pillar
2. Click [Export]
3. Configure export:
   - Select content (all approved or specific items)
   - Include metadata: Yes
   - Include schema templates: Yes
4. Click [Generate Export]
5. System packages files, provides download link
6. Click [Download ZIP]
```

---

## 10. Technology Stack

### Backend

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Language | Python | 3.11+ | Primary backend language |
| Framework | FastAPI | 0.109+ | API framework |
| Database | PostgreSQL | 15+ | Primary data store |
| Vector Extension | pgvector | 0.6+ | Embedding storage and search |
| ORM | SQLAlchemy | 2.0+ | Database abstraction |
| Migrations | Alembic | 1.13+ | Schema migrations |
| Task Queue | Celery | 5.3+ | Async job processing |
| Message Broker | Redis | 7+ | Celery backend + caching |
| HTTP Client | httpx | 0.26+ | Async HTTP for crawling |
| HTML Parsing | BeautifulSoup4 | 4.12+ | Content extraction |
| Browser Automation | Playwright | 1.41+ | JS-rendered page crawling |

### Frontend

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Framework | React | 18+ | UI framework |
| Build Tool | Vite | 5+ | Development and build |
| Styling | TailwindCSS | 3.4+ | Utility-first CSS |
| State Management | Zustand | 4+ | Lightweight state |
| HTTP Client | Axios | 1.6+ | API communication |
| Markdown Editor | Monaco Editor | 0.45+ | Code/markdown editing |
| Markdown Preview | react-markdown | 9+ | Render markdown |
| Tables | TanStack Table | 8+ | Data tables |
| Forms | React Hook Form | 7+ | Form handling |
| Routing | React Router | 6+ | Client-side routing |

### External Services

| Service | Purpose | Notes |
|---------|---------|-------|
| Claude API (Anthropic) | Content generation | Primary LLM |
| Voyage AI or OpenAI | Embeddings | For semantic search |

### Development & Deployment

| Component | Technology | Purpose |
|-----------|------------|---------|
| Containerization | Docker | Consistent environments |
| Orchestration | Docker Compose | Local development |
| Hosting | DigitalOcean / AWS / GCP | Production hosting |
| Reverse Proxy | Nginx or Caddy | SSL, routing |
| CI/CD | GitHub Actions | Automated deployment |

---

## 11. File Structure

```
pilot/
├── README.md
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .gitignore
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   │       └── 001_initial_schema.py
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI application entry
│   │   ├── config.py               # Configuration management
│   │   ├── dependencies.py         # Dependency injection
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── router.py           # Main API router
│   │   │   ├── projects.py         # Project endpoints
│   │   │   ├── pages.py            # Page endpoints
│   │   │   ├── pillars.py          # Pillar endpoints
│   │   │   ├── matches.py          # Matching endpoints
│   │   │   ├── drafts.py           # Draft endpoints
│   │   │   ├── generation.py       # Generation endpoints
│   │   │   ├── exports.py          # Export endpoints
│   │   │   └── jobs.py             # Job status endpoints
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── base.py             # SQLAlchemy base
│   │   │   ├── project.py
│   │   │   ├── page.py
│   │   │   ├── pillar.py
│   │   │   ├── match.py
│   │   │   ├── draft.py
│   │   │   └── job.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── project.py          # Pydantic schemas
│   │   │   ├── page.py
│   │   │   ├── pillar.py
│   │   │   ├── match.py
│   │   │   ├── draft.py
│   │   │   └── job.py
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── crawler.py          # Web crawling
│   │   │   ├── extractor.py        # Content extraction
│   │   │   ├── analyzer.py         # Content analysis
│   │   │   ├── embeddings.py       # Embedding generation
│   │   │   ├── matcher.py          # Content matching
│   │   │   ├── generator.py        # AI content generation
│   │   │   ├── exporter.py         # Export handling
│   │   │   └── claude.py           # Claude API client
│   │   │
│   │   ├── tasks/
│   │   │   ├── __init__.py
│   │   │   ├── celery_app.py       # Celery configuration
│   │   │   ├── crawl_tasks.py      # Crawling tasks
│   │   │   ├── analysis_tasks.py   # Analysis tasks
│   │   │   ├── match_tasks.py      # Matching tasks
│   │   │   ├── generation_tasks.py # Generation tasks
│   │   │   └── export_tasks.py     # Export tasks
│   │   │
│   │   ├── prompts/
│   │   │   ├── __init__.py
│   │   │   ├── system.py           # System prompts
│   │   │   ├── pillar_page.py      # Pillar page prompts
│   │   │   ├── article.py          # Article prompts
│   │   │   ├── faq.py              # FAQ prompts
│   │   │   ├── glossary.py         # Glossary prompts
│   │   │   └── comparison.py       # Comparison prompts
│   │   │
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── url_utils.py
│   │       ├── text_utils.py
│   │       └── security.py
│   │
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py
│       ├── test_crawler.py
│       ├── test_extractor.py
│       ├── test_matcher.py
│       └── test_generator.py
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   │
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   │
│   │   ├── api/
│   │   │   ├── client.js           # Axios instance
│   │   │   ├── projects.js
│   │   │   ├── pages.js
│   │   │   ├── pillars.js
│   │   │   ├── matches.js
│   │   │   ├── drafts.js
│   │   │   └── exports.js
│   │   │
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Table.jsx
│   │   │   │   ├── LoadingSpinner.jsx
│   │   │   │   └── EmptyState.jsx
│   │   │   │
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── Header.jsx
│   │   │   │   └── MainLayout.jsx
│   │   │   │
│   │   │   ├── projects/
│   │   │   │   ├── ProjectList.jsx
│   │   │   │   ├── ProjectCard.jsx
│   │   │   │   ├── ProjectForm.jsx
│   │   │   │   └── ProjectDashboard.jsx
│   │   │   │
│   │   │   ├── pages/
│   │   │   │   ├── PageList.jsx
│   │   │   │   ├── PageCard.jsx
│   │   │   │   ├── PagePreview.jsx
│   │   │   │   └── PageFilters.jsx
│   │   │   │
│   │   │   ├── pillars/
│   │   │   │   ├── PillarList.jsx
│   │   │   │   ├── PillarCard.jsx
│   │   │   │   ├── PillarForm.jsx
│   │   │   │   └── PillarDetail.jsx
│   │   │   │
│   │   │   ├── matches/
│   │   │   │   ├── MatchList.jsx
│   │   │   │   ├── MatchCard.jsx
│   │   │   │   └── MatchActions.jsx
│   │   │   │
│   │   │   ├── drafts/
│   │   │   │   ├── DraftList.jsx
│   │   │   │   ├── DraftCard.jsx
│   │   │   │   ├── DraftEditor.jsx
│   │   │   │   ├── SourcePanel.jsx
│   │   │   │   └── MarkdownPreview.jsx
│   │   │   │
│   │   │   └── exports/
│   │   │       ├── ExportConfig.jsx
│   │   │       └── ExportDownload.jsx
│   │   │
│   │   ├── pages/                  # Route pages (not crawled pages)
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ProjectPage.jsx
│   │   │   ├── PagesPage.jsx
│   │   │   ├── PillarsPage.jsx
│   │   │   ├── PillarDetailPage.jsx
│   │   │   ├── DraftsPage.jsx
│   │   │   ├── DraftEditorPage.jsx
│   │   │   └── ExportsPage.jsx
│   │   │
│   │   ├── stores/
│   │   │   ├── projectStore.js
│   │   │   ├── pageStore.js
│   │   │   ├── pillarStore.js
│   │   │   ├── draftStore.js
│   │   │   └── uiStore.js
│   │   │
│   │   ├── hooks/
│   │   │   ├── useProject.js
│   │   │   ├── usePages.js
│   │   │   ├── usePillars.js
│   │   │   ├── useDrafts.js
│   │   │   └── useJobPolling.js
│   │   │
│   │   └── utils/
│   │       ├── formatters.js
│   │       └── validators.js
│   │
│   └── public/
│       └── favicon.ico
│
└── docs/
    ├── architecture.md             # This document
    ├── api.md                      # API documentation
    ├── deployment.md               # Deployment guide
    └── user-guide.md               # End user documentation
```

---

## 12. Build Phases

### Phase 1: Foundation (Weeks 1-3)

**Goal**: Basic project management, crawling, and content storage.

**Backend Tasks**:
- [ ] Initialize FastAPI project structure
- [ ] Set up PostgreSQL database with pgvector
- [ ] Implement database models (projects, pages, jobs)
- [ ] Create basic CRUD endpoints for projects
- [ ] Build crawler service (basic HTTP fetching)
- [ ] Implement content extractor (HTML to clean text)
- [ ] Set up Celery with Redis for async tasks
- [ ] Create crawl task that processes pages
- [ ] Add job status tracking

**Frontend Tasks**:
- [ ] Initialize React project with Vite
- [ ] Set up TailwindCSS
- [ ] Create main layout (sidebar, header, content area)
- [ ] Build project list view
- [ ] Build project creation form
- [ ] Build project dashboard with stats
- [ ] Add crawl initiation button with progress
- [ ] Create basic page list view

**Deliverable**: Can create a project, crawl a website, view crawled pages.

---

### Phase 2: Intelligence (Weeks 4-5)

**Goal**: Semantic analysis, embeddings, and pillar definition.

**Backend Tasks**:
- [ ] Integrate embedding service (Voyage or OpenAI)
- [ ] Create analysis task (generate embeddings, extract topics)
- [ ] Implement topic extraction using Claude
- [ ] Add quality scoring algorithm
- [ ] Create pillar CRUD endpoints
- [ ] Implement vector similarity search for matching
- [ ] Build matching service and task
- [ ] Add relevance scoring

**Frontend Tasks**:
- [ ] Enhance page list with filters (content type, quality, topics)
- [ ] Add page preview panel
- [ ] Create pillar creation/edit form
- [ ] Build pillar list view
- [ ] Create pillar detail view with matched pages
- [ ] Add match selection interface (checkboxes, select/exclude)
- [ ] Implement bulk match actions

**Deliverable**: Can define pillars, see semantically matched pages, select sources.

---

### Phase 3: Generation (Weeks 6-8)

**Goal**: AI-powered content generation with GEO framework.

**Backend Tasks**:
- [ ] Integrate Claude API client
- [ ] Build prompt templates for each content type
- [ ] Create generation service
- [ ] Implement generation task
- [ ] Store drafts with source attribution
- [ ] Add schema recommendation generation
- [ ] Create draft CRUD endpoints
- [ ] Implement draft versioning

**Frontend Tasks**:
- [ ] Create "Generate Draft" flow (type selection, guidance input)
- [ ] Build draft list view
- [ ] Implement side-by-side draft editor
- [ ] Add source content viewer panel
- [ ] Integrate Monaco editor for Markdown
- [ ] Add Markdown preview toggle
- [ ] Create version history view
- [ ] Add regenerate section functionality

**Deliverable**: Can generate GEO-optimized drafts from selected sources, edit them.

---

### Phase 4: Review & Export (Weeks 9-10)

**Goal**: Approval workflow and content export.

**Backend Tasks**:
- [ ] Add draft status transitions (draft → in_review → approved)
- [ ] Create approval endpoint
- [ ] Build export service
- [ ] Generate Markdown files with metadata
- [ ] Create manifest.json generation
- [ ] Build redirects map generation
- [ ] Implement ZIP packaging
- [ ] Add export download endpoint

**Frontend Tasks**:
- [ ] Add "Submit for Approval" flow
- [ ] Create approval confirmation UI
- [ ] Build export configuration view
- [ ] Show export structure preview
- [ ] Add download functionality
- [ ] Create export history view

**Deliverable**: Full workflow from crawl to approved, exported content.

---

### Phase 5: Polish & Production (Weeks 11-12)

**Goal**: Production readiness, testing, documentation.

**Backend Tasks**:
- [ ] Add comprehensive error handling
- [ ] Implement rate limiting
- [ ] Add API authentication
- [ ] Create database backup strategy
- [ ] Write unit and integration tests
- [ ] Performance optimization (query optimization, caching)
- [ ] Set up logging and monitoring

**Frontend Tasks**:
- [ ] Add loading states everywhere
- [ ] Implement error handling and user feedback
- [ ] Add keyboard shortcuts for common actions
- [ ] Responsive design adjustments
- [ ] Accessibility improvements
- [ ] User onboarding/help tooltips

**DevOps Tasks**:
- [ ] Create production Docker configuration
- [ ] Set up CI/CD pipeline
- [ ] Configure production hosting
- [ ] Set up SSL certificates
- [ ] Create deployment documentation
- [ ] Write user guide

**Deliverable**: Production-ready application with documentation.

---

## 13. Future Considerations

### Potential Enhancements

**CMS Integrations**:
- Direct publishing to WordPress, Contentful, Sanity
- Bi-directional sync with Google Docs

**Advanced Analysis**:
- Competitor content analysis
- Content gap identification
- SEO performance correlation (via Search Console integration)

**Collaboration Features**:
- Multi-user editing with presence indicators
- Comments and annotations on drafts
- Notification system for approvals

**AI Improvements**:
- Fine-tuned models for specific industries
- Learning from editor corrections
- Automated quality scoring of generated content

**Project Management Integration**:
- Jira integration for task tracking
- Slack notifications for job completion
- Webhook support for custom integrations

---

## Appendix A: Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pilot
DATABASE_POOL_SIZE=10

# Redis
REDIS_URL=redis://localhost:6379/0

# API Keys
ANTHROPIC_API_KEY=sk-ant-...
EMBEDDING_API_KEY=...  # Voyage or OpenAI

# Application
SECRET_KEY=your-secret-key-here
API_KEY=your-api-key-for-auth
ENVIRONMENT=development  # development, staging, production

# Crawling
MAX_CONCURRENT_CRAWLS=5
DEFAULT_CRAWL_DELAY_MS=1000
MAX_PAGES_PER_CRAWL=1000

# Generation
CLAUDE_MODEL=claude-sonnet-4-20250514
MAX_GENERATION_TOKENS=4096

# Storage
EXPORT_STORAGE_PATH=/app/exports
MAX_EXPORT_RETENTION_DAYS=30
```

---

## Appendix B: Sample API Requests

### Create Project and Start Crawl

```bash
# Create project
curl -X POST http://localhost:8000/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "name": "Acme Migration",
    "client_name": "Acme Corp",
    "base_url": "https://www.acme.com",
    "settings": {
      "crawl_depth": 3
    }
  }'

# Start crawl
curl -X POST http://localhost:8000/api/v1/projects/{project_id}/crawl \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "max_pages": 100
  }'

# Check job status
curl http://localhost:8000/api/v1/jobs/{job_id} \
  -H "X-API-Key: your-api-key"
```

### Create Pillar and Generate Content

```bash
# Create pillar
curl -X POST http://localhost:8000/api/v1/projects/{project_id}/pillars \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "name": "Product Features",
    "description": "Comprehensive coverage of product capabilities...",
    "target_audience": "Potential customers evaluating solutions",
    "key_themes": ["features", "benefits", "use cases"]
  }'

# Trigger matching
curl -X POST http://localhost:8000/api/v1/pillars/{pillar_id}/match \
  -H "X-API-Key: your-api-key"

# Select matches and generate
curl -X POST http://localhost:8000/api/v1/pillars/{pillar_id}/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "content_type": "pillar_page",
    "source_page_ids": ["page-id-1", "page-id-2"]
  }'
```

---

*End of Specification Document*
