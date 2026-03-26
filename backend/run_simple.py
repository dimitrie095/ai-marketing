"""
EINFACHE Alternative zu uvicorn + Alembic
Startet Server OHNE Datenbank-Probleme
"""

import os
import sys
from pathlib import Path

# Füge backend zum Pfad hinzu
sys.path.insert(0, str(Path(__file__).parent))

def create_simple_app():
    """Erstelle eine einfache FastAPI App OHNE Datenbank"""
    
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    
    app = FastAPI(
        title="Marketing Analytics AI (Simple)",
        description="Einfache Version ohne Datenbank-Probleme",
        version="1.0.0"
    )
    
    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    @app.get("/")
    def root():
        return {
            "message": "Marketing Analytics AI API (Simple Mode)",
            "version": "1.0.0",
            "status": "running",
            "database": "not_connected (simple mode)"
        }
    
    @app.get("/health")
    def health():
        return {
            "status": "healthy",
            "service": "marketing-analytics-api",
            "mode": "simple",
            "database": "disabled"
        }
    
    @app.get("/api/test")
    def test():
        return {
            "message": "API funktioniert!",
            "next_steps": [
                "Datenbank-Setup ausführen: python setup_manual.py",
                "Dann mit normaler app.main starten"
            ]
        }
    
    return app

def test_database():
    """Teste ob Datenbank funktioniert"""
    try:
        from setup_manual import get_connection, list_tables
        conn = get_connection()
        tables = list_tables(conn)
        conn.close()
        return len(tables) > 0
    except Exception as e:
        print(f"❌ Datenbank-Fehler: {e}")
        return False

def main():
    """Hauptfunktion"""
    print("=" * 60)
    print("EINFACHER SERVER START")
    print("(Ohne komplexe Datenbank-Abhängigkeiten)")
    print("=" * 60)
    print()
    
    # Teste Datenbank
    print("🔍 Teste Datenbank-Verbindung...")
    db_ok = test_database()
    
    if db_ok:
        print("✅ Datenbank VERFÜGBAR - du kannst normal starten:")
        print("   uvicorn app.main:app --reload")
        print()
        response = input("   Soll ich den normalen Server starten? (j/n): ")
        if response.lower() in ['j', 'ja', 'y', 'yes']:
            print("\n🚀 Starte NORMALEN Server...")
            os.system("uvicorn app.main:app --reload")
            return
    else:
        print("❌ Datenbank NICHT verfügbar oder Fehler")
        print("   Führe aus: python setup_manual.py")
        print()
    
    # Starte simplen Server
    print("🚀 Starte EINFACHEN Server (ohne Datenbank)...")
    print()
    print("📝 Info:")
    print("   - API läuft auf http://localhost:8000")
    print("   - Docs auf http://localhost:8000/docs")
    print("   - Datenbank ist DEAKTIVIERT")
    print("   - Zum Testen der Frontend-Verbindung")
    print()
    
    app = create_simple_app()
    
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    main()
