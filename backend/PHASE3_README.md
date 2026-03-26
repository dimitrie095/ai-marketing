# Phase 3: LLM Gateway & AI Agenten - L4-01 bis L4-04

## ✅ Implementierte Features

### L4-01: LLM Gateway Architektur (8 SP) ✅

**Komponenten:**
- `app/llm/base.py` - Basis-Klassen und Typ-Definitionen
  - `LLMProvider` Enum: openai, kimi, deepseek
  - `LLMProviderBase`: Abstrakte Basis-Klasse für alle Provider
  - `ChatCompletionRequest/Response`: Standardisierte Formate
  - `LLMProviderConfig`: Provider-Konfiguration mit Kosten-Tracking

- `app/llm/gateway.py` - Haupt-Gateway
  - Provider-Routing und Prioritäts-System
  - Automatische Fallbacks bei Fehlern
  - Retry-Mechanismus (bis zu 3 Versuche)
  - Token-Usage Tracking und Kosten-Berechnung
  - Last-Verteilung über verfügbare Provider

- `app/llm/config.py` - Konfigurations-Management
  - Lädt Konfigurationen aus Umgebungsvariablen
  - Verwaltet Conversations und Messages
  - Trackt Verlauf und Kosten

**Features:**
- ✅ Multi-Provider Support (OpenAI, Kimi, DeepSeek)
- ✅ Standardisierte Input/Output-Schnittstellen
- ✅ Automatisches Provider-Routing
- ✅ Fallback-Mechanismen
- ✅ Token-Usage Tracking
- ✅ Kosten-Berechnung pro Provider
- ✅ Prioritäts-System

### L4-02: OpenAI Integration (5 SP) ✅

**Komponenten:**
- `app/llm/providers.py` - OpenAIProvider Klasse
  - Vollständige OpenAI API Kompatibilität
  - Unterstützt alle GPT-Modelle (GPT-4, GPT-3.5 Turbo, etc.)
  - Streaming-Unterstützung
  - Error Handling und Retry-Logik

**Features:**
- ✅ Vollständige OpenAI API Integration
- ✅ GPT-4, GPT-3.5 Turbo, GPT-4 Turbo Unterstützung
- ✅ Chat Completion (synchron)
- ✅ Chat Completion Streaming
- ✅ Model-Listing
- ✅ Token-Usage Tracking
- ✅ Fehler-Behandlung

**Preise (Standard):**
- GPT-3.5 Turbo: $0.0015 / 1K input tokens, $0.002 / 1K output tokens
- GPT-4: $0.03 / 1K input tokens, $0.06 / 1K output tokens

### L4-03: Kimi (Moonshot) Integration (5 SP) ✅

**Komponenten:**
- `app/llm/providers.py` - KimiProvider Klasse
  - Kimi/Moonshot AI API Integration
  - OpenAI-kompatible API-Schnittstelle
  - Lang-Kontext-Modelle (bis zu 128K tokens)

**Features:**
- ✅ Vollständige Kimi API Integration
- ✅ moonshot-v1-8k, 32k, 128k Modelle
- ✅ Chat Completion (synchron)
- ✅ Chat Completion Streaming
- ✅ Lang-Kontext-Unterstützung (bis 128K tokens)
- ✅ Model-Listing
- ✅ Token-Usage Tracking

**Unterstützte Modelle:**
- moonshot-v1-8k: 8.000 Kontext-Fenster
- moonshot-v1-32k: 32.000 Kontext-Fenster
- moonshot-v1-128k: 128.000 Kontext-Fenster

### L4-04: DeepSeek Integration (5 SP) ✅

**Komponenten:**
- `app/llm/providers.py` - DeepSeekProvider Klasse
  - DeepSeek AI API Integration
  - OpenAI-kompatible API-Schnittstelle
  - Coder-Modelle für Code-Generierung

**Features:**
- ✅ Vollständige DeepSeek API Integration
- ✅ deepseek-chat, deepseek-coder Modelle
- ✅ Chat Completion (synchron)
- ✅ Chat Completion Streaming
- ✅ Code-Generierung Coder-Modell
- ✅ Model-Listing
- ✅ Token-Usage Tracking

**Unterstützte Modelle:**
- deepseek-chat: Allgemeines Chat-Modell
- deepseek-coder: Spezialisiert für Code-Generierung

## 🏗️ Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (FastAPI)                      │
│  /api/v1/llm/chat/completion, /stream, /providers, /usage  │
└─────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  LLM Gateway (llm_gateway)                   │
│  - Provider Routing & Fallbacks                             │
│  - Token Usage Tracking                                     │
│  - Cost Calculation                                         │
│  - Retry Mechanism                                          │
└─────────────────────────────────────────────────────────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                 │
                ▼                 ▼                 ▼
┌────────────────────┐ ┌────────────────┐ ┌──────────────────┐
│ OpenAIProvider     │ │ KimiProvider   │ │ DeepSeekProvider │
│                    │ │ (Moonshot)     │ │                  │
├────────────────────┤ ├────────────────┤ ├──────────────────┤
│ - GPT-4            │ │ - 8k Context   │ │ - Chat Model     │
│ - GPT-3.5 Turbo    │ │ - 32k Context  │ │ - Coder Model    │
│ - Streaming        │ │ - 128k Context │ │ - Streaming      │
│ - Error Handling   │ │ - Streaming    │ │ - Error Handling │
│                    │ │                │ │                  │
└────────────────────┘ └────────────────┘ └──────────────────┘
```

## 🚀 Schnellstart

### 1. API Keys konfigurieren

Füge deine API Keys zur `.env` Datei hinzu:

```env
# OpenAI (https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-...

# Kimi/Moonshot (https://platform.moonshot.cn/)
KIMI_API_KEY=sk-...

# DeepSeek (https://platform.deepseek.com/)
DEEPSEEK_API_KEY=sk-...
```

### 2. LLM Gateway initialisieren

Beim Start der Anwendung wird das Gateway automatisch initialisiert:

```bash
cd backend
uvicorn app.main:app --reload
```

### 3. Provider testen

```bash
curl -X POST http://localhost:8000/api/v1/llm/test
```

Oder manuell initialisieren:

```bash
curl -X POST http://localhost:8000/api/v1/llm/initialize
```

### 4. Chat Completion ausführen

```bash
curl -X POST http://localhost:8000/api/v1/llm/chat/completion \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Was ist 2+2?"}
    ],
    "temperature": 0.0
  }'
```

## 📡 API Endpoints

### LLM Chat

**Chat Completion:**
```
POST /api/v1/llm/chat/completion
Body:
{
  "messages": [{"role": "user", "content": "Frage"}],
  "temperature": 0.7,
  "max_tokens": 500,
  "provider": "openai"  // optional: openai, kimi, deepseek
}
```

**Streaming Chat:**
```
POST /api/v1/llm/chat/stream
Body: (siehe oben)
Response: Server-Sent Events (SSE)
```

**Provider-Liste:**
```
GET /api/v1/llm/providers
```

**Usage-Statistiken:**
```
GET /api/v1/llm/usage
```

**Health Check:**
```
GET /api/v1/llm/health
```

**Provider Test:**
```
POST /api/v1/llm/test
```

## 💻 Code-Beispiele

### Python/Backend

```python
from app.llm import llm_gateway, ChatCompletionRequest, ChatMessage

# 1. Chat Completion
request = ChatCompletionRequest(
    messages=[
        ChatMessage(role="user", content="Erkläre Marketing ROI")
    ],
    temperature=0.7,
    max_tokens=500
)

response = await llm_gateway.chat_completion(request)
print(response.choices[0]["message"]["content"])

# 2. Mit spezifischem Provider
response = await llm_gateway.chat_completion(
    request,
    preferred_provider=LLMProvider.OPENAI
)

# 3. Streaming (async iterator)
request.stream = True
provider = llm_gateway.providers[LLMProvider.OPENAI]
async for chunk in provider.chat_completion_stream(request):
    print(chunk, end="", flush=True)

# 4. Usage-Statistiken
stats = llm_gateway.get_usage_stats()
print(f"Total cost: ${stats['total']['cost']:.4f}")
```

### JavaScript/Frontend

```typescript
// Chat Completion
const response = await fetch('/api/v1/llm/chat/completion', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Frage' }],
    temperature: 0.7
  })
});

const result = await response.json();
console.log(result.data.choices[0].message.content);

// Streaming
const response = await fetch('/api/v1/llm/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Frage' }],
    stream: true
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  console.log(chunk);
}
```

## 📊 Provider-Vergleich

| Feature | OpenAI | Kimi | DeepSeek |
|---------|--------|------|----------|
| **Modelle** | GPT-4, GPT-3.5 | 8k, 32k, 128k | Chat, Coder |
| **Context Window** | 4k-128k | 8k-128k | 4k-16k |
| **Streaming** | ✅ | ✅ | ✅ |
| **Cost Tracking** | ✅ | ✅ | ✅ |
| **Fallback** | ✅ | ✅ | ✅ |
| **Preis (1k input)** | $0.0015-$0.03 | $0.0008 | $0.0007 |
| **Preis (1k output)** | $0.002-$0.06 | $0.0008 | $0.0007 |

## 🔧 Fehlerbehandlung

### Provider-Fehler

Wenn ein Provider fehlschlägt, wird automatisch zum nächsten in der Prioritätsliste gewechselt:

```python
try:
    response = await llm_gateway.chat_completion(request)
except LLMResponseError as e:
    if e.provider == "ALL_PROVIDERS":
        print("Alle Provider fehlgeschlagen!")
    else:
        print(f"Provider {e.provider} fehlgeschlagen: {e.message}")
```

### Config-Fehler

Wenn keine API Keys konfiguriert sind:

```json
{
  "status": "warning",
  "message": "Keine LLM Provider in Umgebung konfiguriert",
  "configured_providers": ["openai", "kimi", "deepseek"]
}
```

## 🧪 Testing

### Automatisierte Tests ausführen:

```bash
cd backend
python test_llm_gateway.py
```

Dies testet:
- Alle konfigurierten Provider
- Chat Completion (synchron)
- Chat Completion (streaming)
- Token-Usage Tracking
- Kosten-Berechnung

### Manuelle Tests:

```bash
# 1. Gateway Health
curl http://localhost:8000/api/v1/llm/health

# 2. Provider Liste
curl http://localhost:8000/api/v1/llm/providers

# 3. Simple Chat Test
curl -X POST http://localhost:8000/api/v1/llm/chat/completion \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hallo"}]}'

# 4. Alle Provider testen
curl -X POST http://localhost:8000/api/v1/llm/test
```

## 📈 Performance Monitoring

### Token-Usage

Das Gateway tracked automatisch:
- Input tokens pro Provider
- Output tokens pro Provider
- Gesamtkosten pro Provider
- Anzahl Requests

```python
stats = llm_gateway.get_usage_stats()

# Gesamtstatistik
print(f"Total cost: ${stats['total']['cost']:.4f}")
print(f"Total tokens: {stats['total']['input_tokens'] + stats['total']['output_tokens']}")

# Pro-Provider
for provider, data in stats['by_provider'].items():
    print(f"{provider}: ${data['cost']:.4f}")
```

### Cost-Tracking

Kosten werden basierend auf Provider-Config berechnet:

```python
config = LLMProviderConfig(
    cost_per_1k_input_tokens=0.0015,  # $0.0015 pro 1k input tokens
    cost_per_1k_output_tokens=0.002   # $0.002 pro 1k output tokens
)

# Für 1000 input + 500 output tokens
cost = provider.calculate_cost(1000, 500)
# cost = (1000/1000 * 0.0015) + (500/1000 * 0.002) = $0.0015 + $0.001 = $0.0025
```

## 🔮 Nächste Schritte

Die nächsten Aufgaben in Phase 3:

1. **L4-05: Provider Routing & Fallbacks** (8 SP)
   - Erweiterte Failover-Strategien
   - Load Balancing
   - Adaptive Provider-Auswahl

2. **L4-06: API Key Encryption** (5 SP)
   - AES-256 Verschlüsselung der API Keys
   - Key-Rotation
   - Secure Storage

3. **L4-07: Token-Usage Tracking** (5 SP)
   - Erweiterte Analytics
   - Dashboard Integration
   - Cost-Budgeting

4. **L5-01: Prompt Engineering Framework** (8 SP)
   - Prompt-Templates
   - Prompt-Versioning
   - A/B Testing

5. **L5-02: KPI Analyse Agent** (8 SP)
   - AI-gestützte KPI-Analyse
   - Natural Language Queries

---

## 📦 Installation & Setup

1. **Requirements installieren:**
```bash
cd backend
pip install -r requirements.txt
```

2. **API Keys konfigurieren:**
```bash
cp .env.example .env
# Edit .env mit deinen API Keys
```

3. **Server starten:**
```bash
uvicorn app.main:app --reload
```

4. **Testen:**
```bash
python test_llm_gateway.py
```

---

## 📚 Dokumentation

- **OpenAI API:** https://platform.openai.com/docs/
- **Kimi/Moonshot API:** https://platform.moonshot.cn/docs
- **DeepSeek API:** https://platform.deepseek.com/docs
- **Phase 2 KPI Engine:** siehe PHASE2_README.md

---

**Phase 3 L4-01 bis L4-04 ist jetzt vollständig implementiert!** 🎉

Alle Provider sind aktiv und können über das zentrale Gateway angesprochen werden.
Das System ist produktionsbereit und skalierbar für weitere Provider.