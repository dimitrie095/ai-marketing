Die **Campaign-Seite** ist in deinem System eine der wichtigsten Analytik-Seiten, weil sie den **Übergang von Rohdaten → Entscheidungen** ermöglicht. Sie muss deshalb weit mehr als nur eine Tabelle sein.

Ich strukturiere dir die Funktionen so, wie sie ein echtes Produkt braucht:

---

# 📊 🧠 Campaign-Seite – Funktionen (Detail-Design)

---

# 🎯 1. Hauptziel der Seite

> **Detaillierte Analyse einzelner Kampagnen + Vergleich + Ursachenverständnis + Handlungsempfehlung**

---

# 🧩 2. Seitenstruktur (UI)

```text
Campaign Page
├── Header (Campaign Info)
├── KPI Overview
├── Trend Chart
├── Performance Breakdown
├── Comparison View
├── AI Insights
├── Recommendations
├── Actions (optional)
```

---

# 🟦 3. Header (Campaign Kontext)

## Inhalte:

- Campaign Name
- Status (Active / Paused)
- Campaign ID
- Zeitraum Auswahl (Date Picker)

---

## Funktionen:

- Zeitraum ändern
- Kampagne wechseln
- Status anzeigen

---

# 📊 4. KPI Overview (Core Section)

## Anzeigen:

Für die gewählte Kampagne:

- Spend
- Revenue
- ROAS
- CTR
- CPC
- Conversion Rate

---

## Funktionen:

- KPI auswählen (Dropdown)
- Vergleich anzeigen:
  - aktueller Zeitraum
  - vorheriger Zeitraum

---

## Darstellung:

- KPI Cards
- % Veränderung (↑ ↓)
- Farbcodierung (rot / grün)

---

# 📈 5. Trend Chart (Zeitverlauf)

## Inhalte:

- Zeitreihe (z. B. 7 / 14 / 30 Tage)

---

## Funktionen:

- KPI auswählbar (ROAS, CPC etc.)
- Zoom / Time Range
- Tooltip mit exakten Werten

---

## Ziel:

👉 Erkennen von Trends und Brüchen

---

# 🧱 6. Performance Breakdown

## 🎯 Ziel:

Verstehen, _wo_ die Performance herkommt

---

## Struktur:

### Drilldown:

```text
Campaign → Ad Set → Ad
```

---

## Tabelle:

| Name | Spend | ROAS | CTR | CPC |
| ---- | ----- | ---- | --- | --- |

---

## Funktionen:

- Sortieren
- Filtern
- Drilldown

---

## Wichtig:

👉 Nutzer kann schnell schlechte Ads identifizieren

---

# 🔍 7. Vergleichsmodus (EXTREM WICHTIG)

## Funktionen:

Vergleich von:

- Zeitraum A vs Zeitraum B
- Campaign vs Campaign
- Ad Set vs Ad Set

---

## Darstellung:

- KPI Differenz (%)
- absolute Differenz

---

## Beispiel:

| KPI  | Jetzt | Vorher | Veränderung |
| ---- | ----- | ------ | ----------- |
| ROAS | 2.1   | 3.0    | -30%        |

---

# 🧠 8. AI Insights (Differenzierer 🔥)

---

## Inhalte:

Automatisch generiert:

- Zusammenfassung
- Hauptveränderungen
- Ursachenanalyse
- Handlungsempfehlungen

---

## Beispiel Output:

- „ROAS ist gefallen, weil CPC gestiegen ist“
- „Conversion Rate ist stabil geblieben“
- „Problem liegt im Traffic“

---

## Funktionen:

- "Explain this campaign"
- Button: „Warum ist das passiert?“

---

# 🧮 9. Root Cause Analyse (Core Feature)

---

## Ziel:

👉 Ursachen für Performance erkennen

---

## Darstellung:

### Ursachenbaum:

```text
ROAS ↓
├── CPC ↑
│   └── Traffic teurer
├── CVR ↓
│   └── Conversion Problem
```

---

## Funktionen:

- visuelle Darstellung
- AI + Regelwerk kombiniert

---

# 💡 10. Recommendations (Handlungslogik)

---

## Inhalte:

Automatisch generierte Vorschläge:

- Budget erhöhen/reduzieren
- Ads pausieren
- Creatives austauschen

---

## Beispiel:

- „CPC ist zu hoch → Zielgruppe prüfen“
- „CVR niedrig → Landing Page optimieren“

---

## Funktionen:

- Empfehlung speichern
- als „Action“ markieren

---

# 🚨 11. Alerts auf Campaign-Level

---

## Inhalte:

- „Campaign Performance Drop“
- „ROAS unter Schwelle“

---

## Funktionen:

- Alert anzeigen
- mit Campaign verknüpft

---

# ⚙️ 12. Actions (Optional / Nice to Have)

---

## Ziel:

👉 direkt aus Analyse handeln

---

## Funktionen:

- Kampagne pausieren
- Budget ändern
- Notizen hinzufügen

---

## Wichtig:

→ später automatisierbar (Agent Layer)

---

# 🧠 13. AI Chat (Contextual)

---

## Funktion:

User kann direkt fragen:

- „Warum ist diese Campaign schlecht?“

---

## Besonderheit:

👉 Kontext ist **bereits die Campaign**

---

## Ergebnis:

- fokussierte Analyse nur für diese Kampagne

---

# 📊 14. Filter & Controls

---

## Filter:

- Zeitraum
- Kampagnenstatus
- KPI Typ

---

## Controls:

- Sortierung
- Gruppierung

---

# 📥 15. Export & Reporting

---

## Funktionen:

- Export als CSV
- später: PDF Report

---

# 🔗 16. Backend Anforderungen (wichtig für die Seite)

---

## API Calls:

```text
GET /campaigns/{id}
GET /campaigns/{id}/metrics
GET /campaigns/{id}/breakdown
GET /campaigns/{id}/insights
GET /campaigns/{id}/recommendations
```

---

## Datenaggregation:

- KPI Berechnung
- Zeitreihen
- Hierarchie Daten

---

# 🧠 17. Datenlogik hinter der Seite

---

## Pipeline:

```text
Meta Data → DB → KPI Service → Analysis Engine → AI → UI
```

---

## Wichtig:

- keine KPI Berechnung im Frontend
- alles kommt aus Backend

---

# ⚠️ 18. Kritische Erfolgsfaktoren dieser Seite

---

## 🔥 1. Geschwindigkeit

- Page Load < 2 Sekunden

---

## 🔥 2. Klarheit

- keine überladenen Charts

---

## 🔥 3. Root Cause Qualität

👉 DAS ist dein USP

---

## 🔥 4. Actionability

👉 nicht nur Analyse, sondern Handlung

---

# 🧭 Fazit

Die Campaign-Seite ist nicht nur eine „Detailansicht“:

👉 Sie ist dein **Decision Engine Interface**

---
