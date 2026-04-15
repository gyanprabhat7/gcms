# GCMS Documentation Overview

This directory contains comprehensive documentation for the Global Crisis Management System (GCMS).

# GCMS System Documentation

The Global Crisis Management System (GCMS) is a high-fidelity intelligence platform designed for real-time conflict monitoring, data synthesis, and AI-driven reporting.

## 🚀 Core Capabilities

### 1. Multi-Source Intelligence Aggregation
GCMS normalizes and aggregates data from global conflict and humanitarian streams:
- **GDELT Integration**: Real-time global event tracking.
- **ReliefWeb Proxy**: Direct access to UN humanitarian reports and situation updates.

### 2. Theron Intelligence Analyst (AI)
The system is powered by **Theron**, a custom-tuned AI persona:
- **Evidence-Based Logic**: Uses a specific analytical framework (FACT vs INFERENCE vs SPECULATION).
- **Tactical Chat**: An interactive, noir-style intelligence interface for querying the live data stream.
- **Automated Synthesis**: Capable of processing hundreds of articles into structured reports.

### 3. High-Performance Briefing Pipeline
A resilient orchestration layer for large-scale data ingestion:
- **Bounded Concurrency**: 5-worker parallel queue for scraping and translation.
- **Stealth & Resilience**: Integrated User-Agent rotation and random jitter to bypass bot detection.
- **Structured Output**: XML-driven analysis engine providing high-fidelity PDF reports.

### 4. Interactive Visualization
- **Tactical Map**: Leaflet-based visualization with heat-mapping, clustering, and timeframe filtering.
- **Analytics Dashboard**: Cross-theater comparison tools and economic impact visualizations.

## 📂 Documentation index
- [Architecture & Data Flow](./architecture.md)
- [Theron Persona System](./theron_persona.md)
- [Classified Briefing Pipeline](./briefing_pipeline.md)
- [API Reference](./api_reference.md)
- [Setup & Environment](../.env)

