# ALPHA — Quantitative Intelligence Frontend

React + TypeScript frontend for the CNN+RAG finance model dashboard.

## Setup

```bash
cd alpha-frontend
npm install
npm run dev
```

Open http://localhost:3000 — make sure your FastAPI backend is running on port 8000.

## Project Structure

```
src/
  api/client.ts          — fetch + WebSocket helpers
  types/index.ts         — all TypeScript interfaces
  hooks/index.ts         — useToast, useLivePrice, useTicker
  components/
    Navbar.tsx            — top nav with search + clock
    TickerStrip.tsx       — sticky horizontal ticker chips
    HeroPanel.tsx         — price, delta, signal, confidence bar
    PriceChart.tsx        — Recharts AreaChart with period buttons
    ReturnsGrid.tsx       — 1D/5D/20D/Vol cards
    ForecastTab.tsx       — bar chart + stat cards
    TechnicalsTab.tsx     — RSI/MACD/BB/VolRatio cards
    DirectionGauge.tsx    — canvas semicircle arc + prob bars
    KeyStats.tsx          — sidebar stat rows
    RAGDocs.tsx           — retrieved documents with attention bars
    ToastContainer.tsx    — slide-in toast notifications
  App.tsx                 — root layout, state orchestration
  main.tsx                — ReactDOM entry
  index.css               — CSS variables + global styles + keyframes
```

## Tech Stack

- React 18 + TypeScript
- Vite (dev server with proxy to :8000)
- Recharts (AreaChart, BarChart)
- Custom hooks for WebSocket live price streaming
- No UI library — pure inline styles with CSS variables
