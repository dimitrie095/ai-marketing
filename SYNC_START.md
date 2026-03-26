==============================
SYNCHRONES SERVER SETUP
==============================

Dies ist die EINFACHSTE Lösung für Windows-Probleme mit asyncpg/psycopg2.

✅ Kein asyncpg benötigt
✅ Kein psycopg2 benötigt (pg8000 reicht)
✅ Kein Alembic benötigt
✅ Tabellen werden manuell erstellt

SCHNELLSTART:
-------------

1. Tabellen erstellen (falls noch nicht geschehen):
   ```bash
   cd F:\Marketing_AI\backend
   python setup_manual.py
   ```

2. Server starten (synchrone Version):
   ```bash
   python run_sync_server.py
   ```

3. Frontend starten:
   ```bash
   cd F:\Marketing_AI\frontend
   npm install
   npm run dev
   ```

4. Testen:
   - Backend: http://localhost:8000/health
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/docs

DETAILS:
--------

### Was wurde geändert?

1. **Neue Dateien:**
   - `app/db/session_sync.py` - Synchrone Datenbank-Verbindung
   - `app/main_sync.py` - Synchroner FastAPI Server
   - `run_sync_server.py` - Start-Script mit Prüfungen
   - `SYNC_START.md` - Diese Anleitung

2. **Funktionen:**
   - Verwendet pg8000 (reines Python, keine Build-Probleme)
   - Fällt zurück auf psycopg2 falls verfügbar
   - Keine async-Abhängigkeiten
   - Automatische Treiber-Erkennung

3. **API Endpoints:**
   - `/` - Server Info
   - `/health` - Health Check mit DB Status
   - `/api/test-db` - Datenbank-Test
   - `/api/tables` - Liste aller Tabellen

### Wenn es nicht funktioniert:

#### Fehler: "No module named pg8000"
```bash
pip install pg8000
```

#### Fehler: "Database engine not available"
1. Prüfe .env Datei:
   ```bash
   # In F:\Marketing_AI\.env
   DATABASE_URL=postgresql://postgres:DEIN_PASSWORT@localhost:5432/marketing_ai
   ```
   
   Passwort mit @ Zeichen: Ersetze @ durch %40
   Beispiel: Passwort@123 → Passwort%40123

2. Prüfe ob Datenbank existiert:
   ```bash
   psql -U postgres -c "CREATE DATABASE marketing_ai;"
   ```

3. Tabellen manuell erstellen:
   ```bash
   python setup_manual.py
   ```

#### Fehler: "Table already exists"
Das ist normal - Tabellen existieren bereits.
Der Server läuft trotzdem.

### Fortgeschrittene Nutzung:

#### Normale Server-Version (async) starten:
```bash
# Wenn asyncpg funktioniert:
pip install asyncpg
uvicorn app.main:app --reload
```

#### Synchronen Server direkt starten:
```bash
python -m app.main_sync
```

#### Nur Datenbank testen:
```bash
python -c "from app.db import session_sync; session_sync.test_connection()"
```

### Nächste Schritte:

1. **API erweitern:**
   - `app/api/` Ordner erstellen
   - Routen für Campaigns, Metrics, Chat hinzufügen

2. **Frontend anbinden:**
   - API Calls in `frontend/lib/api.ts`
   - Daten von `/api/tables` anzeigen

3. **Meta Ads API integrieren:**
   - API Keys in .env eintragen
   - Sync-Jobs implementieren

### Troubleshooting:

**Q: Server startet, aber Datenbank nicht verfügbar**
A: Prüfe .env Datei und führe `setup_manual.py` aus

**Q: Frontend kann Backend nicht erreichen**
A: Prüfe CORS in `app/main_sync.py` - allow_origins enthält "http://localhost:3000"

**Q: Tabellen werden nicht angezeigt**
A: `setup_manual.py` ausführen, dann `/api/tables` aufrufen

**Q: Ich möchte doch die async Version verwenden**
A: `pip install asyncpg` und dann `uvicorn app.main:app --reload`

### Erfolgsmeldungen:

✅ "Database connection successful"
✅ "Tables created successfully"  
✅ "Server running on http://localhost:8000"
✅ "Health check returns 200 OK"

====================================
🚀 VIEL ERFOLG!
====================================
