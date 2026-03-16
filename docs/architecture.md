# System Architecture

GCMS is a modern intelligence platform built on Next.js (App Router) and Tailwind CSS v4.

## 🏗️ Core Stack
- **Framework**: Next.js 15+
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (+ Legacy compat)
- **State Management**: Zustand
- **AI Integration**: OpenAI SDK (compatible with OpenRouter, Ollama, and LM Studio)
- **PDF Engine**: jsPDF
- **Data Clients**: Custom Scraping Pipeline with caching

## 🌉 Data Layer
The system aggregates data from primary intelligence streams:
1. **GDELT**: Global Database of Events, Language, and Tone (v1 API).
2. **ReliefWeb**: UN humanitarian news and reporting.

Articles and incidents are normalized and stored in the **Zustand store** (`src/lib/store.ts`), which serves as the "single source of truth" for the Map, Analytics, and Briefing components.

## 🚦 API Flow
- **Client -> /api/chat**: Proxies chat messages to the configured LLM, appending the Theron system prompt.
- **Client -> /api/brief**: Orchestrates the multi-stage briefing pipeline (Fetch -> Translate -> Analyze).
- **Client -> /api/intel/fetch**: Resolves external URLs to clean Markdown content.
- **Client -> /api/gdelt**: Proxies the GDELT intelligence feed to avoid CORS issues.

## 🎨 UI/UX Philosophy
- **Tactical Aesthetics**: Dark-mode focused, monospaced typography, and high-contrast alert states.
- **Live Feed**: 30-minute rolling window for "Live" event status.
- **Interactive Map**: Leaflet.js based visualization with heat-mapping and cluster-filtering capabilities.
