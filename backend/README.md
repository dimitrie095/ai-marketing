# Marketing Analytics AI - Backend

FastAPI backend for AI-powered marketing analytics with Multi-LLM support.

## Features

- **FastAPI** - Modern, fast web framework
- **PostgreSQL** - Primary database with async support
- **SQLAlchemy 2.0** - ORM with async capabilities
- **Alembic** - Database migrations
- **Multi-LLM Support** - OpenAI, Kimi, DeepSeek integration
- **Meta Ads API** - Campaign, ad set, and ad management

## Project Structure

```
backend/
├── app/
│   ├── api/              # API routes
│   ├── core/             # Core configuration
│   ├── db/               # Database models and session
│   │   ├── __init__.py
│   │   ├── base.py       # SQLAlchemy Base
│   │   ├── models.py     # ORM models
│   │   └── session.py    # Database sessions
│   ├── llm/              # LLM integrations
│   ├── processing/       # Data processing
│   ├── services/         # Business logic
│   └── main.py           # FastAPI application
├── alembic/              # Database migrations
├── tests/                # Test suites
└── requirements.txt      # Python dependencies
```

## Setup

### Prerequisites

- Python 3.10+
- PostgreSQL 14+
- Node.js 18+ (for frontend)

### 1. Database Setup

Start PostgreSQL and create the database:

```bash
createdb marketing_ai
```

### 2. Environment Variables

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `*_API_KEY` - LLM API keys
- `META_*` - Meta Ads API credentials

### 3. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Database Migration

Run the setup script:

```bash
python test_db.py
```

Or manually:
```bash
# Create migration
alembic revision --autogenerate -m "Initial schema"

# Apply migrations
alembic upgrade head
```

### 5. Run Development Server

```bash
uvicorn app.main:app --reload
```

API will be available at: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## Database Schema

The database includes:

- **campaigns** - Meta Ads campaigns
- **ad_sets** - Ad sets within campaigns
- **ads** - Individual advertisements
- **metrics** - Performance metrics (core table)
- **llm_providers** - LLM provider configurations
- **llm_configs** - Specific LLM model configurations
- **conversations** - Chat conversation history
- **messages** - Individual messages in conversations
- **sync_jobs** - Background sync job tracking

## API Endpoints

Current endpoints:
- `GET /` - API information
- `GET /health` - Health check

## Development

### Adding New Models

1. Add model to `app/db/models.py`
2. Import in `app/db/__init__.py`
3. Create migration: `alembic revision --autogenerate -m "Description"`
4. Apply migration: `alembic upgrade head`

### Adding New Routes

1. Create file in `app/api/`
2. Add router to `app/main.py`

### Testing

```bash
# Run tests
pytest

# With coverage
pytest --cov=app tests/
```

## Deployment

### Environment Variables for Production

```bash
APP_ENV=production
DEBUG=false
LOG_LEVEL=WARNING

# Use strong encryption key
ENCRYPTION_KEY=<generated-key>
```

### Docker

Build and run:

```bash
docker build -t marketing-ai-backend .
docker run -p 8000:8000 --env-file .env marketing-ai-backend
```
