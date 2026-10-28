import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Database, Sparkles, Sliders, FileText, CheckCircle2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

export const HowItWorksPage: React.FC = () => {
  const steps = [
    { title: "1. Raw Data Ingestion", desc: "Upload CSV or Excel files. Verify magic bytes, scan for PII, and confirm column mappings." },
    { title: "2. Data Quality & Cleaning", desc: "Deterministic quality scoring and cleaning previews (deduplicate, parse dates, standardize categories)." },
    { title: "3. Deterministic Analytics", desc: "DuckDB computes pure aggregations, segment trends, and PoP growth over immutable Parquet versions." },
    { title: "4. GenAI Explanation", desc: "Google Gemini receives structured facts and generates narrative briefings under the strict number guardrail." },
    { title: "5. Decision Support & What-If", desc: "Simulate pricing/cost scenarios and track prioritized findings with Apply/Complete/Undo workflows." },
  ];

  return (
    <div className="min-h-screen bg-surface-base text-text-main p-6 lg:p-12 max-w-5xl mx-auto space-y-10">
      <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-brand-orange hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">User Journey</span>
        <h1 className="text-3xl font-display font-bold text-text-main mt-1">
          End-to-End Decision Flow
        </h1>
        <p className="mt-2 text-text-muted text-sm max-w-xl">
          Raw Data &rarr; Data Quality &rarr; Analytics &rarr; Insights &rarr; AI Explanation &rarr; What-If &rarr; Decision Support &rarr; Reports
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((s, idx) => (
          <GlassCard key={idx} className="p-5 flex items-start gap-4">
            <div className="w-8 h-8 rounded-xl bg-brand-orange/15 border border-brand-orange/30 text-brand-orange flex items-center justify-center font-bold text-sm shrink-0">
              {idx + 1}
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-main">{s.title}</h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">{s.desc}</p>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
