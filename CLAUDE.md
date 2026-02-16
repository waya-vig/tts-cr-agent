# TTS CR Agent - CLAUDE.md

## Project Overview
TikTok Shopセラー向けのAIクリエイティブ制作支援SaaS。
「縦型動画が作れない」セラーの課題を、市場データ×AIで解決する。

### プロダクトの3本柱
1. **CR制作支援 (Main)**: 売れてる動画データを基にAIが構成案・台本・フック生成
2. **市場インテリジェンス**: トレンド・穴場商品・競合分析・広告CR分析
3. **マルチアカウント管理**: 複数ブランドのTTSアカウントを横断管理・比較
4. **Copilot (AI Chat)**: RAGベースの自然言語質問

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite 6 + Tailwind CSS 4 + Zustand 5 + React Router 7 |
| Backend | Python 3.13 + FastAPI + async SQLAlchemy 2.0 + asyncpg |
| Database | PostgreSQL 15 (Docker for local dev) |
| Vector DB | Pinecone |
| AI | Claude API (claude-sonnet-4-5) + OpenAI Embedding (text-embedding-3-small) |
| Deploy | AWS (ECS Fargate + RDS + S3 + CloudFront) |

## Project Structure
```
tts-cr-agent/
├── backend/                    # Python + FastAPI
│   ├── app/
│   │   ├── main.py            # FastAPI entry point
│   │   ├── config.py          # pydantic-settings configuration
│   │   ├── models/            # SQLAlchemy ORM models (1 file per table)
│   │   │   ├── user.py        # users table
│   │   │   ├── shop.py        # shops table (multi-account)
│   │   │   ├── cr_project.py  # cr_projects table (main feature)
│   │   │   ├── trend_product.py
│   │   │   ├── creator.py
│   │   │   └── knowledge_base.py  # RAG knowledge entries
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   ├── routers/           # API endpoint routers
│   │   │   ├── health.py      # GET /api/v1/health
│   │   │   ├── auth.py        # POST register/login, GET /me
│   │   │   ├── shops.py       # Shop CRUD (list/create/get/update/delete)
│   │   │   ├── cr.py          # CR generation + project management
│   │   │   ├── market.py      # Market trends + hidden gems
│   │   │   ├── knowledge.py   # Knowledge base CRUD
│   │   │   └── copilot.py     # Copilot chat (sync + streaming)
│   │   ├── services/          # Business logic layer
│   │   │   ├── cr_generator.py    # Claude API CR generation
│   │   │   └── copilot_service.py # RAG chat + streaming
│   │   ├── core/
│   │   │   ├── auth.py        # get_current_user dependency
│   │   │   ├── security.py    # bcrypt + JWT
│   │   │   └── database.py    # async engine + session
│   │   └── migrations/        # Alembic migration scripts
│   ├── alembic.ini
│   ├── requirements.txt
│   └── Dockerfile             # Multi-stage build
├── frontend/                   # React + TypeScript
│   ├── src/
│   │   ├── components/        # Layout, Sidebar, ProtectedRoute
│   │   ├── pages/             # Dashboard, CRCreator, MarketIntelligence, KnowledgeManager, Login, Copilot
│   │   ├── hooks/             # useAuth
│   │   ├── services/api.ts    # Axios + JWT interceptor
│   │   ├── stores/            # Zustand state stores (authStore, shopStore)
│   │   ├── types/index.ts     # Shared TypeScript types
│   │   ├── App.tsx            # React Router config
│   │   └── main.tsx           # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile             # Multi-stage build
├── infra/
│   ├── docker-compose.yml     # PostgreSQL + Backend + Frontend
│   └── aws/
├── .env.example
├── CLAUDE.md                  # This file
└── README.md
```

## Development Commands
```bash
# === First Time Setup ===
cp .env.example .env           # Edit with your API keys
docker compose -f infra/docker-compose.yml up --build

# === Run Migrations ===
docker compose -f infra/docker-compose.yml exec backend alembic revision --autogenerate -m "description"
docker compose -f infra/docker-compose.yml exec backend alembic upgrade head

# === Individual Services ===
# Backend only (from /backend)
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend only (from /frontend)
npm install
npm run dev

# === Testing ===
cd backend && pytest
cd frontend && npm test
```

## Database Schema (6 tables)
```
users (1) --< shops (N) --< cr_projects (N)
users (1) --< knowledge_base (N) --> pinecone_vectors
trend_products (global, shared across users)
creators (global + per user bookmarks)
```

### Key Tables
- **users**: UUID PK, email, password_hash, company_name, plan (free/starter/pro/enterprise)
- **shops**: Multi-account TTS shops per user. OAuth tokens AES-256 encrypted
- **cr_projects**: Main feature. AI output stored as JSONB (構成案/台本/フック)
- **trend_products**: FastMoss + TTS API market data
- **creators**: TikTok Shop creator profiles for matching
- **knowledge_base**: RAG entries with Pinecone vector references

## API Convention
- All endpoints prefixed with `/api/v1/`
- Auth via JWT Bearer tokens (access: 30min)
- JSON responses with error format: `{"detail": "error message"}`
- Pagination: `?skip=0&limit=20`

### Implemented Endpoints
- `GET /` - Welcome message
- `GET /api/v1/health` - Health check with DB status
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - Login (returns JWT)
- `GET /api/v1/auth/me` - Current user profile

### Implemented Endpoints (Phase 2)
- `GET /api/v1/shops/` - List user's shops
- `POST /api/v1/shops/` - Create shop
- `GET /api/v1/shops/{id}` - Get shop
- `PATCH /api/v1/shops/{id}` - Update shop
- `DELETE /api/v1/shops/{id}` - Delete shop
- `GET /api/v1/cr/projects` - List CR projects
- `GET /api/v1/cr/projects/{id}` - Get CR project
- `POST /api/v1/cr/generate` - Generate CR (Claude API)
- `DELETE /api/v1/cr/projects/{id}` - Delete CR project
- `GET /api/v1/market/trends` - Trending products
- `GET /api/v1/market/hidden-gems` - Hidden gem products
- `GET /api/v1/knowledge/` - List knowledge entries
- `POST /api/v1/knowledge/` - Create knowledge entry
- `GET /api/v1/knowledge/{id}` - Get knowledge entry
- `PATCH /api/v1/knowledge/{id}` - Update knowledge entry
- `DELETE /api/v1/knowledge/{id}` - Delete knowledge entry
- `POST /api/v1/copilot/chat` - Copilot chat (sync)
- `POST /api/v1/copilot/chat/stream` - Copilot chat (SSE streaming)

## Coding Conventions
- **Backend**: snake_case, type hints on all functions, async endpoints, Pydantic schemas for all I/O
- **Frontend**: camelCase for variables/functions, PascalCase for components
- **Database**: All changes via Alembic migrations, no raw SQL, SQLAlchemy ORM only
- **State Management**: Zustand stores (not Redux)
- **Styling**: Tailwind CSS v4 utility classes, no custom CSS unless necessary

## Current Status
- [x] Project scaffolding complete
- [x] Backend: FastAPI + config + database + security + auth
- [x] Backend: All 6 SQLAlchemy models
- [x] Backend: Auth endpoints (register/login/me)
- [x] Backend: Health check endpoint
- [x] Backend: Alembic migration setup
- [x] Backend: Shop CRUD endpoints (list/create/get/update/delete)
- [x] Backend: CR Creator endpoint (Claude API integration for generate)
- [x] Backend: Market Intelligence endpoints (trends + hidden gems)
- [x] Backend: Knowledge Base CRUD endpoints
- [x] Backend: Copilot Chat (sync + SSE streaming)
- [x] Backend: CR Generator service (Claude API prompt engineering)
- [x] Backend: Copilot service (knowledge retrieval + Claude chat)
- [x] Frontend: React + TypeScript + Vite + Tailwind
- [x] Frontend: Login page with API integration (register/login)
- [x] Frontend: ProtectedRoute + auth hydration
- [x] Frontend: Dashboard with stats cards + recent projects + shops
- [x] Frontend: CR Creator form (full form + AI generation + results display)
- [x] Frontend: Market Intelligence (trends/hidden-gems tabs + market filter)
- [x] Frontend: Knowledge Manager (CRUD + category filter)
- [x] Frontend: Copilot Chat (streaming SSE + fallback sync)
- [x] Frontend: Sidebar navigation with Copilot + logout
- [x] Frontend: Shop store (Zustand) + Auth store (Zustand)
- [x] Frontend: Expanded TypeScript types for all entities
- [x] Docker Compose (PostgreSQL + Backend + Frontend)
- [ ] Run initial Alembic migration (need Docker running)
- [ ] TTS OAuth flow (shop token exchange)
- [ ] FastMoss data pipeline (Excel import to trend_products)
- [ ] Pinecone vector search integration (replace keyword retrieval)
- [ ] OpenAI embedding generation for knowledge entries
- [ ] Tests (backend pytest + frontend vitest)

## Next Steps (Priority Order)
1. `docker compose up --build` → verify all services start
2. Run `alembic revision --autogenerate -m "initial_tables"` → `alembic upgrade head`
3. TTS OAuth flow (shop token exchange with TikTok Shop API)
4. FastMoss data pipeline (Excel import to populate trend_products)
5. Pinecone vector integration (replace keyword knowledge retrieval)
6. OpenAI embedding on knowledge create/update
7. Tests (backend unit tests + frontend component tests)

## Architecture Notes
- **Async throughout**: asyncpg + async SQLAlchemy + async FastAPI for handling concurrent AI API calls
- **Multi-tenant**: Row-level security via user_id foreign keys
- **JSONB for flexible data**: ai_output, performance_data, reference_videos, categories, past_products
- **Feedback loop**: CR performance data feeds back into RAG knowledge base
