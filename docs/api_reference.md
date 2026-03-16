# API Reference

GCMS leverages several internal API routes to manage data flow, proxy external feeds, and orchestrate the AI intelligence pipeline.

## 🤖 Intelligence & AI

### `POST /api/chat`
The main entry point for the Theron assistant.
- **Payload**: `messages[]`, `baseUrl?`, `model?`, `apiKey?`
- **Logic**: Resolves the target AI provider (OpenRouter, OpenAI, or Local), injects the `THERON_SYSTEM_PROMPT`, and streams/returns the response.

### `POST /api/brief`
The orchestration engine for the Classified Brief.
- **Payload**: `countries[]` (with article metadata), `baseUrl?`, `model?`, `apiKey?`
- **Flow**: High-speed parallel scraping -> Translation -> Theron XML Analysis.
- **Responsibility**: Orchestrates the 5-worker queue to minimize generation time.

### `POST /api/intel/fetch`
Deep scraping endpoint for news and reporting.
- **Payload**: `{ url: string }`
- **Technology**: Mozilla Readability + Turndown (HTML to Markdown).
- **Features**: User-Agent rotation, random jitter, and 3x retry logic.

### `POST /api/intel/translate`
Translation layer for international intelligence.
- **Logic**: Proxies text to the configured LLM for high-fidelity English translation of local reporting.

## 📡 Data Feeds (Proxies)

### `GET /api/gdelt`
Proxies the GDELT v1 stream.
- **Parameters**: `timespan` (minutes)

### `GET /api/reliefweb`
Accesses UN Humanitarian reporting.
- **Security**: Requires `RELIEFWEB_APP_NAME` for API attribution.

## 📊 Analytics

### `GET /api/analysis/economic`
Produces synthetic economic impact analysis based on regional conflict intensity, theater geography, and incident severity.
