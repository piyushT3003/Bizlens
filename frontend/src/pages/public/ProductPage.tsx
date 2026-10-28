import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { FactBadge } from "@/components/ui/FactBadge";
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  BarChart3,
  Sparkles,
  Sliders,
  TrendingUp,
  FileText,
  Shield,
  Layers,
  Zap,
} from "lucide-react";

export const ProductPage: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.substring(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [location.hash]);

  const capabilities = [
    {
      id: "quality",
      num: "01",
      title: "Data Quality Copilot & Ingestion",
      icon: Database,
      summary: "Magic-byte file validation, zip-bomb protection, PII scanning, and deterministic cleaning.",
      details: [
        "Ingests CSV, TSV, and Excel files with strict OOXML zip-bomb and compression ratio limits.",
        "Scans for PII patterns including Indian Aadhaar, PAN, phone numbers, and emails with redaction.",
        "Deterministic cleaning transformations: Deduplication, Date Parsing, Null Imputation, and Categorical Standardization.",
        "Produces immutable, content-hashed Parquet versions with optimistic concurrency lock verification.",
      ],
    },
    {
      id: "analytics",
      num: "02",
      title: "Deterministic Analytics Engine & Metric Catalog",
      icon: BarChart3,
      summary: "DuckDB columnar execution engine operating over Parquet datasets with 100% calculation lineage.",
      details: [
        "Pre-computes every KPI from strictly cataloged metric definitions in METRICS.md.",
        "Zero-denominator safety guards ensure null values with explicit reasons instead of division-by-zero crashes.",
        "Multi-dimensional grouping across categories, regions, customer segments, and fiscal calendars.",
        "100% snapshot reproducibility: Re-aggregating any Parquet snapshot produces bitwise identical figures.",
      ],
    },
    {
      id: "ask",
      num: "03",
      title: "Ask BizLens Conversational Intelligence",
      icon: Sparkles,
      summary: "Grounded natural language business intelligence with 'Show Your Work' lineage drawers.",
      details: [
        "Structured Query Intent Detection routes questions to pre-computed analytical fact tables.",
        "Strict Number Guardrails tokenize all AI responses and verify every single numeric token against factual data.",
        "Mandatory tagged blocks: [CALCULATED FACT], [INTERPRETATION], and [RECOMMENDATION].",
        "Evidence Drawer slide-out reveals underlying DuckDB SQL statements, engine latency, and fact sets.",
      ],
    },
    {
      id: "whatif",
      num: "04",
      title: "What-If Scenario Simulation Workspace",
      icon: Sliders,
      summary: "Microeconomic elasticity modeling, financial variance waterfalls, and 5x5 sensitivity heatmaps.",
      details: [
        "Deterministic volume contraction cascade: ΔQ = Q₀ × ε × (ΔP / P₀) + Q₀ × η × (ΔM / M₀) with declared ε = -0.80.",
        "Reconciled Gross Profit variance waterfall bridges baseline gross profit to simulated final results.",
        "5x5 Price × Cost Sensitivity Heatmap grid evaluates simultaneous pricing power and inflationary drag.",
        "Scenario run persistence with side-by-side comparison matrices evaluating baseline vs saved runs.",
      ],
    },
    {
      id: "decisions",
      num: "05",
      title: "Decision Support & Root-Cause Mitigation",
      icon: TrendingUp,
      summary: "Automated business findings, Pareto root-cause decomposition, and 1-click mitigation plans.",
      details: [
        "Categorizes operational findings into Critical Risks, High-Impact Growth Opportunities, and Process Efficiencies.",
        "Pareto 80/20 driver identification isolates top volume drags and pricing leakage points.",
        "Interactive 1-click mitigation actions with simulated profit recovery and instant reversible rollback.",
        "Audit trail logs all completed decision actions with timestamp and user attribution.",
      ],
    },
    {
      id: "reports",
      num: "06",
      title: "Executive Management Reports Engine",
      icon: FileText,
      summary: "Server-rendered ReportLab PDF and sanitized CSV exports with 100% snapshot reproducibility.",
      details: [
        "Generates print-ready executive PDFs featuring high-resolution Revenue Velocity bar charts and Category donuts.",
        "Fiscal-calendar calculator supports Indian standard (April start) and calendar year (January start) quarters.",
        "Formula injection defenses sanitize all generated CSV files by escaping formula operators.",
        "Snapshot archive maintains complete immutable facts snapshot JSON alongside generated artifacts.",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-surface-base text-text-main p-6 lg:p-12 max-w-6xl mx-auto space-y-12">
      <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-brand-orange hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">Architecture & Product</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-status-positive/10 text-status-positive font-bold border border-status-positive/20">
            RULES.md Compliant
          </span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-display font-bold text-text-main mt-1">
          The BizLens Intelligence Architecture
        </h1>
        <p className="mt-2 text-text-muted text-sm max-w-2xl leading-relaxed">
          BizLens cleanly bifurcates numerical calculations from generative interpretations:
          analytical computation is executed strictly in DuckDB/Python, while Google Gemini synthesizes contextual explanations under post-generation guardrails.
        </p>
      </div>

      {/* The Core Principle Banner */}
      <GlassCard tilt hoverGlow className="p-6 space-y-3 border-brand-orange/40 card-3d">
        <div className="flex items-center gap-2 text-brand-orange text-xs font-bold uppercase tracking-wider">
          <Shield className="w-4 h-4" />
          The Core Principle (Part C)
        </div>
        <blockquote className="text-base font-semibold text-text-main border-l-2 border-brand-orange pl-3 italic">
          &ldquo;Analytics calculates. GenAI explains. Gemini is not the calculator. Gemini is not allowed to invent dataset numbers.&rdquo;
        </blockquote>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <FactBadge kind="fact" />
          <FactBadge kind="interpretation" />
          <FactBadge kind="recommendation" />
        </div>
      </GlassCard>

      {/* Capabilities Sections */}
      <div className="space-y-8">
        {capabilities.map((cap) => {
          const Icon = cap.icon;
          return (
            <GlassCard
              key={cap.id}
              id={cap.id}
              tilt
              hoverGlow
              hoverLift
              className="scroll-mt-24 p-6 sm:p-8 space-y-4 card-3d"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center text-brand-orange">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-brand-orange tracking-widest uppercase block">
                      Capability {cap.num}
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-text-main">{cap.title}</h2>
                  </div>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">{cap.summary}</p>

              <div className="pt-2 border-t border-surface-border">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-2">
                  Key Technical Guarantees
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-muted">
                  {cap.details.map((d, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-status-positive flex-shrink-0 mt-0.5" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-surface-border text-xs text-text-muted">
        <Link to="/" className="text-brand-orange hover:underline font-semibold flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Public Home
        </Link>
        <Link to="/demo" className="text-brand-orange hover:underline font-semibold flex items-center gap-1">
          Explore Live Demo Workspace
        </Link>
      </div>
    </div>
  );
};
