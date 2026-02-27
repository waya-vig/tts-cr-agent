# TTS CR Agent - CLAUDE.md

## Project Overview
TikTok Shopセラー向けのAIクリエイティブ制作支援SaaS。
「縦型動画が作れない」セラーの課題を、市場データ×AIで解決する。

### プロダクトの柱
1. **CR制作支援**: 売れてる動画データを基にAIが構成案・台本・フック生成
2. **市場インテリジェンス**: FastMoss APIでトレンド商品・CR・インフルエンサー分析
3. **Copilot (AI Chat)**: 2層RAG（共通+個人ナレッジ）ベースの自然言語アシスタント
4. **ナレッジ管理**: ユーザー/管理者がナレッジを登録 → RAGで活用

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite 6 + Tailwind CSS + shadcn/ui + Zustand + React Router |
| Backend | Python 3.13 + FastAPI + async SQLAlchemy 2.0 + asyncpg + Alembic |
| Database | PostgreSQL (AWS RDS, db.t3.micro) |
| Vector DB | Pinecone Serverless (us-east-1, cosine, 1024dim) |
| AI/LLM | Amazon Bedrock Claude Sonnet 4.5 JP (`jp.anthropic.claude-sonnet-4-5-20250929-v1:0`) |
| Embedding | Amazon Bedrock Cohere Embed Multilingual v3 (`cohere.embed-multilingual-v3`) |
| Container | Docker (Python 3.13-slim, multi-stage build) → AWS ECR |
| Frontend Hosting | AWS Amplify (GitHub auto-deploy) |
| Backend Hosting | AWS App Runner (ECR auto-deploy) |
| CI/CD | GitHub Actions → ECR push → App Runner auto-deploy |

---

## Infrastructure (ALL on AWS ap-northeast-1)

### Production URLs
- **Frontend**: `https://main.dkwittosus0ho.amplifyapp.com`
- **Backend API**: `https://zpmwn9i8vv.ap-northeast-1.awsapprunner.com`
- **Health Check**: `GET /api/v1/health`

### AWS Resources
| Service | Resource | ID/URI |
|---------|----------|--------|
| Amplify | Frontend app | `main.dkwittosus0ho.amplifyapp.com` |
| App Runner | Backend service | `zpmwn9i8vv.ap-northeast-1.awsapprunner.com` |
| RDS | PostgreSQL | `tts-cr-agent.cv4w8ouao9dl.ap-northeast-1.rds.amazonaws.com` |
| ECR | Docker registry | `355511497793.dkr.ecr.ap-northeast-1.amazonaws.com/tts-cr-agent-api` |
| IAM | Service user | `tts-cr-agent-bedrock` (Bedrock + ECR PowerUser) |

**AWS Account**: `355511497793`

### RDS PostgreSQL
- Instance: `tts-cr-agent` (db.t3.micro, 20 GiB)
- User: `postgres` / Password: `vig0808#` / DB: `tts_cr_agent`
- Port: 5432, Public access: Yes
- Security group: 0.0.0.0/0:5432 (for App Runner接続)
- **重要**: パスワードに`#`があるためURL形式(`DATABASE_URL`)は使えない。個別のenv vars使用。

### App Runner Environment Variables
設定はApp Runnerコンソールで管理（コードには含まない）:
```
POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_HOST, POSTGRES_PORT
SECRET_KEY, PINECONE_API_KEY
FASTMOSS_CLIENT_ID, FASTMOSS_CLIENT_SECRET
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION=ap-northeast-1
USE_BEDROCK=true
BACKEND_CORS_ORIGINS=["https://main.dkwittosus0ho.amplifyapp.com","http://localhost:3000"]
```

### Amplify Environment Variables
```
VITE_API_URL=https://zpmwn9i8vv.ap-northeast-1.awsapprunner.com
```

---

## CI/CD Pipeline

### Backend (GitHub Actions → ECR → App Runner)
```
git push main (backend/**変更) → GitHub Actions → Docker build → ECR push → App Runner auto-deploy
```
- File: `.github/workflows/deploy-backend.yml`
- GitHub Secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

### Frontend (GitHub → Amplify)
```
git push main → Amplify auto-build (npm ci && npm run build) → deploy
```

---

## User Accounts (Production)

| Account | Email | Password | Notes |
|---------|-------|----------|-------|
| Test | test@example.com | password123 | テスト用 |
| Staff | staff@vig.co.jp | VigStaff2024 | 社員用 |

---

## Project Structure
```
tts-cr-agent/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry
│   │   ├── config.py            # pydantic-settings (env vars)
│   │   ├── models/              # SQLAlchemy ORM
│   │   │   ├── user.py          # users (UUID, email, password, is_admin)
│   │   │   ├── conversation.py  # conversations + chat_messages
│   │   │   ├── knowledge_base.py    # per-user knowledge
│   │   │   ├── global_knowledge.py  # admin global knowledge
│   │   │   ├── cr_project.py    # CR projects (JSONB ai_output)
│   │   │   ├── creator.py       # creator profiles
│   │   │   ├── shop.py          # TikTok Shop connections
│   │   │   └── trend_product.py # trending product cache
│   │   ├── routers/
│   │   │   ├── auth.py          # login/register/me
│   │   │   ├── copilot.py       # AI chat (sync + SSE streaming)
│   │   │   ├── fastmoss.py      # FastMoss search + image proxy
│   │   │   ├── knowledge.py     # per-user knowledge CRUD
│   │   │   ├── admin_knowledge.py   # global knowledge CRUD
│   │   │   ├── cr.py            # CR project management
│   │   │   ├── market.py        # market analysis
│   │   │   ├── shops.py         # TikTok Shop management
│   │   │   └── health.py        # health check
│   │   ├── services/
│   │   │   ├── copilot_service.py   # RAG chat + streaming
│   │   │   ├── cr_generator.py      # Claude CR generation
│   │   │   ├── fastmoss_service.py  # FastMoss Open/Web API client
│   │   │   ├── embedding_service.py # Bedrock Cohere embeddings
│   │   │   ├── pinecone_service.py  # Pinecone vector ops
│   │   │   └── ai_client.py        # Bedrock client factory
│   │   ├── core/
│   │   │   ├── auth.py          # get_current_user dependency
│   │   │   ├── security.py      # bcrypt + JWT
│   │   │   └── database.py      # async engine + session
│   │   └── migrations/          # Alembic
│   ├── start.sh                 # Docker entrypoint (migrate + start)
│   ├── Dockerfile               # Multi-stage Python 3.13
│   ├── requirements.txt
│   └── alembic.ini
├── frontend/
│   ├── src/
│   │   ├── pages/               # Login, Dashboard, MarketIntelligence,
│   │   │                        # CRCreator, Copilot, KnowledgeManager
│   │   ├── components/          # Layout, Sidebar, ProtectedRoute, ui/
│   │   ├── services/api.ts      # Axios + JWT interceptor
│   │   ├── stores/              # authStore, shopStore (Zustand)
│   │   ├── types/index.ts       # TypeScript interfaces
│   │   └── App.tsx              # React Router config
│   ├── package.json
│   └── vite.config.ts
├── .github/workflows/
│   └── deploy-backend.yml       # ECR push workflow
└── CLAUDE.md                    # THIS FILE
```

---

## External APIs

### FastMoss (TikTok Shop Analytics)

**Open API** (`https://openapi.fastmoss.com`):
- Auth: client_id/secret + SHA256 signature
- `POST /product/v1/search` - 商品検索 (pagesize max 10)
- `POST /product/v1/videoList` - 商品関連動画 (⚠️ `/video`ではなく`/videoList`)
- `POST /creator/v1/rank/topEcommerce` - クリエイターランキング

**Web API** (`https://www.fastmoss.com/api/`):
- Auth: なし（anti-bot params: `_time` + `cnonce`）
- `GET /goods/V2/search` - 商品検索（`img`フィールドあり！）
- `GET /author/search` - クリエイター検索

#### FastMoss制限事項（無料プラン）
- Open API: pagesize最大10、商品画像なし
- Web API: JP正確なデータは先頭10件のみ（2ページ目以降はUSデータに化ける場合あり）
- `s.500fd.com` CDN: ブラウザ直アクセスだとリファラーチェックでブロック
  - **解決策**: バックエンド画像プロキシ `GET /fastmoss/image-proxy?url=...`

#### 現在の商品取得戦略
1. **1ページ目（50件）**: Web API top 10（画像あり）を先頭配置 → Open API pages 1-5から重複除外して追加
2. **2ページ目以降**: Open APIのみ（画像なし → 頭文字アイコン）
3. **5分間インメモリキャッシュ** でAPI枠節約
4. **画像プロキシ** + ブラウザキャッシュ24時間

### TikTok Shop API
- アプリ作成済みだが**リジェクト**された
- 再申請に必要:
  1. Login Kit設定（Redirect URI）
  2. Sandboxでの動画デモ
  3. 全Scopeのデモンストレーション
- **Status: PENDING**

---

## RAG Architecture

```
User Query
  → Bedrock Cohere Embed v3 (1024dim, input_type="search_query")
  → Pinecone Query (parallel)
      ├── "global" namespace (admin knowledge, top_k=3)
      └── "{user_id}" namespace (personal knowledge, top_k=3)
  → Top matches merged into system prompt
  → Bedrock Claude Sonnet 4.5 → Response (streaming SSE)
```

- **Index**: `tts-cr-agent` (Pinecone Serverless, AWS us-east-1, cosine)
- **Dimension**: 1024
- **Fallback**: Pinecone unavailable時はDBテキスト検索
- **Status**: 基本実装完了。ナレッジ追加で強化必要。

---

## Key Technical Decisions & Gotchas

### DBパスワードの`#`問題
`vig0808#` の `#` がURL形式だとフラグメントとして解釈される。
→ `DATABASE_URL` ではなく個別env vars (`POSTGRES_USER`, `POSTGRES_PASSWORD`等) を使用。

### App Runner デプロイ方式
ソースコード直接デプロイは失敗（asyncpg/cryptographyのC拡張コンパイル不可）。
→ ECR Docker imageデプロイを採用。

### Frontend API URL
- Dev: Vite proxy `/api/v1` → localhost:8000
- Prod: `VITE_API_URL` env → App Runner URL
- **注意**: `api.ts`（Axios）と`Copilot.tsx`（streaming fetch）の両方にURLが必要。

### Auth/Hydration
- `authStore.ts`: `/auth/me` に15秒タイムアウト
- ネットワークエラー: token保持してユーザー通す（ログアウトしない）
- 401: token削除してログアウト
- これによりApp Runner cold start時のスピナー問題を解消。

### Copilot System Prompt
- 日本語、絵文字積極使用（🔥✅💡📌🎯）
- フレンドリーなトーン
- 設定は `copilot_service.py` 内

---

## Coding Conventions
- **Backend**: snake_case, 全関数にtype hints, async endpoints, Pydantic schemas
- **Frontend**: camelCase変数, PascalCase components, shadcn/ui, Tailwind utility classes
- **Database**: Alembic migration必須, SQLAlchemy ORMのみ（raw SQLなし）
- **State**: Zustand stores（Reduxは不使用）
- **Git**: mainブランチ直接push → 自動デプロイ

---

## Development Setup

```bash
# Backend
cd backend
cp .env.example .env  # API keyを記入
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev  # http://localhost:3000 (Vite proxy → :8000)
```

---

## Pending Tasks
- [ ] TikTok Shop API再申請（Login Kit + Sandbox demo + 全Scope）
- [ ] RAGナレッジ強化（共通ナレッジの充実）
- [ ] Vercel / Render 旧アカウント削除
- [ ] カスタムドメイン設定（Amplify対応）
- [ ] テスト追加（pytest + vitest）
