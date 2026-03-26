Hier ist ein **sauberes, produktionsnahes Lastenheft** für deinen AI Marketing Data Agent – strukturiert nach **Must Have / Should Have / Nice to Have**.
Du kannst das direkt für Dev, Pitch oder Planung verwenden.

---

# 📄 🧠 Lastenheft: AI Marketing Analytics & Decision Agent

---

# 🎯 1. Ziel des Systems

Das System soll:

> **Marketingdaten automatisiert analysieren, Ursachen für Performance-Veränderungen erkennen und konkrete Handlungsempfehlungen liefern.**

Langfristig:
→ **teilautomatisierte Optimierung von Werbekampagnen**

---

# 👥 2. Zielgruppe

- Performance Marketer
- E-Commerce Betreiber
- Growth Teams
- Agenturen

---

# 🧩 3. Systemübersicht

Das System besteht aus:

- Datenintegration (Meta Ads)
- Datenverarbeitung (ETL + KPI Berechnung)
- AI Analyse (Insights + Root Cause)
- User Interface (Chat + Dashboard)
- optional: Action Layer

---

# 🧱 4. Funktionale Anforderungen

---

# 🟥 MUST HAVE (MVP – zwingend notwendig)

## 🔌 4.1 Datenintegration

- Anbindung an Meta Ads API

- Import folgender Daten:
  - Kampagnen
  - Ad Sets
  - Ads
  - Performance-Metriken:
    - Spend
    - Impressions
    - Clicks
    - Conversions
    - Revenue

- tägliche automatische Synchronisation

---

## 🗄️ 4.2 Datenhaltung

- Speicherung in relationaler Datenbank (z. B. PostgreSQL)
- Struktur:
  - Campaigns
  - Ad Sets
  - Ads
  - Metrics (zeitbasiert)

---

## 🔄 4.3 Datenverarbeitung (ETL)

- Berechnung zentraler KPIs:
  - CTR
  - CPC
  - ROAS
  - Conversion Rate

- Aggregationen:
  - nach Zeit (Tag)
  - nach Hierarchie (Campaign / Ad Set / Ad)

---

## 🧮 4.4 Deterministische Berechnungslogik

- Alle KPI-Berechnungen erfolgen **codebasiert (nicht durch AI)**
- Sicherstellung:
  - Reproduzierbarkeit
  - Korrektheit

---

## 🤖 4.5 AI Analyse (Core Feature)

Das System muss folgende Analysen unterstützen:

### a) Trendanalyse

- Entwicklung von KPIs über Zeit

### b) Vergleichsanalyse

- Zeitraumvergleich (z. B. letzte 7 Tage vs. vorherige 7 Tage)

### c) Root Cause Analyse (KRITISCH)

- Identifikation von Ursachen für KPI-Veränderungen

---

## 🧠 4.6 Root Cause Engine (regelbasiert + AI)

- System erkennt automatisch:
  - KPI-Verschlechterungen (z. B. ROAS ↓)

- Analyse von Einflussfaktoren:
  - CPC
  - Conversion Rate

- Ableitung von Ursachen:
  - steigende Kosten
  - sinkende Conversion
  - mögliche Creative Fatigue

---

## 💬 4.7 Natural Language Interface

- User kann Fragen stellen wie:
  - „Warum ist ROAS gefallen?“
  - „Welche Kampagne performt schlecht?“

- System antwortet strukturiert mit:
  1. Zusammenfassung
  2. wichtigsten Veränderungen
  3. Ursachen
  4. Handlungsempfehlungen

---

## 📊 4.8 Ergebnisdarstellung

- Klar strukturierte Insights (kein reiner Fließtext)
- Anzeige von:
  - KPI-Werten
  - Veränderungen (%)
  - betroffene Kampagnen/Ads

---

## 🖥️ 4.9 Benutzeroberfläche

- Web-Interface mit:
  - Chat-Funktion
  - einfachem KPI-Dashboard

---

## 🔐 4.10 Basis-Sicherheit

- Benutzer-Authentifizierung
- sichere API-Verbindungen

---

# 🟧 SHOULD HAVE (nach MVP – hoher Mehrwert)

---

## 🔔 5.1 Monitoring & Alerts

- automatische Erkennung von:
  - KPI-Drops
  - Anomalien

- Benachrichtigung:
  - im Dashboard
  - optional per E-Mail / Slack

---

## 📈 5.2 Automatisierte Reports

- tägliche / wöchentliche Zusammenfassungen
- z. B.:
  - „Weekly Performance Report“

---

## 🧠 5.3 Memory Layer

- Speicherung von:
  - KPIs
  - historischen Trends
  - bekannten Mustern

- Ziel:
  → Kontextbewusste Analysen

---

## 🔍 5.4 Erweiterte Analyse

- Segmentanalysen:
  - nach Kampagne
  - nach Ad Set
  - nach Creative

---

## 🧪 5.5 Anomalie-Erkennung

- automatische Identifikation ungewöhnlicher Veränderungen

---

## 🎛️ 5.6 Verbesserte UI

- Visualisierungen:
  - Zeitreihen
  - KPI Charts

---

## 🔗 5.7 Erweiterbare Datenquellen

- Vorbereitung für:
  - Google Ads
  - Shopify

---

# 🟩 NICE TO HAVE (Skalierung / Differenzierung)

---

## ⚡ 6.1 Action Layer (Gamechanger)

- System kann Aktionen vorschlagen UND ausführen:
  - Budget anpassen
  - Ads pausieren
  - Kampagnen optimieren

---

## 🤖 6.2 Multi-Agent System

- spezialisierte Agents:
  - Data Cleaner
  - Analyst
  - QA Agent

---

## 🧠 6.3 Company Data Brain

- Aufbau eines Knowledge Graphs:
  - KPI Beziehungen
  - historische Muster

---

## 🛒 6.4 Agent Templates / Marketplace

- vorkonfigurierte Use Cases:
  - „E-Commerce Optimizer“
  - „Lead Gen Analyst“

---

## 👥 6.5 Kollaboration

- mehrere User pro Workspace
- gemeinsame Insights

---

## 🔐 6.6 Governance & Audit

- Nachvollziehbarkeit:
  - warum Entscheidungen getroffen wurden

---

## 🧪 6.7 Experimentation Layer

- Unterstützung für:
  - A/B Tests
  - Hypothesenvalidierung

---

# ⚙️ 7. Nicht-funktionale Anforderungen

---

## 🧩 Performance

- Antwortzeit < 5 Sekunden für Standard-Analysen

---

## 📈 Skalierbarkeit

- System muss erweiterbar sein für:
  - mehrere Datenquellen
  - steigende Datenmengen

---

## 🔒 Sicherheit

- sichere Speicherung von API-Keys
- DSGVO-konform (wichtig in Deutschland)

---

## 🧪 Zuverlässigkeit

- korrekte Berechnungen
- keine AI-Halluzinationen bei Zahlen

---
