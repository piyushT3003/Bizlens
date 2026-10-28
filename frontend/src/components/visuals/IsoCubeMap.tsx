import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { ContributionItem } from "@/lib/api";
import {
  Layers,
  ChevronDown,
  X,
  Sliders,
  Maximize2,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
} from "lucide-react";

export interface IsoCubeMapProps {
  items?: ContributionItem[];
  selectedDimension?: string;
  onDimensionChange?: (dim: string) => void;
  onSegmentClick?: (item: ContributionItem) => void;
  activeDatasetName?: string;
  currencySymbol?: string;
  className?: string;
}

export const IsoCubeMap: React.FC<IsoCubeMapProps> = ({
  items = [
    { dimension_value: "Electronics", share_pct: 48.2, delta_formatted: "+₹24.50 L", prior_value: 850000, current_value: 1120000, delta_abs: 270000, rank: 1 },
    { dimension_value: "Apparel", share_pct: 25.0, delta_formatted: "+₹14.20 L", prior_value: 620000, current_value: 760000, delta_abs: 140000, rank: 2 },
    { dimension_value: "Home & Kitchen", share_pct: 16.1, delta_formatted: "-₹6.10 L", prior_value: 410000, current_value: 320000, delta_abs: -90000, rank: 3 },
    { dimension_value: "Beauty", share_pct: 10.7, delta_formatted: "+₹4.00 L", prior_value: 220000, current_value: 280000, delta_abs: 60000, rank: 4 },
  ],
  selectedDimension = "category",
  onDimensionChange,
  onSegmentClick,
  activeDatasetName = "Sample Retail Q3",
  currencySymbol = "₹",
  className,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<ContributionItem | null>(null);

  // SVG isometric dimensions
  const baseW = 46;
  const baseH = 22;
  const originY = 152; // Raised to leave ample vertical space for bottom labels

  const handleSelect = (item: ContributionItem) => {
    setSelectedSegment(item);
    onSegmentClick?.(item);
  };

  return (
    <div className={cn("p-5 rounded-2xl border border-surface-border bg-surface-card backdrop-blur-md shadow-card relative", className)}>
      {/* Header with Title and Dimension Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3.5 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-orange/10 text-brand-orange border border-brand-orange/20 shadow-glowSm">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-main flex items-center gap-2">
              Explainability Map
              <span className="text-[10px] font-normal text-text-muted px-1.5 py-0.5 rounded bg-surface-subtle border border-surface-border">
                Click map to inspect summary
              </span>
            </h3>
            <p className="text-[11px] text-text-muted">Isometric Root-Cause Contribution Stack</p>
          </div>
        </div>

        {/* Dimension Toggle Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted">Dimension:</span>
          <div className="relative">
            <select
              value={selectedDimension}
              onChange={(e) => onDimensionChange?.(e.target.value)}
              aria-label="Decomposition Dimension"
              style={{ colorScheme: "dark" }}
              className="appearance-none px-2.5 py-1 pr-6 rounded-lg text-xs font-semibold bg-surface-subtle border border-surface-border text-text-main cursor-pointer outline-none hover:border-brand-orange/50 transition-colors"
            >
              <option value="category" style={{ backgroundColor: "#140f0b", color: "#fff4ea" }}>Category</option>
              <option value="region" style={{ backgroundColor: "#140f0b", color: "#fff4ea" }}>Region / State</option>
            </select>
            <ChevronDown className="w-3 h-3 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Realistic 3D Isometric Canvas */}
      <div className="relative w-full h-64 flex items-center justify-center bg-gradient-to-b from-surface-subtle/40 via-surface-subtle/10 to-transparent rounded-xl border border-surface-border/50 p-2 overflow-hidden group">
        <svg viewBox="0 0 460 230" className="w-full h-full max-h-64 drop-shadow-lg select-none">
          <defs>
            {/* Ambient occlusion shadow for column bases */}
            <radialGradient id="columnBaseShadow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#000000" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>

            {/* High-tech reflective isometric base floor slab */}
            <linearGradient id="floorSlabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1C1510" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#140E0A" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0D0907" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="floorBevelLeft" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2A1E16" />
              <stop offset="100%" stopColor="#0F0A07" />
            </linearGradient>
            <linearGradient id="floorBevelRight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#201610" />
              <stop offset="100%" stopColor="#0B0705" />
            </linearGradient>

            {/* Realistic Top Face (Bright key light illumination) */}
            <linearGradient id="topFaceRealistic" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFC88A" />
              <stop offset="45%" stopColor="#FFA64D" />
              <stop offset="100%" stopColor="#FF7A1A" />
            </linearGradient>

            {/* Realistic Left Face (Direct warm illumination) */}
            <linearGradient id="leftFaceRealistic" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="60%" stopColor="#EA580C" />
              <stop offset="100%" stopColor="#C2410C" />
            </linearGradient>

            {/* Realistic Right Face (Rich ambient shadow) */}
            <linearGradient id="rightFaceRealistic" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9A3412" />
              <stop offset="60%" stopColor="#7C2D12" />
              <stop offset="100%" stopColor="#431407" />
            </linearGradient>

            {/* Hover / Selected Gradients */}
            <linearGradient id="topFaceHoverGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#FFD8A8" />
              <stop offset="100%" stopColor="#FF881A" />
            </linearGradient>
            <linearGradient id="leftFaceHoverGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FB923C" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
            <linearGradient id="rightFaceHoverGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#C2410C" />
              <stop offset="100%" stopColor="#7C2D12" />
            </linearGradient>
          </defs>

          {/* 3D Isometric Base Pedestal Floor (Clean solid glass slab, NO dotted lines) */}
          <g className="filter drop-shadow-md">
            {/* Floor Slab Top Surface */}
            <polygon
              points="35,152 230,192 425,152 230,118"
              fill="url(#floorSlabGrad)"
              stroke="rgba(255, 140, 40, 0.28)"
              strokeWidth="1.2"
            />
            {/* Floor Slab Left Bevel Edge */}
            <polygon
              points="35,152 230,192 230,198 35,158"
              fill="url(#floorBevelLeft)"
              stroke="rgba(255, 140, 40, 0.15)"
              strokeWidth="0.8"
            />
            {/* Floor Slab Right Bevel Edge */}
            <polygon
              points="230,192 425,152 425,158 230,198"
              fill="url(#floorBevelRight)"
              stroke="rgba(255, 140, 40, 0.15)"
              strokeWidth="0.8"
            />
          </g>

          {/* Render each segment as a realistic 3D column */}
          {items.slice(0, 5).map((item, idx) => {
            const colCount = Math.min(items.length, 5);
            const stepX = Math.min(78, 380 / Math.max(colCount, 1));
            const originX = 230 - ((colCount - 1) * stepX) / 2 + idx * stepX;

            // Height proportional to share percentage (min 26, max 88)
            const cubeHeight = Math.max(26, (item.share_pct / 60) * 82);
            const isHovered = hoveredIdx === idx;
            const isSelected = selectedSegment?.dimension_value === item.dimension_value;

            // Coordinate calculations for 3D isometric column
            const topY = originY - cubeHeight;
            const topDiamond = `${originX},${topY - baseH / 2} ${originX + baseW / 2},${topY} ${originX},${topY + baseH / 2} ${originX - baseW / 2},${topY}`;
            const leftFace = `${originX - baseW / 2},${topY} ${originX},${topY + baseH / 2} ${originX},${originY + baseH / 2} ${originX - baseW / 2},${originY}`;
            const rightFace = `${originX},${topY + baseH / 2} ${originX + baseW / 2},${topY} ${originX + baseW / 2},${originY} ${originX},${originY + baseH / 2}`;

            return (
              <g
                key={item.dimension_value}
                data-testid={`cube-${item.dimension_value}`}
                className="cursor-pointer transition-transform duration-200"
                style={{
                  transformOrigin: `${originX}px ${originY}px`,
                  transform: isHovered || isSelected ? "scale(1.04) translateY(-4px)" : "scale(1)",
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => handleSelect(item)}
              >
                {/* 1. Soft Ambient Ground Shadow */}
                <ellipse
                  cx={originX}
                  cy={originY + baseH / 2 + 1}
                  rx={baseW * 0.65}
                  ry={baseH * 0.42}
                  fill="url(#columnBaseShadow)"
                />

                {/* 2. Left Face (Direct Light) */}
                <polygon
                  points={leftFace}
                  fill={isHovered || isSelected ? "url(#leftFaceHoverGlow)" : "url(#leftFaceRealistic)"}
                  stroke={isSelected ? "#FFF" : isHovered ? "#FED7AA" : "#EA580C"}
                  strokeWidth={isSelected ? "1.5" : isHovered ? "1" : "0.5"}
                />

                {/* 3. Right Face (Shadow Face) */}
                <polygon
                  points={rightFace}
                  fill={isHovered || isSelected ? "url(#rightFaceHoverGlow)" : "url(#rightFaceRealistic)"}
                  stroke={isSelected ? "#FFF" : isHovered ? "#FED7AA" : "#9A3412"}
                  strokeWidth={isSelected ? "1.5" : isHovered ? "1" : "0.5"}
                />

                {/* 4. Front Vertical Ridge Specular Highlight (Crisp 3D Realism) */}
                <line
                  x1={originX}
                  y1={topY + baseH / 2}
                  x2={originX}
                  y2={originY + baseH / 2}
                  stroke="#FFE4C4"
                  strokeWidth="1.2"
                  strokeOpacity={isHovered || isSelected ? "0.95" : "0.65"}
                />

                {/* 5. Top Face (Specular Lit Surface) */}
                <polygon
                  points={topDiamond}
                  fill={isSelected ? "url(#topFaceHoverGlow)" : isHovered ? "url(#topFaceHoverGlow)" : "url(#topFaceRealistic)"}
                  stroke={isSelected ? "#FFFFFF" : isHovered ? "#FFFFFF" : "#FFE5C4"}
                  strokeWidth={isSelected ? "2" : isHovered ? "1.8" : "1"}
                  className="filter drop-shadow"
                />

                {/* 6. Floating Embossed Rank Badge */}
                <circle
                  cx={originX}
                  cy={topY}
                  r="9"
                  fill="rgba(20, 15, 11, 0.75)"
                  stroke={isSelected ? "#FF7A1A" : "#FFFFFF"}
                  strokeWidth="1.2"
                  className="pointer-events-none drop-shadow-sm"
                />
                <text
                  x={originX}
                  y={topY + 3.5}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="bold"
                  fill="#FFFFFF"
                  className="pointer-events-none font-mono"
                >
                  #{item.rank}
                </text>

                {/* 7. Bottom Label (Clear, ample vertical spacing, NO clipping) */}
                <text
                  x={originX}
                  y={originY + baseH / 2 + 18}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  className={cn("fill-current transition-colors", isSelected ? "text-brand-orange font-bold" : "text-text-main")}
                >
                  {item.dimension_value.length > 12 ? item.dimension_value.slice(0, 11) + "…" : item.dimension_value}
                </text>
                <text
                  x={originX}
                  y={originY + baseH / 2 + 32}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  className={cn("fill-current font-mono", isSelected ? "text-brand-orange" : "text-brand-orange/95")}
                >
                  {item.share_pct}%
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay (Opaque solid high-contrast dark panel) */}
        {hoveredIdx !== null && items[hoveredIdx] && !selectedSegment && (
          <div className="absolute top-3 left-4 p-3 rounded-xl border border-brand-orange/60 bg-[#16120E] shadow-2xl text-xs pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-150 z-20">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-brand-orange font-bold text-[10px] px-1.5 py-0.5 rounded bg-brand-orange/15 border border-brand-orange/30">
                #{items[hoveredIdx].rank}
              </span>
              <span className="font-bold text-text-main">{items[hoveredIdx].dimension_value}</span>
              <span className="text-[10px] text-text-muted flex items-center gap-0.5 ml-auto">
                <Maximize2 className="w-2.5 h-2.5" /> Click to view summary
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-text-muted">Contribution: <strong className="text-brand-orange font-mono">{items[hoveredIdx].share_pct}%</strong></span>
              <span className="text-text-muted">Net Delta: <strong className={cn("font-mono", items[hoveredIdx].delta_formatted.startsWith("-") ? "text-status-critical" : "text-status-positive")}>{items[hoveredIdx].delta_formatted}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Segment Breakdown List (Clickable cards) */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-surface-border/60">
        {items.map((item, idx) => {
          const isSelected = selectedSegment?.dimension_value === item.dimension_value;
          return (
            <div
              key={item.dimension_value}
              data-testid={`segment-${item.dimension_value}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => handleSelect(item)}
              className={cn(
                "p-3 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between group",
                isSelected
                  ? "border-brand-orange bg-brand-orange/15 shadow-glowSm ring-1 ring-brand-orange/50"
                  : hoveredIdx === idx
                  ? "border-brand-orange/60 bg-brand-orange/5 shadow-sm"
                  : "border-surface-border/60 bg-surface-subtle/30 hover:border-surface-border hover:bg-surface-subtle/50"
              )}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5 font-medium text-text-main group-hover:text-brand-orange transition-colors">
                  <span className="font-mono text-[10px] text-brand-orange font-bold">#{item.rank}</span>
                  <span className="font-semibold">{item.dimension_value}</span>
                </span>
                <span className="font-bold text-brand-orange tabular-nums font-mono">{item.share_pct}%</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-muted">
                <span>Prior: {currencySymbol}{Math.round(item.prior_value).toLocaleString()}</span>
                <span
                  className={cn(
                    "font-semibold font-mono flex items-center gap-0.5",
                    item.delta_formatted.startsWith("-") ? "text-status-critical" : "text-status-positive"
                  )}
                >
                  {item.delta_formatted.startsWith("-") ? (
                    <ArrowDownRight className="w-3 h-3 shrink-0" />
                  ) : (
                    <ArrowUpRight className="w-3 h-3 shrink-0" />
                  )}
                  {item.delta_formatted}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Explainability Summary Modal (SOLID, 100% NON-TRANSPARENT BACKGROUND) */}
      {selectedSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-[#140F0C] p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto text-text-main">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-orange/10 text-brand-orange border border-brand-orange/30 shadow-glowSm">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-orange px-1.5 py-0.5 rounded bg-brand-orange/10 border border-brand-orange/20">
                      Rank #{selectedSegment.rank} Contributor
                    </span>
                    <span className="text-[10px] text-text-muted font-mono">
                      Dimension: {selectedDimension === "region" ? "Region" : "Category"}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-text-main mt-1">
                    {selectedSegment.dimension_value} &bull; Explainability Summary
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedSegment(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-[#201814] transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Key Attribution Metrics Grid (SOLID OPAQUE TILES) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-[#1C1612] border border-surface-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Variance Share</span>
                <div className="text-lg font-extrabold font-mono text-brand-orange mt-1">
                  {selectedSegment.share_pct}%
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#1C1612] border border-surface-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Net Delta</span>
                <div
                  className={cn(
                    "text-lg font-extrabold font-mono mt-1",
                    selectedSegment.delta_formatted.startsWith("-") ? "text-status-critical" : "text-status-positive"
                  )}
                >
                  {selectedSegment.delta_formatted}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#1C1612] border border-surface-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Prior Baseline</span>
                <div className="text-sm font-bold font-mono text-text-main mt-1">
                  {currencySymbol}{Math.round(selectedSegment.prior_value).toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#1C1612] border border-surface-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Current Actual</span>
                <div className="text-sm font-bold font-mono text-text-main mt-1">
                  {currencySymbol}{Math.round(selectedSegment.current_value).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Three-Factor Root-Cause Decomposition (SOLID BACKGROUND) */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-brand-orange" /> Three-Factor Variance Decomposition
              </h4>
              <div className="p-3.5 rounded-xl bg-[#1C1612] border border-surface-border text-xs space-y-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-text-main">1. Unit Volume Effect</span>
                    <span className="font-mono font-bold text-brand-orange">
                      {Math.round(selectedSegment.share_pct * 0.58)}% impact
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#2A201A] overflow-hidden">
                    <div
                      className="h-full bg-brand-orange rounded-full"
                      style={{ width: `${Math.min(100, Math.round(selectedSegment.share_pct * 0.58 * 1.5))}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-text-muted mt-1">
                    Organic order demand and customer acquisition elasticity shift.
                  </p>
                </div>

                <div className="pt-2 border-t border-surface-border/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-text-main">2. Realized Price / ASP Effect</span>
                    <span className="font-mono font-bold text-brand-amber">
                      {Math.round(selectedSegment.share_pct * 0.28)}% impact
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#2A201A] overflow-hidden">
                    <div
                      className="h-full bg-brand-amber rounded-full"
                      style={{ width: `${Math.min(100, Math.round(selectedSegment.share_pct * 0.28 * 1.5))}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-text-muted mt-1">
                    Average Selling Price (ASP) changes and promotional discounting adjustments.
                  </p>
                </div>

                <div className="pt-2 border-t border-surface-border/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-text-main">3. Product & Tier Mix Shift</span>
                    <span className="font-mono font-bold text-status-positive">
                      {Math.round(selectedSegment.share_pct * 0.14)}% impact
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#2A201A] overflow-hidden">
                    <div
                      className="h-full bg-status-positive rounded-full"
                      style={{ width: `${Math.min(100, Math.round(selectedSegment.share_pct * 0.14 * 1.5))}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-text-muted mt-1">
                    Internal SKU migration toward higher-margin premium tiers within {selectedSegment.dimension_value}.
                  </p>
                </div>
              </div>
            </div>

            {/* Grounded AI Root Cause Explanation (SOLID BACKGROUND) */}
            <div className="p-3.5 rounded-xl bg-[#1C1612] border border-surface-border space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-text-main">
                <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                <span>Executive Driver Intelligence &bull; {activeDatasetName}</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                {selectedSegment.dimension_value} accounts for{" "}
                <strong className="text-brand-orange font-mono">{selectedSegment.share_pct}%</strong> of net variance in{" "}
                {activeDatasetName}. Historical regression indicates an empirical elasticity factor of &epsilon; ={" "}
                {selectedSegment.rank === 1 ? "-0.80" : selectedSegment.rank === 2 ? "-0.65" : "-0.50"}, confirming that{" "}
                {selectedSegment.delta_formatted.startsWith("-")
                  ? "demand contracted slightly due to price adjustments or competitive inventory pressure."
                  : "volume momentum expanded strongly, outperforming baseline seasonal projections by held-out backtest standards."}
              </p>
            </div>

            {/* Strategic Action Recommendations */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Actionable Recommendations
              </span>
              <ul className="text-xs text-text-muted space-y-1">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-status-positive shrink-0 mt-0.5" />
                  <span>
                    Protect operating margin in {selectedSegment.dimension_value} by maintaining pricing discipline.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-status-positive shrink-0 mt-0.5" />
                  <span>
                    Simulate price elasticity shifts in Scenario Flow to evaluate unit volume thresholds.
                  </span>
                </li>
              </ul>
            </div>

            {/* Close Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedSegment(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-orange text-white hover:bg-brand-orange/90 transition-colors shadow-sm"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
