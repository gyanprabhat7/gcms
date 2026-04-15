# Classified Briefing Pipeline

The GCMS Briefing Pipeline is a high-performance orchestration layer designed to transform hundreds of raw intelligence sources into a coherent, structured intelligence report.

## 🚀 Performance & Orchestration
The pipeline uses a **Bounded Concurrency Model** to balance speed and stealth:

1. **Parallel Worker Queue**: The system spins up **5 concurrent workers** to process scraping and translation requests.
2. **Speed Metrics**: 
   - Before Optimization: ~26 minutes for 50 articles.
   - After Optimization: **~6 minutes** for 50 articles.
   - Effective throughput: ~6 seconds per article.

## 🛡️ Resilience & Stealth
To prevent IP blocking and rate limiting, the pipeline implements three layers of defense:
- **User-Agent Rotation**: Randomly cycles between 5 different browser signatures (Chrome, Firefox, Safari, Edge across Windows/Mac/Linux).
- **Random Jitter**: Injects a variable delay (500ms - 1500ms) between requests to mimic human browsing patterns.
- **Smart Retries**: Implements a 3x retry mechanism with progressive backoff for `403 Forbidden` and `429 Too Many Requests` errors.

## 🔄 Data Lifecycle
1. **Selection**: Incident data is retrieved from the Zustand store based on user-configured filters (Country count, Articles per country).
2. **Enrichment**:
   - `api/intel/fetch`: Extracts raw HTML and converts to clean Markdown using Mozilla Readability.
   - `api/intel/translate`: Converts local-language reports to English.
3. **Analysis**: Theron processes the aggregate data (up to 150 articles) and outputs structured XML.
4. **Generation**: The React frontend parses the XML and uses `jspdf` to render a high-fidelity PDF. The system uses a **dual-delivery model**:
   - **Automatic Download**: Saves the file locally with a timestamped name.
   - **Browser Preview**: Opens the report in a new tab for immediate review.

## 📊 Token Usage
Estimated token consumption is tracked in real-time in the UI:
- Baseline: **~400 tokens per article**.
- Scale: A max-configured brief (10 countries × 15 articles) consumes approximately **~60,000 tokens**.
