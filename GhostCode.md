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

# Achtung!!

- Always read the Product Description file, Lastenheft and Entwicklungsplan first.

- Löscht alle Datein die du erstellt um etwas zu testen nach erfolgreiche Implementierung.

- Clean Code ist Pflicht

- Bleibt Professionel und effizient

- Wenn du etwas nicht weißt, benutzt web search tool

# Neue Toast-Komponente

Für jede Benutzeraktion (Erstellen, Bearbeiten, Löschen) wird jetzt ein Toast mit entsprechendem Namen und Farbe angezeigt.

- **Toast-Komponente:** `components/ui/toast.tsx`
- **Hook:** `hooks/use-toast.ts`
- **Provider:** bereits in `app/layout.tsx` integriert

**Verwendung:**
```tsx
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

toast({
  title: "Erfolg",
  description: "Aktion erfolgreich durchgeführt.",
  variant: "success", // "default" | "destructive" | "success" | "warning" | "info"
});
```

Die Kampagnen-Seite zeigt bereits Toasts für Create, Update und Delete an.
