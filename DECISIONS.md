# Architecture Decision Records (DECISIONS.md)

## ADR-001: Separation of Analytics and GenAI
- **Status**: Accepted
- **Context**: LLMs cannot be trusted to perform accurate arithmetic or statistical aggregation over large datasets without hallucination.
- **Decision**: Analytics calculates (DuckDB/Pandas), GenAI explains (Gemini). Gemini only receives structured verified facts and pre-computed derived deltas.
- **Consequences**: Zero hallucinated numbers in calculations. Lineage is tracked on every single metric.

## ADR-002: Storage Layer: Parquet Files + RDBMS Metadata
- **Status**: Accepted
- **Context**: Relational databases degrade when storing dynamic wide business datasets with variable schemas and frequent analytical aggregations.
- **Decision**: Store dataset versions as immutable Parquet files on disk. Store user accounts, mappings, lineage, history, and findings in SQLite/PostgreSQL.
- **Consequences**: Extreme read performance via DuckDB; clean separation of metadata from bulky tabular data.

## ADR-003: Quantum Horizon Design System & Theme Engine
- **Status**: Accepted
- **Context**: The master design image showcases Dark, Light, and Hybrid surfaces built on black/warm-dark bases with glowing orange accents.
- **Decision**: Implement a unified token-driven theme system with Dark, Light, Hybrid, and System options. Pre-paint inline script in `index.html` prevents theme flash. In Light theme, 3D and glow components sit on a dark inset container to maintain contrast.
- **Consequences**: Single codebase supports all required visual paradigms without style drift.

## ADR-004: Geospatial Data Compliance: Survey of India
- **Status**: Accepted
- **Context**: Depicting inaccurate international or state boundaries for India carries legal and reputational risks.
- **Decision**: Bundle verified Survey of India GeoJSON state boundaries and Natural Earth world boundaries. City coordinates are sourced from GeoNames (CC-BY-4.0). No external runtime geocoding services are called.
- **Consequences**: Fully offline, legally compliant geospatial resolution.

## ADR-005: Single WebGL Canvas Constraint
- **Status**: Accepted
- **Context**: Multiple concurrent WebGL contexts on low-power laptops or mobile devices can trigger GPU context loss and high memory usage.
- **Decision**: Limit the application to at most one active WebGL canvas per page. Sub-elements like isometric cubes (`IsoCubeMap`) and scenario flows (`ScenarioFlow`) use SVG/CSS.
- **Consequences**: Consistent 60fps performance and predictable memory ceilings.
