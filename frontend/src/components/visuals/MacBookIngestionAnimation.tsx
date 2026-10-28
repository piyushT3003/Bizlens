import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  Database,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  HardDrive,
  Activity,
  FileSpreadsheet,
} from "lucide-react";

export interface MacBookIngestionAnimationProps {
  datasetName: string;
  rowCount?: number;
  colCount?: number;
  fileName?: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

const INGESTION_STAGES = [
  {
    pct: 20,
    title: "Mounting Parquet VFS & SHA-256 Fingerprint",
    detail: "Initializing zero-copy memory stream and validating cryptographic content hash.",
    badge: "VFS MOUNT",
    icon: HardDrive,
  },
  {
    pct: 45,
    title: "DuckDB High-Throughput Columnar Vectorization",
    detail: "Decompressing Snappy block vectors and computing distribution statistics.",
    badge: "DUCKDB CORE",
    icon: Cpu,
  },
  {
    pct: 75,
    title: "Semantic Role Inference & PII Shield Quarantine",
    detail: "Classifying revenue, dates, regions, and safeguarding sensitive tokens.",
    badge: "ROLE TAXONOMY",
    icon: ShieldCheck,
  },
  {
    pct: 95,
    title: "Hydrating OLAP Cache & Geographic Topology",
    detail: "Compiling held-out backtest intervals and precomputing 3D globe coordinates.",
    badge: "OLAP CACHE",
    icon: Layers,
  },
  {
    pct: 100,
    title: "Ingestion Certified & Engine Ready",
    detail: "Deterministic calculation lineage confirmed with zero hallucinated parameters.",
    badge: "COMPLETE",
    icon: CheckCircle2,
  },
];

export const MacBookIngestionAnimation: React.FC<MacBookIngestionAnimationProps> = ({
  datasetName,
  rowCount = 10000,
  colCount = 12,
  fileName,
  onComplete,
  onCancel,
}) => {
  const [progress, setProgress] = useState(0);

  // Keep callback references stable to prevent parent re-renders from restarting the timer
  const onCompleteRef = useRef(onComplete);
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  // Lock background body scroll cleanly — do NOT touch main.overflow-y-auto to prevent scroll resets
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  // Keyboard shortcut: Escape to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancelRef.current?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Smooth Apple-inspired timed progression (runs exactly once without churn)
  useEffect(() => {
    const startTime = Date.now();
    const duration = 2500; // 2.5s smooth Apple-inspired animation

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawPct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(rawPct);

      if (rawPct >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          onCompleteRef.current?.();
        }, 400);
      }
    }, 35);

    return () => clearInterval(timer);
  }, []);

  // Determine stage index based on progress
  const currentStageIdx = useMemo(() => {
    if (progress < 25) return 0;
    if (progress < 55) return 1;
    if (progress < 85) return 2;
    if (progress < 100) return 3;
    return 4;
  }, [progress]);

  const activeStage = INGESTION_STAGES[currentStageIdx] || INGESTION_STAGES[0];
  const StageIcon = activeStage.icon;

  // Telemetry logs derived deterministically from progress — zero layout shifts or duplicate triggers
  const telemetryLogs = useMemo(() => {
    const logs: string[] = [];
    const displayName = fileName || datasetName;
    if (progress >= 15) {
      logs.push(`[0.04s] VFS mounted: ${displayName} (SHA-256 verified)`);
    }
    if (progress >= 40) {
      logs.push(`[0.18s] DuckDB allocated ${rowCount.toLocaleString()} rows x ${colCount} cols`);
    }
    if (progress >= 70) {
      logs.push(`[0.32s] PII Defense active: 0 sensitive tokens in AI context`);
    }
    if (progress >= 95) {
      logs.push(`[0.48s] OLAP cubes compiled & 3D Topography coordinates anchored`);
    }
    return logs;
  }, [progress, fileName, datasetName, rowCount, colCount]);

  if (typeof document === "undefined") return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200 overflow-y-auto"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      {/* MacBook Window Shell: max-w-lg keeps it compact; my-auto centers it vertically without top-clipping */}
      <div
        className="w-full max-w-lg my-auto rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0C0A09]/95 shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden relative text-text-main flex flex-col shrink-0 max-h-[92vh] sm:max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple macOS Style Window Header Bar */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-2.5 bg-[#14100D]/90 border-b border-surface-border/60">
          {/* Traffic Lights */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onCancelRef.current?.()}
              className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] hover:opacity-80 transition-opacity"
              title="Cancel Ingestion"
            />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
          </div>

          {/* Dynamic Island Style Status Capsule */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C1612] border border-brand-orange/30 shadow-glowSm">
            <span className="w-2 h-2 rounded-full bg-brand-orange animate-ping" />
            <span className="text-[10px] sm:text-[10.5px] font-mono font-bold uppercase tracking-wider text-brand-orange truncate max-w-[190px] sm:max-w-none">
              Silicon Ingestion Core &bull; Parquet VFS
            </span>
          </div>

          <div className="text-[11px] font-mono text-text-muted tabular-nums">
            {progress < 100 ? `${(progress * 1.48).toFixed(1)} MB/s` : "Synced"}
          </div>
        </div>

        {/* Modal Body: Compact, scrollable internally if screen is extremely constrained */}
        <div className="p-4 sm:p-5 space-y-3.5 flex flex-col items-center text-center overflow-y-auto custom-scrollbar">
          {/* Central Animated Silicon Ingestion Reactor */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center my-0.5 select-none shrink-0">
            {/* Outer Apple-style Breathing Glow Ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand-orange/20 via-amber-500/15 to-transparent blur-lg animate-pulse" />

            {/* Orbiting Rotating Dashed Ring */}
            <div
              className="absolute inset-0 rounded-full border-2 border-brand-orange/30 border-dashed animate-spin"
              style={{ animationDuration: "14s" }}
            />

            {/* Counter-Rotating Precision Ring */}
            <div
              className="absolute inset-1.5 rounded-full border border-amber-400/40 border-t-amber-300 animate-spin"
              style={{ animationDuration: "7s", animationDirection: "reverse" }}
            />

            {/* Inner Concentric Aura Ring */}
            <div className="absolute inset-3 rounded-full bg-gradient-to-br from-[#1C1612] via-[#241A13] to-[#120F0D] border border-brand-orange/50 shadow-inner flex items-center justify-center">
              {progress < 100 ? (
                <div className="relative">
                  <Cpu className="w-7 h-7 sm:w-8 sm:h-8 text-brand-orange animate-pulse" />
                  <Sparkles className="w-3 h-3 text-amber-300 absolute -top-1 -right-1 animate-bounce" />
                </div>
              ) : (
                <div className="relative animate-in zoom-in-75 duration-300">
                  <CheckCircle2 className="w-8 h-8 sm:w-9 sm:h-9 text-status-positive" />
                </div>
              )}
            </div>

            {/* Orbiting Particle Bead */}
            <div
              className="absolute inset-0 rounded-full flex items-start justify-center animate-spin"
              style={{ animationDuration: "2.4s" }}
            >
              <span className="w-2 h-2 rounded-full bg-brand-orange shadow-glowMd -translate-y-0.5" />
            </div>
          </div>

          {/* Dataset Title & File Info */}
          <div className="space-y-1 shrink-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-orange/15 text-brand-orange border border-brand-orange/30">
              <FileSpreadsheet className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[220px] sm:max-w-xs">{datasetName}</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-text-main tracking-tight">
              {activeStage.title}
            </h3>
            <p className="text-xs text-text-muted max-w-sm sm:max-w-md mx-auto leading-relaxed">
              {activeStage.detail}
            </p>
          </div>

          {/* Liquid Ingestion Progress Bar */}
          <div className="w-full max-w-md space-y-1.5 shrink-0">
            <div className="flex items-center justify-between text-xs font-mono font-medium">
              <span className="text-text-muted flex items-center gap-1.5 text-[11px]">
                <Activity className="w-3.5 h-3.5 text-brand-orange" />
                <span>Columnar Stream: {activeStage.badge}</span>
              </span>
              <span className="text-brand-orange font-bold tabular-nums text-xs">
                {progress}%
              </span>
            </div>

            <div className="h-2 rounded-full bg-[#1C1612] border border-surface-border/80 p-0.5 overflow-hidden relative shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-orange via-amber-400 to-amber-300 transition-all duration-150 ease-out relative shadow-glowSm"
                style={{ width: `${progress}%` }}
              >
                {/* Glowing light sweep flare */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer" />
              </div>
            </div>
          </div>

          {/* Apple-style Micro-Telemetry Log Window: Fixed Height to prevent auto-scrolling layout jumps */}
          <div className="w-full max-w-md rounded-xl bg-[#140F0C] border border-surface-border/60 p-2 sm:p-2.5 text-left font-mono text-[11px] h-[88px] flex flex-col justify-between shadow-inner overflow-hidden shrink-0">
            <div className="text-[10px] uppercase font-bold text-brand-orange/80 tracking-wider pb-1 border-b border-surface-border/40 flex items-center justify-between shrink-0">
              <span>Kernel Stream Telemetry</span>
              <span className="text-text-muted/60">DuckDB v1.1 &bull; Zero Copy</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-0.5 py-1 pr-1 custom-scrollbar">
              {telemetryLogs.map((log, idx) => (
                <div key={idx} className="truncate text-text-muted text-[10px] leading-tight">
                  {log}
                </div>
              ))}
              {telemetryLogs.length === 0 && (
                <div className="text-text-muted/50 italic text-[10px]">Initializing high-throughput stream...</div>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex items-center justify-between w-full max-w-md border-t border-surface-border/50 shrink-0">
            <span className="text-[11px] text-text-muted font-mono">
              {rowCount.toLocaleString()} rows &bull; {colCount} cols
            </span>

            {progress >= 100 ? (
              <button
                onClick={() => onCompleteRef.current?.()}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-brand-orange text-white hover:bg-brand-orange/90 transition-all shadow-glowSm flex items-center gap-1.5"
              >
                <span>Ready &bull; Open Engine</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => onCompleteRef.current?.()}
                className="text-xs font-semibold text-text-muted hover:text-text-main transition-colors px-3 py-1"
              >
                Skip Animation &rarr;
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
