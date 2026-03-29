📄 🧠 Specification: Alerts & Monitoring Page
🎯 1. Ziel der Seite

Automatische Erkennung, Priorisierung und Darstellung von Performance-Problemen in Marketingdaten

Die Seite soll:

kritische KPI-Veränderungen erkennen
Ursachen sichtbar machen
konkrete Handlungsempfehlungen liefern
🧩 2. Seitenübersicht (UI Struktur)
Alerts Page
├── Header
├── Filters & Controls
├── Alerts List
│ ├── Alert Card
│ ├── Alert Detail Panel
🖥️ 3. UI Komponenten
🟦 3.1 Header
Inhalte:
Titel: „Alerts & Monitoring“
Anzahl aktiver Alerts
Zeitraum-Auswahl
🎛️ 3.2 Filter & Controls
Filter:
Severity Level:
High
Medium
Low
Status:
Unread
Read
Entity Type:
Campaign
Ad Set
Ad
Controls:
Sortierung:
nach Datum
nach Severity
🚨 4. Alerts Liste (Core Feature)
Darstellung: Alert Cards

Jeder Alert wird als Card dargestellt:

🟥 Alert Card Struktur
Inhalte:
🔴 Severity Badge
Titel:
z. B. „ROAS Drop in Campaign X“
KPI Info:
„ROAS -32%“
Zeitraum
Kurzbeschreibung:
„CPC ist gestiegen, Conversion Rate gesunken“
Betroffene Entity:
Campaign / Ad Set / Ad Name
Timestamp
UI Verhalten:
Klick → öffnet Detail Panel
Hover → Quick Info
🔍 5. Alert Detail Panel
Inhalte:

1. Summary
   kurze Erklärung des Problems
2. KPI Changes
   KPI Vorher Jetzt Veränderung
3. Root Cause (🔥 wichtig)
   z. B.:
   CPC ↑ +35%
   CVR ↓ -18%
4. Betroffene Elemente
   Campaign Name
   Ad Sets / Ads
5. Empfehlung
   konkrete Handlung:
   „Budget reduzieren“
   „Creative austauschen“
   Aktionen:
   ✅ „Mark as Read“
   📌 „Pin / Save“
   💬 „Ask AI“
   ⚙️ 6. Funktionale Anforderungen
   🔔 6.1 Alert Generierung

Das System muss automatisch Alerts erstellen bei:

KPI Drop:
ROAS ↓ über Threshold (z. B. -20%)
Conversion Rate ↓
Revenue ↓
KPI Spike:
CPC ↑ stark
Spend ↑ ungewöhnlich
Anomalien:
statistische Abweichungen vom Normalverhalten
📊 6.2 Severity Level Definition
🔴 High
ROAS Drop > 30%
Revenue Drop kritisch
🟠 Medium
moderate KPI Veränderung
🟢 Low
kleine Abweichungen
📌 6.3 Alert Status

Jeder Alert hat:

is_read: boolean
created_at
Funktionen:
als gelesen markieren
Bulk markieren
🔁 6.4 Alert Lifecycle
Detected → Created → Viewed → Resolved
🧠 7. Backend Logik
🧮 7.1 Detection Engine
Input:
KPI Zeitreihen
Logik (Beispiel):
IF ROAS_today < ROAS_avg_last_7_days \* 0.8:
create_alert("ROAS Drop")
📊 7.2 Anomaly Detection

Optionen:

einfache Methode:
moving average + threshold
advanced:
z-score
ML (später)
🗄️ 8. Datenmodell
Tabelle: alerts
CREATE TABLE alerts (
id SERIAL PRIMARY KEY,
entity_type TEXT, -- campaign, adset, ad
entity_id TEXT,

    alert_type TEXT, -- KPI_DROP, ANOMALY
    severity TEXT,   -- HIGH, MEDIUM, LOW

    title TEXT,
    description TEXT,

    kpi_name TEXT,
    change_percent FLOAT,

    root_cause TEXT,
    recommendation TEXT,

    is_read BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);
🔌 9. API Design
GET /alerts
Query Params:
severity
status
entity_type
Response:
[
{
"id": 1,
"title": "ROAS Drop",
"severity": "HIGH",
"change_percent": -32,
"entity_name": "Campaign X"
}
]
GET /alerts/{id}

→ Detaildaten

POST /alerts/{id}/read

→ als gelesen markieren

POST /alerts/generate

→ manuelle Trigger (Debug / Admin)

🔄 10. Datenfluss
ETL → KPI Calculation → Detection Engine → Alerts Table → UI
⚡ 11. Performance Anforderungen
Alerts laden < 1 Sekunde
Detailansicht < 2 Sekunden
🔐 12. Sicherheit
Alerts sind user-/workspace-spezifisch
Zugriff nur für autorisierte Nutzer
🧨 13. Kritische Erfolgsfaktoren
🔥 1. Relevanz

👉 keine Spam Alerts

🔥 2. Genauigkeit

👉 falsche Alerts = Vertrauen weg

🔥 3. Klarheit

👉 sofort verständlich

🔥 4. Actionability

👉 jeder Alert muss sagen:
„Was soll ich tun?“
