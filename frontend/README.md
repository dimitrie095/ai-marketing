# Marketing Analytics AI - Frontend

Next.js frontend for AI-powered marketing analytics.

## Features

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Accessible UI components
- **API Integration** - Ready to connect to FastAPI backend

## Project Structure

```
frontend/
├── app/                    # Next.js app router pages
│   ├── dashboard/         # Dashboard page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
│   ├── utils.ts          # shadcn utils
│   └── api.ts            # API client
├── types/                # TypeScript types
└── public/               # Static assets
```

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### 1. Install Dependencies

```bash
cd frontend
npm install
```

If you encounter network issues, try:
```bash
npm config set registry https://registry.npmjs.org/
```

### 2. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Update the values:
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:8000)

### 3. Run Development Server

```bash
npm run dev
```

Frontend will be available at: http://localhost:3000

## Development

### Adding New Pages

Create new folders in `app/` directory with `page.tsx` files.

### Adding Components

Use shadcn/ui to add components:

```bash
npx shadcn-ui@latest add button card input
```

Or create custom components in `components/` directory.

### API Integration

Use the `fetchFromAPI` function in `lib/api.ts`:

```typescript
import { fetchFromAPI } from '@/lib/api'

const data = await fetchFromAPI('/endpoint')
```

### Type Safety

Add TypeScript interfaces in `types/` directory:

```typescript
// types/campaign.ts
export interface Campaign {
  id: string
  name: string
  status: string
}
```

### Styling

Use Tailwind CSS utility classes:

```tsx
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  <h1 className="text-2xl font-bold text-gray-900">Title</h1>
</div>
```

## API Endpoints

Current backend endpoints:
- `GET /health` - Health check
- `GET /` - API info

Future endpoints:
- `GET /api/campaigns` - List campaigns
- `GET /api/metrics` - Get metrics
- `POST /api/chat` - AI chat

## Building for Production

```bash
npm run build
npm start
```

## Docker

Build and run:

```bash
docker build -t marketing-ai-frontend .
docker run -p 3000:3000 --env-file .env.local marketing-ai-frontend
```