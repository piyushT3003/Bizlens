# BIZLENS: PERMANENT SYSTEM RULES (RULES.md)
*Re-read at the start of every phase. Non-negotiable.*

---

## 1. THE CORE PRINCIPLE (PART C VERBATIM)

> **Analytics calculates. GenAI explains.**  
> Gemini is not the calculator. Gemini is not allowed to invent dataset numbers.

### Rules
- Every number in the product comes from the deterministic analytics engine.
- Gemini receives **verified facts as structured JSON** and only explains, summarizes, interprets, and recommends.
- The engine **pre-computes every figure Gemini might mention**, including derived ones: percentage change, absolute difference, share of total, rank, contribution, ratio. The model never does arithmetic.
- If a required column or enough data is missing, the engine returns a structured `unavailable` result (naming the missing role or threshold). Never invent data, locations, columns, forecasts, or benchmarks.
- Nothing is hardcoded to one dataset. All analysis uses schema discovery, semantic column roles, and the user-confirmed column mapping.

### Output Tagging
Every AI-produced block carries exactly one tag:
- **CALCULATED FACT**: a number or comparison computed by the engine; shows value and lineage.
- **INTERPRETATION**: AI reading of facts; must cite the fact IDs it relies on.
- **RECOMMENDATION**: a potential action grounded in cited facts; worded as options ("consider", "may", "worth investigating"), never as guaranteed outcomes.

### Number Guardrail (runs after every Gemini response)
1. Extract every numeric token/phrase from the response: digits, decimals, percentages, currency (₹, Rs, INR, $), lakh/crore, K/M/B suffixes, number words ("twelve percent"), and counts.
2. Normalize each to a canonical value (₹1.24 Cr = 12,400,000 = 1.24 crore; 8.4% = 0.084).
3. Compare against the supplied fact set with a documented tolerance (rounding to displayed precision; relative tolerance for unit-converted values).
4. Allow only: numbers present in facts, plus trivially structural numbers (list ordinals, years/dates that appear in facts or the user's question).
5. On any violation: regenerate **once** with a stricter instruction listing the allowed values. If it still fails, return the **facts-only version** with the notice "AI explanation unavailable for this result."
6. Log every violation (no PII) with prompt version, model, and facts hash. Expose the violation rate in `/metrics`.
7. Test it with: correct numbers, reformatted-correct numbers, wrong numbers, invented percentages, and numbers hidden in prose.

### Lineage
Every important result stores and can display:  
`Dataset -> Dataset Version -> Column Mapping -> Filters -> Calculation (metric id + formula + registry version) -> Result -> AI Explanation (prompt version, model, facts hash)`.  
Lineage is stored at compute time, not reconstructed later. The UI exposes it through an **Evidence drawer** ("View Evidence").

---

## 2. THE NO FAKE NUMBERS RULE

No placeholder data in production code paths. No hardcoded dataset values. No secrets in code, logs, tests, fixtures, or screenshots. Demo data exists only as an explicit, labeled demo dataset.

---

## 3. SCOPE TIERS AND NON-GOALS (PART D VERBATIM)

### MUST (build first, fully working end to end with real data)
Auth; secure upload (CSV, XLSX, XLS); column-mapping confirmation; data quality + cleaning + versioning; analytics engine with metric registry; dashboard; Ask BizLens (General AI + Current Dataset) with guardrails and "show your work"; Management Reports (PDF + CSV); Gemini fallback behavior; export sanitization; PII warning; demo mode; settings persisted in the DB; public landing page; Gemini consent notice.

### SHOULD (only after MUST passes its gates; each ships complete or hidden behind a feature flag)
What-If Analysis with visible assumptions; one shared Findings generator feeding Business Insights, Executive Briefing, Decision Support (Apply/Complete/Undo); deterministic root-cause analysis; anomaly detection; forecasting with backtests; Live Data (FX + weather only) with combined analysis; Chat Dataset context; Explain This Chart on all key charts; dynamic geographic map and globe.

### LATER (do NOT build; record in BACKLOG.md)
PDF/document Q&A context; market/financial data connector; government/public data connector; dataset-to-dataset comparison UI; Kannada/Hindi UI; notification channels beyond in-app.

### NON-GOALS
Real-time streaming data, multi-user collaboration, custom ML model training, native mobile apps, a separate "light-only" or "dark-only" app (BizLens ships a Dark/Light/Hybrid theme system instead).

---

## 4. EFFECTS AND MOTION RULES (PART L8 & MATRIX VERBATIM)

- **Motion rules:** Animate only `transform` and `opacity` (theme cross-fade animates color tokens only); cap simultaneous animations (max 12 concurrent elements); **count-up numbers only on first load of a page, only on KPI cards, never in reports/exports/PDF**, with an exact final value; charts animate on first render only; `prefers-reduced-motion` respected everywhere; Appearance `motion_level` (full/reduced/off) can only make motion more restrictive.
- **Glass budget:** At most 2 stacked `backdrop-filter` layers per viewport region; solid fallback via `@supports not (backdrop-filter)`, on reduced motion, on low-end devices, and by default on the Light theme's content surfaces.
- **Canvas limit:** **One WebGL canvas per page maximum.** All 3D canvases lazy-loaded; paused off-screen or when tab is hidden; DPR capped; static image/CSS/SVG fallback on mobile, low-end devices, WebGL failure, or reduced motion.
- **Accessibility:** Keyboard navigation everywhere, visible focus rings, **WCAG AA contrast verified separately in Dark, Light, and Hybrid** (orange on white must use the deep-orange text token `#C2410C`), ARIA labels, `aria-live` for streaming AI answers and toasts, chart text alternatives with a data-table toggle, no motion-only or color-only information, skip-to-content link, focus management in drawers and palette.
- **No ad-hoc design values:** All components read tokens from `tokens.ts`; no ad-hoc hex values, durations, or blur values in components (enforced by linter & test).

---

## 5. GATE PROCEDURE (PART B4 VERBATIM)

Every phase ends with a **GATE** delivering, in this order:
1. **(a) Test results:** the actual commands run and their summarized output (unit, integration, property-based, E2E that apply);
2. **(b) Proof stack runs:** instructions and status for running the stack from clean state;
3. **(c) Acceptance checklist:** the phase's acceptance criteria as a checklist, each PASS / FAIL / DEFERRED with how it was verified;
4. **(d) UI Screenshots & Visual Diff:** screenshots at **1440px** and **390px** of every new or changed page and state, each placed beside the relevant master-image panel with a list of known visual differences, in the default theme plus one other theme (full 3-theme matrix at Phases 1 and 13c);
5. **(e) Summary & Risks:** short change summary, deferred items (appended to `BACKLOG.md`), and newly found risks.

Then **STOP** and wait for approval.
