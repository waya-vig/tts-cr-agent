# TTS CR Agent

TikTok Shop Seller AI Creative Production Support SaaS

## Quick Start

### Prerequisites
- Docker Desktop
- Node.js 22+
- Python 3.13+

### Setup
1. Clone the repository
2. Copy environment file: `cp .env.example .env`
3. Fill in your API keys in `.env`
4. Start all services:
   ```bash
   docker compose -f infra/docker-compose.yml up --build
   ```
5. Access the app:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Development
See `CLAUDE.md` for detailed development commands and conventions.
