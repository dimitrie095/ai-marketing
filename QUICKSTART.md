# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Database Setup

Install PostgreSQL if not already installed:
- Download: https://www.postgresql.org/download/
- Create database: `createdb marketing_ai`
- Or use pgAdmin to create database

### Step 2: Install Dependencies

```bash
# Backend dependencies
cd backend

# Install Python packages (PostgreSQL drivers may need manual install on Windows)
pip install -r requirements.txt

# If psycopg2/asyncpg fail, install pre-built wheels:
# Visit: https://www.lfd.uci.edu/~gohlke/pythonlibs/
# pip install psycopg2‑2.9.9‑cp312‑cp312‑win_amd64.whl

# Frontend dependencies
cd ../frontend

# Install Node.js packages
npm install

# If npm has network issues, try:
npm config set registry https://registry.npmjs.org/
```

### Step 3: Configure Environment

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your credentials

# Frontend
cd ../frontend
cp .env.example .env.local
```

### Step 4: Database Migration

```bash
cd backend

# Run Alembic migration
alembic upgrade head

# Or if alembic command not found:
python -m alembic upgrade head
```

### Step 5: Start Services

```bash
# Terminal 1: Start Backend
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Start Frontend
cd frontend
npm run dev
```

### Step 6: Verify Installation

- Backend: http://localhost:8000/docs (Swagger UI)
- Frontend: http://localhost:3000
- Health Check: http://localhost:8000/health

## 📋 Next Steps

1. **Add Meta Ads API credentials** to `.env` file
2. **Add LLM API keys** (OpenAI, Kimi, DeepSeek)
3. **Configure encryption key** (generate with: `openssl rand -hex 32`)
4. **Test API connection** from frontend dashboard
5. **Run first sync** to import campaign data

## 🔧 Troubleshooting

### PostgreSQL Driver Issues (Windows)

```bash
# Option 1: Install from pre-built wheels
# Download from: https://www.lfd.uci.edu/~gohlke/pythonlibs/
pip install psycopg2‑2.9.9‑cp312‑cp312‑win_amd64.whl

# Option 2: Use conda
conda install -c anaconda psycopg2

# Option 3: Use pure Python alternative (slower)
pip install pg8000
# Then change DATABASE_URL to: postgresql+pg8000://...
```

### Node.js Dependencies Issues

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install

# Use yarn instead
npm install -g yarn
yarn install
```

### Port Already in Use

```bash
# Change backend port
uvicorn app.main:app --reload --port 8001

# Change frontend port
npm run dev -- --port 3001
```

### Database Connection Issues

```bash
# Verify PostgreSQL is running
pg_isready -h localhost -p 5432

# Check database exists
psql -U postgres -l | grep marketing_ai

# Reset database
psql -U postgres -c "DROP DATABASE marketing_ai;"
psql -U postgres -c "CREATE DATABASE marketing_ai;"

# Run migrations again
cd backend
alembic upgrade head
```

## 📞 Getting Help

1. Check logs in terminal
2. Review API docs: http://localhost:8000/docs
3. Check database schema in `database/schema.sql`
4. Verify `.env` file configuration
5. Check PostgreSQL logs

## ✅ Success Checklist

- [ ] PostgreSQL installed and running
- [ ] Database "marketing_ai" created
- [ ] Python dependencies installed
- [ ] Node.js dependencies installed
- [ ] `.env` files configured
- [ ] Alembic migration successful
- [ ] Backend running (port 8000)
- [ ] Frontend running (port 3000)
- [ ] Health check returns 200 OK
- [ ] Dashboard loads in browser

Once all checks pass, you're ready to start development! 🎉
