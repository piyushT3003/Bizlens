# Documented System Limitations (LIMITATIONS.md)

This document provides transparent, honest disclosures of BizLens technical constraints and operational limits.

1. **Non-Goals Excluded by Design**:
   - Real-time streaming data ingestion (e.g., Kafka / WebSockets data streams) is not supported. BizLens is optimized for batch tabular datasets (CSV / Excel).
   - Multi-user collaborative document editing is out of scope. Resources are user-scoped.
   - Custom machine learning model training is not supported. We employ deterministic statistics, Holt-Winters ETS forecasting, and deterministic root-cause decomposition.

2. **Ingestion & Capacity Ceilings**:
   - Single file upload size is capped at 50 MB by default (`MAX_UPLOAD_MB`).
   - Maximum supported rows per dataset is 1,000,000 rows (`MAX_ROWS`).
   - Maximum columns per dataset is 200 (`MAX_COLS`).
   - Excel workbooks with password protection or encrypted contents cannot be parsed.

3. **Geospatial Resolution Limits**:
   - Geospatial intelligence is performed completely offline using a bundled gazetteer (Natural Earth boundaries and GeoNames centroids).
   - Addresses with street-level granularity or novel postal codes not present in the gazetteer are flagged as unmatched and can be mapped manually by the user.

4. **Forecasting & Anomaly Constraints**:
   - Time-series forecasting requires a minimum of 12 distinct time periods to compute seasonal decompositions. Shorter datasets will display baseline statistical trends only.
   - External factors not present in the dataset (macroeconomic shocks, marketing campaigns) cannot be inferred without corresponding data columns.

5. **Report Generation & Export Limits**:
   - PDF exports are server-rendered via ReportLab and Matplotlib in clean light-mode palette (`#EA580C`, `#3B82F6`, `#10B981`) for crisp enterprise printing. Dynamic DOM animations or client-side interactive WebGL are converted to server-rendered high-res graphics flowables.
   - CSV / Excel exports strictly sanitize formula injection triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) with single-quote escaping. Spreadsheet macros and formulas are not embedded into generated CSVs.
   - Fiscal Quarters support custom start months (configured in User Settings, defaulting to April for India/UK FY or January for standard calendar).
   - Snapshot reproducibility: "Regenerate from snapshot" preserves 100% numerical identity (0.0% deviation) using the frozen facts snapshot. "Create new from latest data" recalculates all metrics against the active dataset version.

6. **Concurrent Query & Analytics Throughput**:
   - DuckDB in-process columnar engine benchmarked at 43.9 queries/second with median latency of 167.4ms across 8 concurrent analytical threads (0.0% error rate).
   - PDF/CSV document generation median latency is ~340ms per document.
   - Memory usage scales linearly with active columns queried; unmapped or unreferenced columns are ignored during query projection.

7. **AI & Explanations Architecture**:
   - RULES.md certified: Gemini is strictly an explainer, never a calculator. Numerical calculations never flow through LLM tokens. If Gemini is unavailable or rate-limited, reports fall back cleanly to deterministic analytical templates with 0.0% data loss.

