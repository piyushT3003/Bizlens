import React, { useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Target,
  ArrowRight,
  Check,
  Zap,
} from "lucide-react";

export interface DecisionFinding {
  id: string;
  title: string;
  metric: string;
  priority: "high" | "medium" | "low";
  stage: "finding" | "evidence" | "interpretation" | "action";
  status?: "open" | "applied" | "completed" | "dismissed";
  impactAmount?: number;
  confidenceScore?: number;
  segmentValue?: string | null;
  interpretation?: string;
  potentialAction?: string;
}

export interface HelixSceneProps {
  findings?: DecisionFinding[];
  className?: string;
  showRailCards?: boolean;
  datasetName?: string;
  totalRows?: number;
  qualityScore?: number;
  appliedCount?: number;
  completedCount?: number;
  openCount?: number;
  totalUpsideFormatted?: string;
  totalRiskFormatted?: string;
  onSelectFinding?: (finding: DecisionFinding) => void;
  onInspectEvidence?: (finding: DecisionFinding) => void;
  onApplyFinding?: (findingId: string) => Promise<void> | void;
  onFilterCategory?: (category: "priorities" | "root_cause" | "aggressive" | "signed_off") => void;
}

export const HelixScene: React.FC<HelixSceneProps> = ({
  findings = [
    { id: "1", title: "South Region Margin Dip", metric: "₹12.44 L at Risk", priority: "high", stage: "finding", status: "open" },
    { id: "2", title: "Seasonal Peak Opportunity", metric: "+18.2% Potential", priority: "medium", stage: "evidence", status: "applied" },
    { id: "3", title: "Product B Cost Surge", metric: "-8.4% Impact", priority: "high", stage: "interpretation", status: "open" },
    { id: "4", title: "Inventory Rebalance", metric: "₹4.50 L Savings", priority: "low", stage: "action", status: "completed" },
  ],
  className,
  showRailCards = true,
  datasetName = "Active Dataset",
  totalRows = 10000,
  qualityScore = 98,
  appliedCount = 0,
  completedCount = 0,
  openCount = 0,
  totalUpsideFormatted,
  totalRiskFormatted,
  onSelectFinding,
  onInspectEvidence,
  onApplyFinding,
  onFilterCategory,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [hoveredFinding, setHoveredFinding] = useState<{ finding: DecisionFinding; x: number; y: number } | null>(null);
  const [activeAction, setActiveAction] = useState<"seek" | "select" | "store">("seek");
  const [selectSuccessMsg, setSelectSuccessMsg] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const shouldReduceMotion = useReducedMotion();

  // Nodes hit-testing reference
  const nodesRef = useRef<Array<{ x: number; y: number; z: number; finding: DecisionFinding; index: number }>>([]);

  // Guard active findings
  const activeFindingsList = findings.length > 0 ? findings : [
    { id: "df-1", title: "Core Profit Engine Optimization", metric: "+₹14.2 L Upside", priority: "high" as const, stage: "action" as const, status: "open" as const }
  ];

  // Derive Top Driver & High Priorities dynamically from findings
  const highPriorityCount = activeFindingsList.filter((f) => f.priority === "high").length;
  const opportunitiesCount = activeFindingsList.filter((f) => f.metric.includes("+") || f.stage === "action").length || 1;

  const topDriverFinding = activeFindingsList.find((f) => f.priority === "high") || activeFindingsList[0];
  const topDriverSegment = topDriverFinding?.segmentValue || topDriverFinding?.title.split(":")[1]?.trim() || "Variance Driver";
  const topDriverDelta = topDriverFinding?.metric || "21.7% Impact";

  // Active focused finding
  const currentFocusedFinding = activeFindingsList[focusedIndex % activeFindingsList.length];

  // Canvas Double Helix Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const render = () => {
      const width = (canvas.width = canvas.offsetWidth || 800);
      const height = (canvas.height = canvas.offsetHeight || 180);
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      if (isPlaying && !shouldReduceMotion) {
        angle += 0.016;
      }

      const totalNodes = 32;
      const amplitude = height * 0.36;

      ctx.lineWidth = 1.6;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#FF7A1A";

      const currentNodes: Array<{ x: number; y: number; z: number; finding: DecisionFinding; index: number }> = [];

      for (let i = 0; i < totalNodes; i++) {
        const x = (i / (totalNodes - 1)) * (width - 60) + 30;
        const currentAngle = angle + i * 0.38;
        const y1 = centerY + Math.sin(currentAngle) * amplitude;
        const y2 = centerY - Math.sin(currentAngle) * amplitude;

        const findingIdx = i % activeFindingsList.length;
        const finding = activeFindingsList[findingIdx];
        const isCurrentFocus = findingIdx === (focusedIndex % activeFindingsList.length);

        const z1 = Math.cos(currentAngle);
        const z2 = -z1;

        currentNodes.push({ x, y: y1, z: z1, finding, index: findingIdx });
        currentNodes.push({ x, y: y2, z: z2, finding, index: findingIdx });

        // Connecting Base Pairs / Rungs
        ctx.beginPath();
        if (isCurrentFocus) {
          ctx.strokeStyle = "rgba(255, 244, 234, 0.75)";
          ctx.lineWidth = 2.4;
          ctx.shadowBlur = 14;
          ctx.shadowColor = "#FF7A1A";
        } else {
          ctx.strokeStyle = "rgba(255, 180, 80, 0.32)";
          ctx.lineWidth = 1.2;
          ctx.shadowBlur = 4;
          ctx.shadowColor = "rgba(255, 122, 26, 0.4)";
        }
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.stroke();

        // Strand 1 node
        const radius1 = Math.max(3.0, (isCurrentFocus ? 6.5 : 5.0) + z1 * 2.5);
        ctx.beginPath();
        ctx.arc(x, y1, radius1, 0, Math.PI * 2);
        if (isCurrentFocus) {
          ctx.fillStyle = z1 > 0 ? "#FFF4EA" : "#FF7A1A";
          ctx.shadowBlur = 16;
          ctx.shadowColor = "#FF7A1A";
        } else {
          ctx.fillStyle = z1 > 0 ? "#FFB347" : "#7C2D12";
          ctx.shadowBlur = 8;
        }
        ctx.fill();

        // Focus halo ring on positive z
        if (isCurrentFocus && z1 > -0.2) {
          ctx.beginPath();
          ctx.arc(x, y1, radius1 + 4, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 122, 26, 0.85)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Center glow photon on Strand 1
        if (z1 > 0.5) {
          ctx.beginPath();
          ctx.arc(x, y1, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = "#FFF4EA";
          ctx.fill();
        }

        // Strand 2 node
        const radius2 = Math.max(3.0, (isCurrentFocus ? 6.5 : 5.0) + z2 * 2.5);
        ctx.beginPath();
        ctx.arc(x, y2, radius2, 0, Math.PI * 2);
        if (isCurrentFocus) {
          ctx.fillStyle = z2 > 0 ? "#FFF4EA" : "#FF7A1A";
          ctx.shadowBlur = 16;
          ctx.shadowColor = "#FF7A1A";
        } else {
          ctx.fillStyle = z2 > 0 ? "#FF7A1A" : "#3B1808";
          ctx.shadowBlur = 8;
        }
        ctx.fill();

        if (isCurrentFocus && z2 > -0.2) {
          ctx.beginPath();
          ctx.arc(x, y2, radius2 + 4, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 122, 26, 0.85)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        if (z2 > 0.5) {
          ctx.beginPath();
          ctx.arc(x, y2, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = "#FFF4EA";
          ctx.fill();
        }
      }

      nodesRef.current = currentNodes;

      if (!shouldReduceMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, shouldReduceMotion, focusedIndex, activeFindingsList]);

  // Handle canvas mouse move for interactive node hovering
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Find nearest node within hit radius
    let found: { finding: DecisionFinding; x: number; y: number } | null = null;
    let closestDist = 18;

    for (const node of nodesRef.current) {
      const dx = node.x - mx;
      const dy = node.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist && node.z > -0.2) {
        closestDist = dist;
        found = { finding: node.finding, x: node.x, y: node.y };
      }
    }

    setHoveredFinding(found);
  };

  // Handle canvas click to select & inspect node
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredFinding) {
      const idx = activeFindingsList.findIndex((f) => f.id === hoveredFinding.finding.id);
      if (idx !== -1) {
        setFocusedIndex(idx);
        if (onInspectEvidence) {
          onInspectEvidence(hoveredFinding.finding);
        } else if (onSelectFinding) {
          onSelectFinding(hoveredFinding.finding);
        }
      }
    }
  };

  // Seek handler (Step backward in findings stream)
  const handleSeek = () => {
    setActiveAction("seek");
    const nextIdx = (focusedIndex - 1 + activeFindingsList.length) % activeFindingsList.length;
    setFocusedIndex(nextIdx);
    const targetFinding = activeFindingsList[nextIdx];
    if (onSelectFinding) {
      onSelectFinding(targetFinding);
    }
  };

  // Store handler (Step forward in findings stream)
  const handleStore = () => {
    setActiveAction("store");
    const nextIdx = (focusedIndex + 1) % activeFindingsList.length;
    setFocusedIndex(nextIdx);
    const targetFinding = activeFindingsList[nextIdx];
    if (onSelectFinding) {
      onSelectFinding(targetFinding);
    }
  };

  // Select handler (Capture active decision into operational roadmap)
  const handleSelect = async () => {
    setActiveAction("select");
    if (!currentFocusedFinding) return;
    try {
      setIsApplying(true);
      if (onApplyFinding) {
        await onApplyFinding(currentFocusedFinding.id);
      }
      if (onSelectFinding) {
        onSelectFinding(currentFocusedFinding);
      }
      setSelectSuccessMsg(`✓ Captured "${currentFocusedFinding.title.slice(0, 32)}..." into Execution Roadmap`);
      setTimeout(() => setSelectSuccessMsg(null), 3500);
    } finally {
      setIsApplying(false);
    }
  };

  const statusBadge = (status?: string) => {
    switch (status) {
      case "applied":
        return <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 font-semibold">IN PIPELINE</span>;
      case "completed":
        return <span className="text-[10px] text-status-positive bg-status-positive/10 px-2 py-0.5 rounded-full border border-status-positive/20 font-semibold">VALUE CAPTURED</span>;
      default:
        return <span className="text-[10px] text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full border border-brand-orange/20 font-semibold">OPEN ACTION</span>;
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full rounded-2xl border border-brand-orange/30 bg-[#07070A] p-5 overflow-hidden flex flex-col justify-between shadow-2xl transition-all",
        className
      )}
    >
      {/* Background radial gradient glow */}
      <div className="absolute top-0 right-1/4 w-96 h-48 bg-brand-orange/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header matching Panel 5 of Master Architecture */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-orange/20 pb-3 z-10">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-orange/15 text-brand-orange border border-brand-orange/30">
              5. The Decision Rails - Hybrid Theme
            </span>
            <span className="text-xs font-bold text-text-muted">•</span>
            <span className="text-xs font-bold text-[#FFF4EA]">Decision Support</span>
            <span className="text-xs font-bold text-text-muted">•</span>
            <span className="text-[11px] font-medium text-text-muted">{datasetName}</span>
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">
            Development for microeconomic parameters and actionable variance rails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectSuccessMsg && (
            <span className="text-xs font-bold text-status-positive bg-status-positive/15 border border-status-positive/30 px-2.5 py-1 rounded-lg animate-fadeIn flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-status-positive" />
              {selectSuccessMsg}
            </span>
          )}

          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="p-1.5 rounded-lg border border-brand-orange/30 text-brand-orange hover:bg-brand-orange/15 transition-colors"
            title={isPlaying ? "Pause rotation" : "Play rotation"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Double Helix Area with 6 Dynamic Rail Cards */}
      <div className="relative w-full my-3 flex flex-col items-center">
        {/* Top 3 Floating Rail Cards */}
        {showRailCards && (
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2 z-20">
            {/* Card 1: Priorities */}
            <div
              onClick={() => onFilterCategory?.("priorities")}
              className="bg-[#0E0B09]/95 backdrop-blur-md border border-brand-orange/35 rounded-xl p-2.5 shadow-glowSm text-left cursor-pointer hover:border-brand-orange/70 hover:bg-[#16100C] transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold text-brand-orange block">Priorities</span>
                <span className="w-1.5 h-1.5 rounded-full bg-brand-orange group-hover:scale-125 transition-transform" />
              </div>
              <div className="text-xs font-bold text-[#FFF4EA] mt-0.5 truncate">
                Decision Support: {highPriorityCount > 0 ? highPriorityCount : activeFindingsList.length}
              </div>
              <span className="text-[9px] text-text-muted truncate block">
                {totalRiskFormatted ? `${totalRiskFormatted} at Risk` : "Target Mitigation"}
              </span>
            </div>

            {/* Card 2: Root Cause */}
            <div
              onClick={() => onFilterCategory?.("root_cause")}
              className="bg-[#0E0B09]/95 backdrop-blur-md border border-brand-orange/45 rounded-xl p-2.5 shadow-glowSm text-center cursor-pointer hover:border-brand-orange/70 hover:bg-[#16100C] transition-all group"
            >
              <div className="flex items-center justify-center gap-1">
                <span className="text-[9px] uppercase font-bold text-brand-orange block">Root Cause</span>
              </div>
              <div className="text-xs font-bold text-[#FFF4EA] mt-0.5 truncate">
                STATISTICAL ROOT: {topDriverSegment}
              </div>
              <span className="text-[9px] text-status-positive font-medium truncate block">
                {topDriverDelta} Primary Drivers
              </span>
            </div>

            {/* Card 3: Aggressive */}
            <div
              onClick={() => onFilterCategory?.("aggressive")}
              className="bg-[#0E0B09]/95 backdrop-blur-md border border-brand-orange/35 rounded-xl p-2.5 shadow-glowSm text-right cursor-pointer hover:border-brand-orange/70 hover:bg-[#16100C] transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="w-1.5 h-1.5 rounded-full bg-status-positive group-hover:scale-125 transition-transform" />
                <span className="text-[9px] uppercase font-bold text-brand-orange block">Aggressive</span>
              </div>
              <div className="text-xs font-bold text-[#FFF4EA] mt-0.5 truncate">
                Variance Solvers: {opportunitiesCount}
              </div>
              <span className="text-[9px] text-text-muted truncate block">
                {totalUpsideFormatted ? `+${totalUpsideFormatted} Sizing` : "High Confidence"}
              </span>
            </div>
          </div>
        )}

        {/* 3D Glowing Amber Double Helix Canvas with Interactive Hit-Testing */}
        <div className="w-full h-36 sm:h-44 flex items-center justify-center relative cursor-crosshair">
          <canvas
            ref={canvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => setHoveredFinding(null)}
            onClick={handleCanvasClick}
            className="w-full h-full max-w-4xl block"
          />

          {/* Interactive Hover HUD Tooltip */}
          {hoveredFinding && (
            <div
              className="absolute z-30 pointer-events-none p-2.5 rounded-xl bg-[#140F0C]/95 border border-brand-orange/60 shadow-glowMd text-left max-w-xs animate-fadeIn backdrop-blur-md -translate-x-1/2 -translate-y-full"
              style={{
                left: `${hoveredFinding.x}px`,
                top: `${hoveredFinding.y - 12}px`,
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span
                  className={cn(
                    "text-[9px] font-bold px-1.5 py-0.2 rounded uppercase",
                    hoveredFinding.finding.priority === "high"
                      ? "text-rose-400 bg-rose-500/15"
                      : "text-brand-orange bg-brand-orange/15"
                  )}
                >
                  {hoveredFinding.finding.priority}
                </span>
                <span className="text-[9px] text-text-muted uppercase font-mono">
                  STAGE: {hoveredFinding.finding.stage}
                </span>
              </div>
              <div className="text-xs font-bold text-[#FFF4EA] line-clamp-1">
                {hoveredFinding.finding.title}
              </div>
              <div className="text-[11px] font-semibold text-brand-orange mt-0.5">
                {hoveredFinding.finding.metric}
              </div>
              <div className="text-[9px] text-text-muted mt-1 italic">Click node to inspect & execute</div>
            </div>
          )}
        </div>

        {/* Bottom 3 Floating Rail Cards */}
        {showRailCards && (
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 z-20">
            {/* Card 4: Baseline Actuals */}
            <div className="bg-[#0E0B09]/95 backdrop-blur-md border border-brand-orange/35 rounded-xl p-2.5 shadow-glowSm text-left">
              <span className="text-[9px] uppercase font-bold text-brand-orange block">Baseline Actuals</span>
              <div className="text-xs font-bold text-[#FFF4EA] mt-0.5 truncate">
                Baseline Report: {totalRows.toLocaleString()} Rows
              </div>
              <span className="text-[9px] text-text-muted">Tracked Changes</span>
            </div>

            {/* Card 5: Simulation Impact */}
            <div
              onClick={() => onFilterCategory?.("aggressive")}
              className="bg-[#0E0B09]/95 backdrop-blur-md border border-brand-orange/45 rounded-xl p-2.5 shadow-glowSm text-center cursor-pointer hover:border-brand-orange/70 hover:bg-[#16100C] transition-all group"
            >
              <span className="text-[9px] uppercase font-bold text-status-positive block">Simulation Impact</span>
              <div className="text-xs font-bold text-status-positive mt-0.5 truncate">
                {totalUpsideFormatted ? `+${totalUpsideFormatted}` : "+21.7% PROFIT"}
              </div>
              <span className="text-[9px] text-text-muted">Waterfall Verified</span>
            </div>

            {/* Card 6: Signed-Off */}
            <div
              onClick={() => onFilterCategory?.("signed_off")}
              className="bg-[#0E0B09]/95 backdrop-blur-md border border-brand-orange/35 rounded-xl p-2.5 shadow-glowSm text-right cursor-pointer hover:border-brand-orange/70 hover:bg-[#16100C] transition-all group"
            >
              <span className="text-[9px] uppercase font-bold text-brand-orange block">Signed-Off</span>
              <div className="text-xs font-bold text-[#FFF4EA] mt-0.5 truncate">
                Executive Actions: {appliedCount + completedCount}
              </div>
              <span className="text-[9px] text-status-positive">
                {appliedCount} Active • {completedCount} Done
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Target Focus Banner & Functional Rail Controller (< Seek - Select - Store >) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-brand-orange/20 z-10">
        {/* Active Target Banner */}
        <div className="flex items-center gap-2 max-w-md truncate">
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-brand-orange/15 text-brand-orange font-mono">
            NODE [{focusedIndex + 1}/{activeFindingsList.length}]
          </span>
          <span className="text-xs font-bold text-[#FFF4EA] truncate" title={currentFocusedFinding?.title}>
            {currentFocusedFinding?.title}
          </span>
          <span className="text-xs text-brand-orange font-semibold tabular-nums shrink-0">
            {currentFocusedFinding?.metric}
          </span>
          {statusBadge(currentFocusedFinding?.status)}
        </div>

        {/* Fully Functional Bottom Rail Controller (< Seek - Select - Store > matching Screenshot 3) */}
        <div className="inline-flex items-center rounded-full border border-brand-orange/60 bg-[#0B0908] p-1 shadow-glowSm">
          {/* < Seek Button */}
          <button
            onClick={handleSeek}
            title="Seek backward: Step to previous decision node"
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 active:scale-95",
              activeAction === "seek"
                ? "bg-brand-orange text-white shadow-glowSm"
                : "text-[#E2D9D2] hover:text-white hover:bg-brand-orange/20"
            )}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Seek</span>
          </button>

          {/* ✨ Select Button */}
          <button
            onClick={handleSelect}
            disabled={isApplying}
            title="Select & Commit: Add active decision to operational execution pipeline"
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50",
              activeAction === "select"
                ? "bg-brand-orange text-white shadow-glowSm"
                : "text-[#E2D9D2] hover:text-white hover:bg-brand-orange/20"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-current animate-spin-slow" />
            <span>{isApplying ? "Committing..." : "Select"}</span>
          </button>

          {/* Store > Button */}
          <button
            onClick={handleStore}
            title="Store forward: Advance to next decision node on helix"
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 active:scale-95",
              activeAction === "store"
                ? "bg-brand-orange text-white shadow-glowSm"
                : "text-[#E2D9D2] hover:text-white hover:bg-brand-orange/20"
            )}
          >
            <span>Store</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
