import React, { useState } from "react";
import { useThemeStore } from "@/hooks/useTheme";
import { themeTokens, brandTokens, statusTokens } from "@/design/tokens";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowBorder } from "@/components/ui/GlowBorder";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FactBadge } from "@/components/ui/FactBadge";
import { KpiCard } from "@/components/ui/KpiCard";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { BrandLoader, SkeletonLoader } from "@/components/ui/Loaders";
import { EmptyState, ErrorState, PartialDataState } from "@/components/ui/States";
import { ChartFrame } from "@/components/ui/ChartFrame";
import { DataTable } from "@/components/ui/DataTable";
import { AICore } from "@/components/visuals/AICore";
import { HelixScene } from "@/components/visuals/HelixScene";
import { CrystalScene } from "@/components/visuals/CrystalScene";
import { WorldGlowMap } from "@/components/visuals/WorldGlowMap";
import { IsoCubeMap } from "@/components/visuals/IsoCubeMap";
import { ScenarioFlow } from "@/components/visuals/ScenarioFlow";
import { PulseLine } from "@/components/visuals/PulseLine";
import { EvidenceDrawer } from "@/components/ui/EvidenceDrawer";

export const StyleGuidePage: React.FC = () => {
  const { theme, activeTheme } = useThemeStore();
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  return (
    <div className="min-h-screen p-6 lg:p-12 max-w-7xl mx-auto space-y-12">
      {/* Header & Theme Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">
            Design System Verification
          </span>
          <h1 className="text-3xl font-display font-bold text-text-main mt-1">
            BizLens Quantum Horizon Style Guide
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Active Theme: <strong className="text-brand-orange capitalize">{theme}</strong> (Rendering as: <span className="capitalize">{activeTheme}</span>)
          </p>
        </div>

        <ThemeSwitcher showPreviewCards={false} />
      </div>

      {/* 1. Theme Palette & Contrast Matrix */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-text-main">1. Theme Token Palette & WCAG AA Verification</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl border border-surface-border bg-brand-orange text-white">
            <span className="text-xs font-bold">Brand Orange</span>
            <div className="text-xs font-mono mt-1">#FF7A1A</div>
          </div>
          <div className="p-4 rounded-xl border border-surface-border bg-brand-amber text-black">
            <span className="text-xs font-bold">Amber Highlight</span>
            <div className="text-xs font-mono mt-1">#FFB347</div>
          </div>
          <div className="p-4 rounded-xl border border-surface-border bg-brand-deepOrange text-white">
            <span className="text-xs font-bold">Deep Orange Text</span>
            <div className="text-xs font-mono mt-1">#C2410C (AA Light)</div>
          </div>
          <div className="p-4 rounded-xl border border-surface-border bg-surface-card text-text-main">
            <span className="text-xs font-bold">Surface Card</span>
            <div className="text-xs font-mono mt-1">Glass Token</div>
          </div>
          <div className="p-4 rounded-xl border border-surface-border bg-surface-base text-text-main">
            <span className="text-xs font-bold">Surface Base</span>
            <div className="text-xs font-mono mt-1">Canvas Token</div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Theme Switcher with Mini Previews */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-text-main">2. Multi-Theme Previews (Dark, Light, Hybrid, System)</h2>
        <ThemeSwitcher showPreviewCards={true} />
      </section>

      {/* 3. Button Component & States */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-text-main">3. Button Variants & Click Microinteractions</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary">Primary Action</Button>
          <Button variant="secondary">Secondary Action</Button>
          <Button variant="ghost">Ghost Action</Button>
          <Button variant="danger">Destructive Action</Button>
          <Button variant="primary" loading>Loading State</Button>
          <Button variant="primary" disabled>Disabled State</Button>
        </div>
      </section>

      {/* 4. Badges (Status & Fact Output Tags) */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-text-main">4. Status Badges & AI Fact Tag Badges</h2>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status="positive" label="+14.2% Growth" />
          <StatusBadge status="warning" label="High Volatility" />
          <StatusBadge status="critical" label="Margin Dropped" />
          <StatusBadge status="neutral" label="Baseline Normal" />
          <FactBadge kind="fact" />
          <FactBadge kind="interpretation" />
          <FactBadge kind="recommendation" />
        </div>
      </section>

      {/* 5. KPI Cards (Count-Up, Tabular Numerals, States) */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-text-main">5. KPI Cards with Tabular Numerals & States</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            metricId="revenue"
            label="Total Revenue"
            value="₹1.24 Cr"
            deltaText="+12.4% MoM"
            status="positive"
            onClick={() => setEvidenceOpen(true)}
          />
          <KpiCard
            metricId="orders"
            label="Total Orders"
            value="18,420"
            deltaText="-2.1% MoM"
            status="warning"
            onClick={() => setEvidenceOpen(true)}
          />
          <KpiCard
            metricId="profit"
            label="Total Profit"
            loading={true}
          />
          <KpiCard
            metricId="margin"
            label="Profit Margin %"
            unavailable={{ missingRole: "cost" }}
          />
        </div>
      </section>

      {/* 6. Panel Visuals: AI Core, Helix, Crystal, Map, IsoCube, Pulse */}
      <section className="space-y-6">
        <h2 className="text-lg font-bold text-text-main">6. Quantum Horizon Visual Motifs (Panels 1, 2, 3, 5, 7, 9)</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel 2 AI Core */}
          <GlassCard variant="showcase" className="p-6 flex flex-col items-center justify-center">
            <span className="text-xs font-bold uppercase text-brand-orange mb-2">Panel 2: Intelligence Core</span>
            <AICore mode="welcome" size={260} />
          </GlassCard>

          {/* Panel 9 Configuration Crystal */}
          <GlassCard variant="showcase" className="p-6 flex flex-col items-center justify-center">
            <span className="text-xs font-bold uppercase text-brand-orange mb-2">Panel 9: Configuration Crystal</span>
            <CrystalScene initial="P" completionPct={85} size={240} />
          </GlassCard>
        </div>

        {/* Panel 5 Decision Helix */}
        <HelixScene onSelectFinding={() => setEvidenceOpen(true)} />

        {/* Panel 1 World Glow Map */}
        <WorldGlowMap onDrillDown={() => setEvidenceOpen(true)} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Panel 3 IsoCubeMap */}
          <IsoCubeMap />
          {/* Panel 3 ScenarioFlow */}
          <ScenarioFlow />
          {/* Panel 7 PulseLine */}
          <PulseLine />
        </div>
      </section>

      {/* 7. Loaders and Empty States */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-text-main">7. Loaders, Empty & Error States</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="p-6 flex items-center justify-center">
            <BrandLoader size="md" label="Analyzing Dataset..." />
          </GlassCard>
          <EmptyState
            title="No Datasets Uploaded"
            description="Upload your sales CSV or load sample data to explore."
            actionLabel="Load Sample Data"
          />
          <ErrorState
            title="Engine Calculation Timeout"
            message="The calculation exceeded the 30-second budget."
            onRetry={() => alert("Retrying...")}
          />
        </div>
      </section>

      {/* Evidence Drawer Overlay */}
      <EvidenceDrawer
        isOpen={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
        resultId="res_demo_42"
        metricLabel="Total Revenue"
        formula="SUM(price * quantity * (1 - discount))"
      />
    </div>
  );
};
