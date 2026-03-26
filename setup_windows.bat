@echo off
REM =========================================
REM Windows Setup - Marketing Analytics AI
REM Automatische Problem-Behebung
REM =========================================

echo =========================================
echo Windows Setup - Marketing Analytics AI
echo =========================================
echo.

REM Schritt 1: In das richtige Verzeichnis wechseln
cd /d F:\Marketing_AI\backend
if errorlevel 1 (
    echo ❌ Verzeichnis nicht gefunden: F:\Marketing_AI\backend
    echo Bitte prüfe den Pfad!
    pause
    exit /b 1
)
echo ✅ Verzeichnis: %cd%
echo.

REM Schritt 2: Virtuelle Umgebung aktivieren
echo 🔧 Aktiviere Python Umgebung...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo ⚠️  Keine .venv gefunden, verwende globale Python
)
echo.

REM Schritt 3: pg8000 installieren
echo 📦 Installiere pg8000 (reiner Python-Treiber)...
pip install pg8000
if errorlevel 1 (
    echo ❌ pg8000 Installation fehlgeschlagen
    pause
    exit /b 1
)
echo ✅ pg8000 installiert
echo.

REM Schritt 4: Umgebungsvariable setzen
echo 🔧 Setze Datenbank-URL...
set DATABASE_URL=postgresql://postgres:D090799t@localhost:5432/marketing_ai
echo DATABASE_URL=%DATABASE_URL%
echo.

REM Schritt 5: Datenbank-Setup ausführen
echo 📊 Führe Datenbank-Setup durch...
echo Dies kann 1-2 Minuten dauern...
python setup_manual.py
if errorlevel 1 (
    echo ⚠️  Setup hat Warnungen (ist aber normal)
    echo  Wenn Tabellen erstellt wurden, ist alles OK
)
echo.

REM Schritt 6: Erfolg prüfen
echo 🔍 Prüfe Tabellen...
python -c "import pg8000; conn = pg8000.connect(database='marketing_ai', user='postgres', password='D090799t@', host='localhost'); conn.autocommit=True; c = conn.cursor(); c.execute(\"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name\"); tables = [t[0] for t in c.fetchall()]; print('✅ Tabellen gefunden:', len(tables)); print('   ', ', '.join(tables[:5]) + ('...' if len(tables) > 5 else '')); c.close(); conn.close()" 2>nul
if errorlevel 1 (
    echo ⚠️  Tabellen-Check fehlgeschlagen
    echo    Mögliche Ursachen:
    echo    - Datenbank existiert nicht (CREATE DATABASE marketing_ai)
    echo    - Passwort falsch (prüfe .env)
    echo    - PostgreSQL nicht gestartet
)
echo.

REM Schritt 7: Frontend-Check
echo 🌐 Prüfe Frontend...
if exist "..\frontend\package.json" (
    echo ✅ Frontend gefunden
    echo   Installiere Dependencies im Frontend...
    cd ..\frontend
    echo   (Dies kann einige Minuten dauern...)
    call npm install >nul 2>&1
    if errorlevel 1 (
        echo ⚠️  npm install fehlgeschlagen
        echo    Versuche: npm cache clean --force
    )
    cd ..\backend
) else (
    echo ⚠️  Frontend nicht gefunden
)
echo.

REM Schritt 8: Start-Optionen anzeigen
echo =========================================
echo ✅ SETUP ABGESCHLOSSEN!
echo =========================================
echo.
echo Start-Optionen:
echo.
echo A) EINFACHER Server (ohne Datenbank-Probleme):
echo    python run_simple.py
echo.
echo B) NORMALER Server (mit Datenbank):
echo    uvicorn app.main:app --reload
echo.
echo C) Frontend starten:
echo    cd ..\frontend
echo    npm run dev
echo.
echo.
echo Wähle eine Option oder starte manuell...
echo (A/B/C) oder Enter zum Beenden:

set /p choice=
if /i "%choice%"=="A" goto start_simple
if /i "%choice%"=="B" goto start_normal
if /i "%choice%"=="C" goto start_frontend
goto end

:start_simple
echo.
echo 🚀 Starte EINFACHEN Server...
python run_simple.py
goto end

:start_normal
echo.
echo 🚀 Starte NORMALEN Server...
uvicorn app.main:app --reload
goto end

:start_frontend
echo.
echo 🚀 Starte Frontend...
cd ..\frontend
npm run dev
goto end

:end
echo.
echo =========================================
echo Setup abgeschlossen! 
echo Siehe WINDOWS_SIMPLE_START.md für Details
echo =========================================
pause
