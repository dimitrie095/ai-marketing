# 📄 🧠 Pflichtenheft: AI Marketing Analytics & Decision Agent (Multi-LLM Edition)

---

## 🎯 1. Ziel der Umsetzung

Ziel ist die Implementierung eines Systems, das:

- Marketingdaten aus Meta Ads integriert
- KPIs deterministisch und fehlerfrei berechnet
- automatisierte Analysen (inkl. Root Cause) durchführt
- Ergebnisse über eine Chat-basierte Oberfläche bereitstellt
- **Multi-LLM fähig ist**: Dynamische Unterstützung und Konfiguration verschiedener Sprachmodelle (z. B. Kimi, DeepSeek, OpenAI) ohne Vendor Lock-in.

---

## 🏗️ 2. Systemarchitektur

### 2.1 Architekturprinzip

Trennung in 5 Layer zur Gewährleistung der Skalierbarkeit und Wartbarkeit:

1.  **Frontend** (User Interface)
2.  **Backend API** (FastAPI)
3.  **Processing & Execution Layer** (Deterministische Logik)
4.  **LLM Gateway** (Abstraktionsschicht für KI-Modelle)
5.  **AI Layer** (Agenten-Steuerung)

### 2.2 Technologie-Stack

| Komponente              | Technologie                                      |
| :---------------------- | :----------------------------------------------- |
| **Backend**             | Python + FastAPI                                 |
| **Frontend**            | React / Next.js                                  |
| **Datenbank**           | PostgreSQL                                       |
| **Datenverarbeitung**   | Pandas                                           |
| **AI / LLM**            | LLM Gateway (OpenAI API, Kimi API, DeepSeek API) |
| **Infrastruktur (MVP)** | Docker, Cloud: AWS / GCP                         |

---

## 🗄️ 3. Datenmodell (konkret)

Das Datenmodell wird um die Konfiguration von LLMs erweitert.

### 3.1 Tabellenstruktur: Marketing (SQL-ready)

**campaigns**

```sql
CREATE TABLE campaigns (
    id TEXT PRIMARY KEY,
    name TEXT,
    status TEXT
);
```

**ad_sets**

```sql
CREATE TABLE ad_sets (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES campaigns(id),
    name TEXT
);
```

**ads**

```sql
CREATE TABLE ads (
    id TEXT PRIMARY KEY,
    ad_set_id TEXT REFERENCES ad_sets(id),
    name TEXT,
    creative_type TEXT
);
```

**metrics (zentral)**

```sql
CREATE TABLE metrics (
    date DATE,
    entity_type TEXT, -- campaign, adset, ad
    entity_id TEXT,
    spend FLOAT,
    impressions INT,
    clicks INT,
    conversions INT,
    revenue FLOAT,
    PRIMARY KEY (date, entity_type, entity_id)
);
```

### 3.2 Tabellenstruktur: LLM Konfiguration (Erweiterung)

**llm_configs**

```sql
CREATE TABLE llm_configs (
    id SERIAL PRIMARY KEY,
    name TEXT,             -- z. B. "DeepSeek Prod"
    provider TEXT,         -- "deepseek", "kimi", "openai"
    model_name TEXT,       -- z. B. "deepseek-chat"
    api_url TEXT,
    api_key_encrypted TEXT,
    is_active BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 4. Datenintegration (Meta Ads)

### 4.1 API-Anbindung

- Nutzung der Meta Marketing API
- Authentifizierung via OAuth

### 4.2 Datenabruf & Sync

- **Endpunkte:** Campaigns, Ad Sets, Ads, Insights (Metrics)
- **Sync-Logik:** Täglicher Batch-Job (Cronjob, alle 24h). Speicherung neuer Daten, Update bestehender Einträge.

---

## 🔄 5. Datenverarbeitung (ETL)

### 5.1 Verarbeitungsschritte

1.  Rohdaten laden
2.  Normalisierung
3.  KPI Berechnung
4.  Speicherung

### 5.2 KPI Berechnung (Python Code)

```python
def calculate_kpis(df):
    # Fehlerbehandlung für Division by Zero muss implementiert werden
    df["ctr"] = df["clicks"] / df["impressions"]
    df["cpc"] = df["spend"] / df["clicks"]
    df["roas"] = df["revenue"] / df["spend"]
    df["cvr"] = df["conversions"] / df["clicks"]
    return df
```

### 5.3 Aggregationen

Nach Datum, Campaign, Ad Set, Ad.

---

## 🧮 6. Execution Engine (Deterministisch)

### Ziel

Alle Berechnungen sind deterministisch. Das Vertrauen in das System basiert auf korrekten Zahlen, nicht auf Halluzinationen.

### Umsetzung

- SQL Queries für Aggregationen
- Python (Pandas) für KPI Berechnung

### Beispiel Query

```sql
SELECT
    SUM(spend) as spend,
    SUM(revenue) as revenue
FROM metrics
WHERE date BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE;
```

---

## 🤖 7. AI Layer & Multi-LLM Support

Dies ist der Kern der Erweiterung. Das System ist nicht länger auf einen Anbieter festgelegt.

### 7.1 LLM Gateway (Neues Modul)

Das Gateway kapselt alle Anbieter-Aufrufe.

- **Input:** Standardisierter Prompt + Kontext.
- **Output:** Standardisierte JSON-Antwort.
- **Funktion:** Routet die Anfrage an den konfigurierten Provider (z.B. DeepSeek oder Kimi).

### 7.2 Backend Implementierung (Python)

**Interface:**

```python
class LLMProvider:
    def generate(self, prompt: str) -> str:
        raise NotImplementedError
```

**Implementierungen (Beispiele):**

```python
class DeepSeekProvider(LLMProvider):
    def generate(self, prompt):
        # call DeepSeek API
        pass

class KimiProvider(LLMProvider):
    def generate(self, prompt):
        # call Kimi API
        pass
```

**Dynamische Auswahl:**

```python
def get_active_llm():
    config = db.get_active_llm() # Liest aus 'llm_configs'

    if config.provider == "deepseek":
        return DeepSeekProvider(config)
    elif config.provider == "kimi":
        return KimiProvider(config)
    # Fallback oder Fehlerbehandlung
```

### 7.3 AI Komponenten (Agent Logic)

Diese Komponenten nutzen das Gateway:

1.  **Intent Classifier:** Erkennt User-Anfragen (`root_cause_analysis`, `trend_analysis`, `comparison`).
2.  **Analysis Planner:** Erstellt Analyseplan (JSON), z.B.:
    ```json
    {
      "steps": [
        "load_last_7_days",
        "load_previous_7_days",
        "compare_roas",
        "analyze_cpc"
      ]
    }
    ```
3.  **Insight Generator:** Nutzt das aktive LLM (via Gateway), um strukturierte Antworten zu formulieren.

### 7.4 Prompt-Struktur

- **Input:** KPI Daten, Veränderungen (%), erkannte Muster (deterministisch berechnet).
- **Output:** Summary, Key Drivers, Root Cause, Recommendations.

---

## 🧠 8. Root Cause Engine (Hybrid Ansatz)

### 8.1 Logik (Deterministisch)

Regelbasierte Vor-Prüfung, um dem LLM Fakten zu liefern.

```pseudo
IF ROAS ↓ THEN:
    CHECK CPC
    CHECK CVR

IF CPC ↑:
    cause = "traffic cost increase"

IF CVR ↓:
    cause = "conversion issue"

IF both:
    cause = "combined effect"
```

### 8.2 Integration mit AI

Die Engine liefert strukturierte Ursachen an das LLM Gateway. Das LLM formuliert daraus die verständliche Erklärung für den User.

---

## 💬 9. API Design (Backend)

### 9.1 Core Endpoints

**POST /query**
Request:

```json
{ "question": "Warum ist ROAS gefallen?" }
```

Response:

```json
{
  "summary": "...",
  "metrics": {...},
  "root_cause": "...",
  "recommendations": [...]
}
```

**GET /metrics** (Liefert KPI Daten)
**POST /sync** (Startet Daten-Synchronisation)

### 9.2 Admin Endpoints (LLM Management)

**POST /admin/llm**
(Hinzufügen einer neuen Konfiguration)

```json
{
  "name": "DeepSeek Prod",
  "provider": "deepseek",
  "model_name": "deepseek-chat",
  "api_url": "...",
  "api_key": "..."
}
```

**GET /admin/llm** (Liste aller Modelle)
**POST /admin/llm/activate/{id}** (Aktiviert ein Modell)
**POST /admin/llm/test/{id}** (Testet Verbindung mit Test-Prompt)

---

## 🖥️ 10. Frontend

### 10.1 User Komponenten

- Chat Interface
- KPI Dashboard
- Insight Panel

### 10.2 Admin Settings UI (Neu)

Seite „LLM Settings“ mit folgenden Funktionen:

- **Hinzufügen:** Name, Provider (Dropdown: Kimi, DeepSeek, etc.), Model Name, API URL, Key.
- **Bearbeiten:** Ändern bestehender Konfigurationen.
- **Aktivieren:** Auswahl des aktiven Modells.
- **Test:** Button „Test Connection“, sendet Testprompt, zeigt Response & Latenz.

---

## 🔐 11. Sicherheit

- Speicherung von API-Keys (Meta & LLMs) verschlüsselt in der DB.
- HTTPS enforcement.
- User Authentication (JWT).
- LLM Keys niemals im Frontend exponieren.

---

## ⚙️ 12. Deployment & Testing

### 12.1 Deployment

- **Backend:** Docker Container.
- **DB:** Managed PostgreSQL.
- **Frontend:** Vercel / Netlify.

### 12.2 Testing

- **Unit Tests:** KPI Berechnungen, Root Cause Logik, LLM Provider Mocks.
- **Integration Tests:** API Endpunkte, Datenfluss, LLM Gateway Routing.
- **Validierung:** Vergleich mit echten Ads-Daten.

---

## 📈 13. Erweiterbarkeit & Kritische Erfolgsfaktoren

### Erweiterbarkeit

- Weitere Datenquellen (Google Ads) können im Layer 3 angehängt werden.
- Action Layer für automatische Kampagnen-Optimierung.
- Einfaches Hinzufügen neuer LLM-Provider (z.B. Anthropic, Local LLMs) durch Erweitern des Gateways.

### Kritische Erfolgsfaktoren

1.  **Korrekte Daten:** Falsche Daten = Falsche Insights (Garbage In, Garbage Out).
2.  **Deterministische Berechnung:** Kein Vertrauen ohne Genauigkeit in der Mathematik.
3.  **Verständliche Insights:** Keine generischen AI-Texte, sondern spezifische, auf den Root-Cause-Daten basierende Antworten.
4.  **Root Cause Qualität:** Der größte Differentiator zum Standard-Reporting.
