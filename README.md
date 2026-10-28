# BizLens — Quantum Horizon Enterprise Intelligence Ecosystem

> **Turn Your Data Into Decisions.**  
> *Analyze. Understand. Decide.*

BizLens is an enterprise business intelligence and decision-support platform designed around the **Quantum Horizon** design system (warm-black surfaces, glowing orange accents, glassy cards, 3D hero objects, and a comprehensive Dark / Light / Hybrid theme system).

---

## The Core Principle

> **Analytics calculates. GenAI explains.**  
> Gemini is not the calculator. Gemini is never allowed to invent dataset numbers.

Every KPI, segment total, period comparison, and forecast is derived deterministically by the analytics engine (DuckDB over immutable Parquet files). Google Gemini receives pre-computed, verified facts as structured JSON and provides narratives, summaries, and recommendations. Every AI-generated output is validated by a strict numerical guardrail.

---

## System Requirements

- **Python**: 3.12+ (tested up to 3.14)
- **Node.js**: 20+ (Node v24 supported)
- **Database**: SQLite (built-in development default) or PostgreSQL 16+ (production)
- **Docker & Docker Compose** (optional for containerized deployment)

---

## Quick Start (Single-Command)

The entire application (FastAPI backend + DuckDB analytics engine + compiled React UI) can now be launched with a single command from the project root:

```bash
# 1. Start everything with one command
python app.py
```
> **What this does:**
> - Launches the unified FastAPI server on `http://127.0.0.1:8000/`.
> - Serves both the backend REST APIs (`/api/v1/*`) and the production React Cyber-Glass frontend with full client-side SPA routing (`/dashboard`, `/reports`, `/observatory`, `/settings`).
> - Automatically opens your default web browser to `http://127.0.0.1:8000/`.

### Development Mode (Concurrent Vite + FastAPI)
If you are developing frontend components and want hot-reloading:
```bash
python app.py --dev
```
- **Backend API:** `http://127.0.0.1:8000`
- **Frontend UI (Vite):** `http://localhost:5173`
- **Interactive API Docs:** `http://127.0.0.1:8000/api/docs`

---

## Manual Multi-Process Setup (Alternative)

### 1. Configure Environment
```bash
cp .env.example .env
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
python -m app.data.demo_seed
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Architecture at a Glance

```
Raw Data (CSV/Excel)
       │
       ▼
Secure Ingestion (Magic bytes, OOXML zip-bomb check, PII scan)
       │
       ▼
Column Mapping Confirmation (User-confirmed semantic roles)
       │
       ▼
Data Quality Copilot & Deterministic Cleaning (Preview -> Apply -> Immutable Parquet Version)
       │
       ▼
Deterministic Analytics Engine (DuckDB SQL + Metric Registry) ──► Verified Facts & Lineage
       │                                                                  │
       │                                                                  ▼
       └────────────────────────────────────────────────────────► Google Gemini (Explain Only)
                                                                          │
                                                                          ▼
                                                               Strict Number Guardrail
                                                                          │
                                                                          ▼
                                                               Fact / Interpretation / Recommendation
```

---

## Documentation Index

- [`RULES.md`](./RULES.md) — Binding architectural rules and non-negotiables.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Deep architectural specification and data flow.
- [`DECISIONS.md`](./DECISIONS.md) — Architecture Decision Records (ADRs).
- [`METRICS.md`](./METRICS.md) — Metric registry catalog and mathematical formulas.
- [`SECURITY.md`](./SECURITY.md) — Threat model, security boundaries, and mitigations.
- [`LIMITATIONS.md`](./LIMITATIONS.md) — Documented constraints and honest limitations.
- [`BACKLOG.md`](./BACKLOG.md) — Scope backlog for deferred items and future enhancements.
