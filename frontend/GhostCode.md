# Projektstruktur

- Backend: FastAPI + MongoDB (Beanie ODM)
- Frontend: Next.js 14 + TypeScript + shadcn/ui
- Auth: JWT Bearer Token

# Wichtige Befehle

- Backend starten: uvicorn app.main:app --reload
- Frontend starten: npm run dev
- Tests: pytest

# Konventionen

- API Responses immer als {"status": "success", "data": ...}
- Decimal128 → Decimal Konvertierung via field_validator
- Kein Demo-Mode, nur DB

# Bekannte Eigenheiten

- LLM Config braucht zuerst: POST /api/v1/llm/config/providers/initialize-defaults
- MongoDB speichert Decimal als Decimal128, Beanie konvertiert nicht automatisch
