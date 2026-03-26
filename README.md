# Marketing Analytics AI

AI-powered marketing analytics platform with Multi-LLM support for Meta Ads optimization.

## 🎯 Overview

Marketing Analytics AI is a comprehensive platform that connects to Meta Ads API, aggregates campaign data, and provides AI-driven insights using multiple Large Language Models (OpenAI, Kimi, DeepSeek). The system helps marketers make data-driven decisions through intelligent analytics and recommendations.

## ✨ Features

- **Multi-LLM Support** - Integrate with OpenAI, Kimi, and DeepSeek
- **Meta Ads Integration** - Sync campaigns, ad sets, and ads
- **Real-time Analytics** - Performance metrics and KPI tracking
- **AI Chat Interface** - Conversational analytics and insights
- **Decision Support** - AI-powered recommendations
- **Modern UI** - Clean, intuitive interface built with shadcn/ui

## 🏗️ Architecture

### Tech Stack

**Backend:**
- FastAPI - Modern Python web framework
- PostgreSQL - Primary database
- SQLAlchemy 2.0 - Async ORM
- Alembic - Database migrations
- Meta Ads API - Campaign data sync

**Frontend:**
- Next.js 14 - React framework with App Router
- TypeScript - Type-safe development
- Tailwind CSS - Utility-first styling
- shadcn/ui - Accessible UI components

**AI/LLM:**
- OpenAI GPT-4
- Kimi (Moonshot AI)
- DeepSeek

## 📁 Project Structure

```
Marketing_AI/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/         # API routes
│   │   ├── core/        # Core configuration
│   │   ├── db/          # Database models & session
│   │   ├── llm/         # LLM integrations
│   │   ├── services/    # Business logic
│   │   └── main.py      # FastAPI app
│   ├── alembic/         # Database migrations
│   └── requirements.txt # Python dependencies
├── frontend/            # Next.js frontend
│   ├── app/            # Next.js pages
│   ├── components/     # React components
│   ├── hooks/          # Custom hooks
│   ├── lib/           # Utilities
│   └── types/         # TypeScript types
├── database/          # Database schema
└── docs/             # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Meta Ads API credentials

### 1. Clone & Setup

```bash
git clone <repository-url>
cd Marketing_AI
```

### 2. Database Setup

Start PostgreSQL and create database:

```bash
createdb marketing_ai
```

### 3. Backend Setup

```bash
cd backend

# Install dependencies (on Windows, install PostgreSQL drivers separately)
pip install -r requirements.txt

# If PostgreSQL drivers fail to build, install them manually:
# Download pre-built wheels from: https://www.lfd.uci.edu/~gohlke/pythonlibs/
# Or use: pip install psycopg2-binary asyncpg

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
# DATABASE_URL=postgresql://user:pass@localhost:5432/marketing_ai
# OPENAI_API_KEY=your_key
# META_ACCESS_TOKEN=your_token

# Run database migration
alembic upgrade head

# Start backend
uvicorn app.main:app --reload
```

Backend will be available at: http://localhost:8000

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start frontend
npm run dev
```

Frontend will be available at: http://localhost:3000

## 🔧 Configuration

### Environment Variables (Backend)

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/marketing_ai

# LLM API Keys
OPENAI_API_KEY=sk-...
KIMI_API_KEY=your_kimi_key
DEEPSEEK_API_KEY=your_deepseek_key

# Meta Ads API
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_ACCESS_TOKEN=your_access_token
META_AD_ACCOUNT_ID=act_your_account_id

# Security
ENCRYPTION_KEY=your_32_char_encryption_key
```

### Environment Variables (Frontend)

```bash
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📊 Database Schema

The database includes:

- **campaigns** - Meta Ads campaigns
- **ad_sets** - Campaign ad sets
- **ads** - Individual advertisements
- **metrics** - Performance metrics (core table)
- **llm_providers** - LLM service configurations
- **llm_configs** - Specific model configurations
- **conversations** - Chat history
- **messages** - Individual chat messages
- **sync_jobs** - Background sync tracking

## 🛠️ Development

### Backend Development

```bash
cd backend

# Run tests
pytest

# Lint code
ruff check .

# Format code
ruff format .

# Create migration
alembic revision --autogenerate -m "Description"
```

### Frontend Development

```bash
cd frontend

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run type-check

# Add shadcn component
npx shadcn-ui@latest add button card input
```

## 🚀 Deployment

### Backend Deployment

```bash
cd backend

# Production server
docker build -t marketing-ai-backend .
docker run -p 8000:8000 \
  -e DATABASE_URL="postgresql://..." \
  -e OPENAI_API_KEY="sk-..." \
  marketing-ai-backend
```

### Frontend Deployment

```bash
cd frontend

# Build for production
npm run build

# Or with Docker
docker build -t marketing-ai-frontend .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL="https://api.example.com" \
  marketing-ai-frontend
```

## 📚 API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is proprietary and confidential.

## 🆘 Support

For issues and questions:
- Check the documentation in `docs/`
- Review API docs at `/docs`
- Check logs in backend/frontend consoles

## 🗺️ Roadmap

- [ ] Phase 1: Core infrastructure ✓
- [ ] Phase 2: Meta Ads API integration
- [ ] Phase 3: LLM integration
- [ ] Phase 4: AI chat interface
- [ ] Phase 5: Advanced analytics
- [ ] Phase 6: Optimization engine

---

**Marketing Analytics AI** - Empowering data-driven marketing decisions with AI
