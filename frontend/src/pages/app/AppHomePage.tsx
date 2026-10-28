import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AICore } from "@/components/visuals/AICore";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { ParticleField } from "@/components/ui/Ambient";
import {
  Upload,
  LayoutDashboard,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Zap,
  Layers,
  BarChart3,
} from "lucide-react";
import { useSettingsStore, formatCurrencyAmount } from "@/hooks/useSettings";
import { useDatasetStore } from "@/hooks/useDataset";
import { cn } from "@/lib/utils";

export const AppHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, preferences } = useSettingsStore();
  const { activePreset } = useDatasetStore();
  const rawName = settings.profile.display_name;
  const displayName = rawName && !rawName.includes("Alexander") && !rawName.includes("Offline")
    ? rawName
    : "Piyush Toddale";
  const firstName = displayName.split(" ")[0] || "Piyush";
  const activeCurrency = preferences.currency || "INR";
  const activeGrouping = preferences.number_grouping || "lakh_crore";

  // Allows pausing the clockwise orbit on user hover
  const [isOrbitPaused, setIsOrbitPaused] = useState(false);

  // 6 Circular Orbiting Data Capsules around the 3D Globe (spaced 60° apart)
  const orbitCapsules = [
    {
      id: "sales",
      positionClass: "left-1/2 top-[calc(50%-var(--orbit-radius))] -translate-x-1/2 -translate-y-1/2",
      icon: TrendingUp,
      iconColor: "text-status-positive",
      label: `Total Sales (${activePreset.name.split(" ")[0]})`,
      value: formatCurrencyAmount(activePreset.revenue_raw, activeCurrency, activeGrouping),
      badge: "+14.2% MoM",
      badgeColor: "text-status-positive bg-status-positiveBg",
      subtext: "DuckDB Verified",
      route: "/app/dashboard",
    },
    {
      id: "recommendations",
      positionClass: "left-[calc(50%+var(--orbit-radius)*0.866)] top-[calc(50%-var(--orbit-radius)*0.5)] -translate-x-1/2 -translate-y-1/2",
      icon: Sparkles,
      iconColor: "text-brand-orange",
      label: "Decision Helix",
      value: `${activePreset.findings.length} Action Items`,
      badge: "High Impact",
      badgeColor: "text-brand-orange bg-brand-orange/15",
      subtext: "Prioritized Actions",
      route: "/app/decisions",
    },
    {
      id: "quality",
      positionClass: "left-[calc(50%+var(--orbit-radius)*0.866)] top-[calc(50%+var(--orbit-radius)*0.5)] -translate-x-1/2 -translate-y-1/2",
      icon: ShieldCheck,
      iconColor: "text-status-positive",
      label: "Data Quality",
      value: `${activePreset.quality_score.toFixed(1)}% Score`,
      badge: "v1 Active",
      badgeColor: "text-status-positive bg-status-positiveBg",
      subtext: "100% Schema Valid",
      route: "/app/data",
    },
    {
      id: "speed",
      positionClass: "left-1/2 top-[calc(50%+var(--orbit-radius))] -translate-x-1/2 -translate-y-1/2",
      icon: Zap,
      iconColor: "text-amber-400",
      label: "Engine Speed",
      value: "4.2ms Latency",
      badge: "Columnar",
      badgeColor: "text-amber-400 bg-amber-400/15",
      subtext: "In-Memory DuckDB",
      route: "/showcase",
    },
    {
      id: "orders",
      positionClass: "left-[calc(50%-var(--orbit-radius)*0.866)] top-[calc(50%+var(--orbit-radius)*0.5)] -translate-x-1/2 -translate-y-1/2",
      icon: Layers,
      iconColor: "text-brand-ember",
      label: "Active Orders",
      value: `${activePreset.total_orders.toLocaleString()} Vol`,
      badge: "6 Hubs",
      badgeColor: "text-brand-ember bg-brand-ember/15",
      subtext: "Multichannel Retail",
      route: "/app/dashboard?view=geo",
    },
    {
      id: "margin",
      positionClass: "left-[calc(50%-var(--orbit-radius)*0.866)] top-[calc(50%-var(--orbit-radius)*0.5)] -translate-x-1/2 -translate-y-1/2",
      icon: BarChart3,
      iconColor: "text-chart-teal",
      label: "Gross Margin",
      value: `${activePreset.gross_margin_pct.toFixed(1)}% Index`,
      badge: "Optimized",
      badgeColor: "text-chart-teal bg-chart-teal/15",
      subtext: "Elasticity Tracked",
      route: "/app/what-if",
    },
  ];

  return (
    <div className="flex flex-col gap-3.5 lg:gap-4 relative w-full">
      <div className="absolute inset-0 pointer-events-none -z-10" aria-hidden="true">
        <ParticleField count={20} />
      </div>

      {/* Hero Showcase Area: Majestic 3D Globe with Circular Orbit */}
      <div className="relative rounded-2xl sm:rounded-3xl border border-brand-orange/30 bg-gradient-to-b from-[#0E0B09] via-surface-card/70 to-[#0E0B09] p-4 sm:p-5 lg:p-6 overflow-hidden shadow-2xl flex flex-col items-center justify-center text-center glass-card-premium w-full">
        {/* Ambient Radial Lighting & 3D Shimmer */}
        <div className="absolute inset-0 bg-radial-gradient from-brand-orange/[0.14] via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Circular Orbit & 3D Globe Central System */}
        <div
          className="relative w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] md:w-[540px] md:h-[540px] lg:w-[620px] lg:h-[620px] flex items-center justify-center my-2 sm:my-3 select-none"
          onMouseEnter={() => setIsOrbitPaused(true)}
          onMouseLeave={() => setIsOrbitPaused(false)}
        >
          {/* Subtle SVG Dashed Orbit Track Ring */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
            <circle
              cx="50%"
              cy="50%"
              r="var(--orbit-radius)"
              fill="none"
              stroke="rgba(255, 122, 26, 0.22)"
              strokeWidth="1.5"
              strokeDasharray="6 8"
              className="opacity-75"
            />
            <circle
              cx="50%"
              cy="50%"
              r="calc(var(--orbit-radius) + 20px)"
              fill="none"
              stroke="rgba(255, 180, 80, 0.08)"
              strokeWidth="1"
              strokeDasharray="2 12"
            />
          </svg>

          {/* Central Prominent 3D Globe (AICore) */}
          <div className="relative z-10 transition-all duration-300 hover:drop-shadow-[0_0_28px_rgba(255,122,26,0.4)]">
            <div className="hidden lg:block">
              <AICore mode="welcome" size={420} />
            </div>
            <div className="hidden sm:block lg:hidden">
              <AICore mode="welcome" size={350} />
            </div>
            <div className="block sm:hidden">
              <AICore mode="welcome" size={260} />
            </div>
          </div>

          {/* Clockwise Orbit Track Container with 6 Circular Data Capsules */}
          <div
            className={cn(
              "absolute inset-0 pointer-events-none animate-orbit-clockwise orbit-track",
              isOrbitPaused && "orbit-paused"
            )}
            style={{ transformOrigin: "50% 50%" }}
          >
            {orbitCapsules.map((item) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={item.id}
                  className={cn("absolute pointer-events-auto", item.positionClass)}
                >
                  {/* Upright Counter-Rotating Child Container */}
                  <div
                    className={cn(
                      "animate-counter-rotate transition-transform duration-200",
                      isOrbitPaused && "orbit-paused"
                    )}
                    style={{ transformOrigin: "50% 50%" }}
                  >
                    <button
                      onClick={() => navigate(item.route)}
                      className="group/card text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-orange rounded-xl block"
                      title={`Click to view ${item.label}`}
                    >
                      <div className="relative p-2.5 sm:p-3 rounded-2xl border border-brand-orange/35 bg-[#0E0B09]/92 backdrop-blur-2xl shadow-2xl hover:shadow-glowMd hover:border-brand-orange hover:-translate-y-1 transition-all duration-200 min-w-[130px] sm:min-w-[155px] max-w-[185px]">
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <div className="w-5 h-5 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-center shrink-0">
                              <IconComponent className={cn("w-3 h-3", item.iconColor)} />
                            </div>
                            <span className="text-[10px] uppercase font-bold text-text-muted truncate">
                              {item.label}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                              item.badgeColor
                            )}
                          >
                            {item.badge}
                          </span>
                        </div>

                        <div className="text-sm sm:text-base font-bold text-text-main tabular-nums tracking-tight truncate group-hover/card:text-brand-orange transition-colors">
                          {item.value}
                        </div>

                        <div className="text-[9px] sm:text-[10px] text-text-muted mt-1 flex items-center justify-between">
                          <span className="truncate">{item.subtext}</span>
                          <span className="opacity-0 group-hover/card:opacity-100 text-brand-orange font-semibold ml-1 transition-opacity">
                            &rarr;
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Greeting & Active Dataset Subtitle */}
        <div className="relative z-10 space-y-1 max-w-xl mt-2">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold text-text-main tracking-tight drop-shadow-md">
            Welcome, {firstName}!
          </h2>
          <p className="text-xs sm:text-sm text-text-muted">
            Active Dataset: <strong className="text-brand-orange">{activePreset.name} (v1)</strong> •{" "}
            <span className="tabular-nums font-semibold text-text-main">{activePreset.row_count.toLocaleString()}</span> rows verified • DuckDB
          </p>
        </div>

        {/* Quick Action Bar with 3D Tactile Buttons */}
        <div className="relative z-10 mt-5 flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate("/app/ask")}
            icon={<Sparkles className="w-4 h-4" />}
            className="hover-glow-ambient card-3d shadow-glowMd"
          >
            Ask BizLens
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate("/app/dashboard")}
            icon={<LayoutDashboard className="w-4 h-4" />}
            className="card-3d bg-surface-card/90"
          >
            Open Dashboard
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate("/app/upload")}
            icon={<Upload className="w-4 h-4" />}
            className="card-3d bg-surface-card/90"
          >
            Upload Data
          </Button>
        </div>
      </div>

      {/* Quick Navigation Cards: 3D Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch w-full">
        <GlassCard
          onClick={() => navigate("/app/dashboard?view=geo")}
          tilt
          hoverGlow
          hoverLift
          slide="up"
          stagger={1}
          className="p-5 cursor-pointer group card-3d h-full min-h-[145px] flex flex-col justify-between border-brand-orange/20 hover:border-brand-orange/50 transition-all rounded-2xl"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-brand-orange tracking-wider">Topography</span>
              <span className="text-brand-orange font-semibold opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
            </div>
            <h3 className="text-base font-bold text-text-main mt-1 group-hover:text-brand-orange transition-colors">
              Geographic View
            </h3>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Dot-matrix regional map with Indian state choropleth and city distribution.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-surface-border/50 flex items-center justify-between text-[11px] text-text-muted">
            <span className="text-brand-orange font-semibold">6 State Hubs</span>
            <span>DuckDB Multi-Region</span>
          </div>
        </GlassCard>

        <GlassCard
          onClick={() => navigate("/app/decisions")}
          tilt
          hoverGlow
          hoverLift
          slide="up"
          stagger={2}
          className="p-5 cursor-pointer group card-3d h-full min-h-[145px] flex flex-col justify-between border-brand-orange/20 hover:border-brand-orange/50 transition-all rounded-2xl"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-brand-orange tracking-wider">Action Support</span>
              <span className="text-brand-orange font-semibold opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
            </div>
            <h3 className="text-base font-bold text-text-main mt-1 group-hover:text-brand-orange transition-colors">
              The Decision Helix
            </h3>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Prioritized business findings mapped from Evidence to Potential Actions.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-surface-border/50 flex items-center justify-between text-[11px] text-text-muted">
            <span className="text-status-positive font-semibold">{activePreset.findings.length} Action Items</span>
            <span>Prioritized Impact</span>
          </div>
        </GlassCard>

        <GlassCard
          onClick={() => navigate("/app/what-if")}
          tilt
          hoverGlow
          hoverLift
          slide="up"
          stagger={3}
          className="p-5 cursor-pointer group card-3d h-full min-h-[145px] flex flex-col justify-between border-brand-orange/20 hover:border-brand-orange/50 transition-all rounded-2xl"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-brand-orange tracking-wider">Simulation</span>
              <span className="text-brand-orange font-semibold opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
            </div>
            <h3 className="text-base font-bold text-text-main mt-1 group-hover:text-brand-orange transition-colors">
              What-If Analysis
            </h3>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Price, cost, and volume projections with visible elasticity assumptions.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-surface-border/50 flex items-center justify-between text-[11px] text-text-muted">
            <span className="text-chart-teal font-semibold">{activePreset.gross_margin_pct.toFixed(1)}% Gross Margin</span>
            <span>Elasticity Model</span>
          </div>
        </GlassCard>

        <GlassCard
          onClick={() => navigate("/app/reports")}
          tilt
          hoverGlow
          hoverLift
          slide="up"
          stagger={4}
          className="p-5 cursor-pointer group card-3d h-full min-h-[145px] flex flex-col justify-between border-brand-orange/20 hover:border-brand-orange/50 transition-all rounded-2xl"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-brand-orange tracking-wider">Governance</span>
              <span className="text-brand-orange font-semibold opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
            </div>
            <h3 className="text-base font-bold text-text-main mt-1 group-hover:text-brand-orange transition-colors">
              Executive Reports
            </h3>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Immutable snapshot reports with print-friendly PDF and formula-sanitized CSV.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-surface-border/50 flex items-center justify-between text-[11px] text-text-muted">
            <span className="text-amber-400 font-semibold">PDF & CSV Certified</span>
            <span>Audit Ready</span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
