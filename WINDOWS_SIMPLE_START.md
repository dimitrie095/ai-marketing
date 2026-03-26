==============================
EINFACHSTES WINDOWS SETUP
==============================

SCHNELLSTART (Kopieren und Einfügen):
---------------------------------------

cd F:\Marketing_AI\backend

:: 1. Umgebung vorbereiten
set DATABASE_URL=postgresql://postgres:D090799t%%40@localhost:5432/marketing_ai

:: 2. Datenbank-Setup (MANUELL, funktioniert garantiert)
python setup_manual.py

:: 3. Server starten
python run_simple.py


Wenn das klappt, siehst du:
✅ Verbindung OK
✅ XX Tabellen erstellt
✅ Server läuft auf http://localhost:8000

Falls es NICHT klappt - LIES WEITER

====================================

PROBLEM 1: Passwort falsch?
====================================

Wenn du Fehler wie "Passwort-Authentifizierung fehlgeschlagen" siehst:

1. Finde dein KORREKTES PostgreSQL-Passwort
   (Vielleicht ist es nur "postgres" oder "")

2. Erstelle eine .env Datei mit dem RICHTIGEN Passwort:
   
   Datei: F:\Marketing_AI\.env
   Inhalt:
   DATABASE_URL=postgresql://postgres:DEIN_PASSWORT@localhost:5432/marketing_ai
   
   WICHTIG: Wenn dein Passwort @ enthält, ersetze es durch %40
   Beispiel: Passwort@123 → Passwort%40123

3. Führe Setup erneut aus:
   python setup_manual.py

====================================

PROBLEM 2: Datenbank existiert nicht?
====================================

Falls Fehler "Datenbank nicht gefunden":

1. Starte psql (PostgreSQL Command Line):
   
   psql -U postgres

2. Erstelle die Datenbank:

   CREATE DATABASE marketing_ai;
   \q

3. Führe Setup erneut aus:
   python setup_manual.py

====================================

PROBLEM 3: pg8000 fehlt?
====================================

Falls Fehler "no module named pg8000":

pip install pg8000

====================================

PROBLEM 4: Alles klappt trotzdem nicht?
====================================

Dann starte den Server OHNE Datenbank:

python run_simple.py

Dies startet einen simplen Server nur für Frontend-Tests.
Die Antworten sind statisch, aber der Server LÄUFT.

====================================

ERFOLG ÜBERPRÜFEN
====================================

Nach Setup sollte dies funktionieren:

python -c "import pg8000; conn = pg8000.connect(database='marketing_ai', user='postgres', password='D090799t@', host='localhost'); cursor = conn.cursor(); cursor.execute('SELECT tablename FROM pg_tables WHERE schemaname = \'public\''); print('Tabellen:', [t[0] for t in cursor.fetchall()]); conn.close()"

Sollte anzeigen: Tabellen: ['campaigns', 'ad_sets', 'ads', ...]

====================================

SERVER TESTEN
====================================

Wenn Server läuft, teste:

1. Browser öffnen: http://localhost:8000/health
   Sollte zeigen: {"status":"healthy"}

2. Frontend testen: http://localhost:3000
   Sollte das Dashboard zeigen

====================================

NOCHMAL ZUSAMMENFASSUNG
====================================

Die EINFACHSTE Methode garantiert zum Laufen:

1. cd F:\Marketing_AI\backend
2. pip install pg8000
3. python setup_manual.py
4. python run_simple.py

Wenn Schritt 3 fehlschlägt (Tabellen nicht erstellt):
   - Starte trotzdem Schritt 4
   - Der Server läuft dann ohne Datenbank
   - Du kannst die API trotzdem testen

====================================

Nächste Schritte nachdem es läuft:
====================================

1. Frontend installieren:
   cd F:\Marketing_AI\frontend
   npm install
   npm run dev

2. API testen:
   curl http://localhost:8000/health

3. Meta Ads API Keys in .env eintragen

4. Mit echtem Daten-Austausch starten

====================================

HILFE
====================================

Für SOFORT Hilfe:
- Schau in run_simple.py (kommentierter Code)
- Schau in setup_manual.py (wie Tabellen erstellt werden)
- Alle Docs: QUICKSTART.md

Du schaffst das! 💪
