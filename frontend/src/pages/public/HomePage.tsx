import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { AICore } from "@/components/visuals/AICore";
import { ParticleField } from "@/components/ui/Ambient";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  Eye,
  ArrowRight,
  ShieldCheck,
  Zap,
  Database,
  BarChart3,
  Sliders,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  TrendingUp,
  GitBranch,
  FileText,
  Lock,
  Layers,
  ChevronRight,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const featureCards = [
    {
      id: "quality",
      title: "Data Quality Copilot",
      desc: "Deterministic cleaning, deduplication, type inference, and automated quality scoring.",
      icon: Database,
      link: "/product#quality",
    },
    {
      id: "analytics",
      title: "Deterministic Analytics",
      desc: "DuckDB columnar engine executing strictly cataloged metric formulas with 100% calculation lineage.",
      icon: BarChart3,
      link: "/product#analytics",
    },
    {
      id: "ask",
      title: "Ask BizLens AI",
      desc: "Conversational business intelligence guarded by numerical verification and 'Show Your Work' lineage.",
      icon: Sparkles,
      link: "/product#ask",
    },
    {
      id: "whatif",
      title: "What-If Scenario Simulator",
      desc: "Microeconomic price elasticity models, variance waterfall bridges, and 5x5 sensitivity heatmaps.",
      icon: Sliders,
      link: "/product#whatif",
    },
    {
      id: "decisions",
      title: "Decision Support & Findings",
      desc: "Statistical root-cause decomposition paired with actionable 1-click mitigation plans.",
      icon: TrendingUp,
      link: "/product#decisions",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Ingest & Profile",
      desc: "Upload CSV, Excel, or Parquet datasets. Magic-byte verification, PII redaction, and semantic role inference run automatically.",
    },
    {
      num: "02",
      title: "Deterministic Compute",
      desc: "DuckDB calculates all aggregate KPIs, variance bridges, and outlier deviations. Numbers are strictly computed in Python/SQL, never invented.",
    },
    {
      num: "03",
      title: "Guardrailed AI Explanation",
      desc: "Google Gemini receives pre-calculated structured facts to write strategic observations, checked by real-time numerical guardrails.",
    },
  ];

  return (
    <div className="min-h-screen bg-surface-base text-text-main flex flex-col justify-between relative overflow-hidden">
      {/* Top Public Sticky Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-surface-border bg-surface-base/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-orange text-white flex items-center justify-center shadow-glowSm">
            <Eye className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-lg text-text-main tracking-tight">BizLens</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-text-muted">
          <Link to="/showcase" className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-orange/15 border border-brand-orange/40 text-brand-orange hover:bg-brand-orange/25 font-semibold text-xs transition-colors">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Master Showcase</span>
          </Link>
          <Link to="/product" className="hover:text-text-main transition-colors">Product</Link>
          <Link to="/how-it-works" className="hover:text-text-main transition-colors">How It Works</Link>
          <Link to="/demo" className="hover:text-text-main transition-colors">Demo</Link>
          <Link to="/style-guide" className="hover:text-brand-orange text-xs px-2 py-1 rounded bg-surface-card border border-surface-border">Style Guide</Link>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <Link to="/login" className="text-xs font-semibold text-text-main hover:text-brand-orange px-3 py-1.5">
            Sign In
          </Link>
          <Button variant="primary" size="sm" onClick={() => navigate("/signup")}>
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section (Replicating Master Image Panel 2: Intelligence Exchange) */}
      <section className="relative px-6 py-16 lg:py-24 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 w-full">
        <ParticleField count={30} />

        {/* Left Copy */}
        <div className="flex-1 text-center lg:text-left space-y-6 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-orange/30 bg-brand-orange/10 text-brand-orange text-xs font-bold tracking-wide">
            <Zap className="w-3.5 h-3.5" />
            <span>Quantum Horizon Ecosystem</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-text-main leading-tight">
            Turn Your Data Into <span className="text-brand-orange drop-shadow-sm">Decisions.</span>
          </h1>

          <p className="text-lg text-text-muted max-w-xl font-normal leading-relaxed">
            Analyze. Understand. Decide. A deterministic enterprise intelligence engine paired with guardrailed Gemini AI explanation.
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate("/signup")}
              icon={<ArrowRight className="w-5 h-5" />}
            >
              Get Started Free
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate("/showcase")}
              icon={<Sparkles className="w-4 h-4 text-brand-orange" />}
            >
              Master Showcase
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => navigate("/demo")}
            >
              Explore Live Demo
            </Button>
          </div>

          <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-status-positive" />
              Works with CSV & Excel
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-status-positive" />
              Zero Hallucinated Numbers
            </span>
          </div>
        </div>

        {/* Right 3D Visual with Orbiting KPI Chips (Panel 2 Showcase) */}
        <div className="flex-1 flex items-center justify-center relative w-full max-w-md lg:max-w-none">
          {/* Orbiting Chip 1: Top-Left */}
          <div className="absolute -top-4 -left-4 z-20 animate-float-3d">
            <GlassCard tilt hoverGlow className="px-3.5 py-2 border-brand-orange/40 shadow-glowSm card-3d">
              <span className="text-[10px] uppercase font-bold text-text-muted block">Sample Data</span>
              <span className="text-sm font-bold text-text-main tabular-nums">₹12.48 L Net Sales</span>
            </GlassCard>
          </div>

          {/* Orbiting Chip 2: Bottom-Right */}
          <div className="absolute -bottom-4 -right-4 z-20 animate-float-3d [animation-delay:2s]">
            <GlassCard tilt hoverGlow className="px-3.5 py-2 border-brand-orange/40 shadow-glowSm card-3d">
              <span className="text-[10px] uppercase font-bold text-text-muted block">Target Analysis</span>
              <span className="text-sm font-bold text-status-positive tabular-nums">+31.4% Gross Margin</span>
            </GlassCard>
          </div>

          {/* Orbiting Chip 3: Middle-Right (Parallax Depth) */}
          <div className="absolute top-1/2 -right-8 -translate-y-1/2 z-20 hidden sm:block animate-float-3d [animation-delay:4s]">
            <GlassCard tilt hoverGlow className="px-3 py-1.5 border-brand-orange/30 shadow-glowSm card-3d">
              <span className="text-[10px] uppercase font-bold text-text-muted block">Verified Lineage</span>
              <span className="text-xs font-bold text-brand-orange tabular-nums">100% Fact Grounded</span>
            </GlassCard>
          </div>

          {/* Central AI Core (Panel 2) */}
          <div className="relative p-6 rounded-full bg-gradient-to-b from-brand-orange/15 to-transparent">
            <AICore mode="hero" size={340} />
          </div>
        </div>
      </section>

      {/* Compatibility Badge Strip */}
      <section className="px-6 py-6 border-y border-surface-border bg-surface-subtle/40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-text-muted">
          <span className="text-brand-orange font-bold uppercase tracking-wider text-[11px]">Interoperable With</span>
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-orange" /> CSV & TSV
          </span>
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-orange" /> Microsoft Excel (XLSX, XLS)
          </span>
          <span className="flex items-center gap-2">
            <Database className="w-4 h-4 text-brand-orange" /> Apache Parquet Columnar
          </span>
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-orange" /> Google Gemini GenAI
          </span>
          <span className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-orange" /> AES-128 Key Vault
          </span>
        </div>
      </section>

      {/* Feature Cards Grid (Row of 5 Capabilities) */}
      <section className="px-6 py-16 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">Enterprise Capabilities</span>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-text-main mt-1">
            Engineered for Grounded Business Decisions
          </h2>
          <p className="text-xs text-text-muted mt-2">
            From raw spreadsheet ingestion to microeconomic scenario simulations and executive PDF export.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch">
          {featureCards.map((feat, fIdx) => {
            const Icon = feat.icon;
            return (
              <GlassCard
                key={feat.id}
                slide="up"
                tilt
                hoverGlow
                stagger={((fIdx % 5) + 1) as any}
                className="p-5 flex flex-col justify-between space-y-3 cursor-pointer group hover:border-brand-orange/60 card-3d h-full min-h-[180px]"
                hoverLift
                onClick={() => navigate(feat.link)}
              >
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center text-brand-orange group-hover:bg-brand-orange group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-text-main">{feat.title}</h3>
                  <p className="text-[11px] text-text-muted leading-relaxed">{feat.desc}</p>
                </div>
                <div className="pt-2 text-xs font-semibold text-brand-orange flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Explore</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* "How It Works" 3 Steps Section */}
      <section className="px-6 py-16 max-w-7xl mx-auto w-full border-t border-surface-border">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">Architecture in Action</span>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-text-main mt-1">
            How BizLens Works
          </h2>
          <p className="text-xs text-text-muted mt-2">
            Strict separation between deterministic calculations and generative narrative explanations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, idx) => (
            <GlassCard
              key={s.num}
              slide="up"
              stagger={((idx + 1) as any)}
              tilt
              hoverGlow
              hoverLift
              className="p-6 space-y-3 card-3d"
            >
              <div className="text-3xl font-display font-black text-brand-orange/40">{s.num}</div>
              <h3 className="text-base font-bold text-text-main">{s.title}</h3>
              <p className="text-xs text-text-muted leading-relaxed">{s.desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="px-6 py-12 max-w-7xl mx-auto w-full">
        <GlassCard variant="showcase" tilt hoverGlow className="p-8 sm:p-12 text-center space-y-6 flex flex-col items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">
            Zero Guesswork. 100% Deterministic.
          </span>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-text-main max-w-xl">
            Start transforming enterprise spreadsheets into certified business intelligence.
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button variant="primary" size="lg" onClick={() => navigate("/signup")}>
              Get Started with Demo Data
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate("/product")}>
              Read Architectural Blueprint
            </Button>
          </div>
        </GlassCard>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border px-6 py-8 text-xs text-text-muted max-w-7xl mx-auto w-full space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brand-orange text-white flex items-center justify-center">
              <Eye className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-text-main text-sm">BizLens</span>
            <span>— Quantum Horizon Enterprise Ecosystem</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/product" className="hover:text-text-main">Product</Link>
            <Link to="/how-it-works" className="hover:text-text-main">How It Works</Link>
            <Link to="/demo" className="hover:text-text-main">Live Demo</Link>
            <Link to="/login" className="hover:text-text-main">Sign In</Link>
          </div>
        </div>
        <div className="text-center sm:text-left text-[11px] text-text-muted border-t border-surface-border pt-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>&copy; {new Date().getFullYear()} BizLens. Powered by DuckDB Columnar Engine & Google Gemini API.</span>
          <span>RULES.md Certified: Zero Hallucinated Numbers</span>
        </div>
      </footer>
    </div>
  );
};
