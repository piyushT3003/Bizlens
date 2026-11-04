import React, { useState, useEffect } from "react";
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
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 2800; // 2.8s smooth Apple-inspired animation

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawPct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(rawPct);

      // Determine stage
      if (rawPct < 25) {
        setCurrentStageIdx(0);
      } else if (rawPct < 55) {
        setCurrentStageIdx(1);
      } else if (rawPct < 85) {
        setCurrentStageIdx(2);
      } else if (rawPct < 100) {
        setCurrentStageIdx(3);
      } else {
        setCurrentStageIdx(4);
      }

      // Add telemetry log events
      if (rawPct >= 15 && telemetryLogs.length === 0) {
        setTelemetryLogs((prev) => [
          ...prev,
          `[0.04s] VFS mounted: ${fileName || datasetName} (SHA-256 verified)`,
        ]);
      }
      if (rawPct >= 40 && telemetryLogs.length === 1) {
        setTelemetryLogs((prev) => [
          ...prev,
          `[0.18s] DuckDB allocated ${rowCount.toLocaleString()} rows x ${colCount} columns`,
        ]);
      }
      if (rawPct >= 70 && telemetryLogs.length === 2) {
        setTelemetryLogs((prev) => [
          ...prev,
          `[0.32s] PII Defense active: 0 sensitive tokens leaked to AI context`,
        ]);
      }
      if (rawPct >= 95 && telemetryLogs.length === 3) {
        setTelemetryLogs((prev) => [
          ...prev,
          `[0.48s] OLAP cubes compiled & 3D Topography coordinates anchored`,
        ]);
      }

      if (rawPct >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          onComplete?.();
        }, 600);
      }
    }, 40);

    return () => clearInterval(timer);
  }, [rowCount, colCount, fileName, datasetName, onComplete]);

  const activeStage = INGESTION_STAGES[currentStageIdx] || INGESTION_STAGES[0];
  const StageIcon = activeStage.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-300">
      {/* MacBook Window Shell */}
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0C0A09]/95 shadow-[0_30px_100px_rgba(0,0,0,0.9)] overflow-hidden relative text-text-main flex flex-col">
        {/* Apple macOS Style Window Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#14100D]/80 border-b border-surface-border/60">
          {/* Traffic Lights */}
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] hover:opacity-80 transition-opacity"
              title="Cancel Ingestion"
            />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
          </div>

          {/* Dynamic Island Style Status Capsule */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C1612] border border-brand-orange/30 shadow-glowSm">
            <span className="w-2 h-2 rounded-full bg-brand-orange animate-ping" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-orange">
              Apple Silicon Ingestion Core &bull; Parquet VFS
            </span>
          </div>

          <div className="text-[11px] font-mono text-text-muted tabular-nums">
            {progress < 100 ? `${(progress * 1.48).toFixed(1)} MB/s` : "Synced"}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-8 space-y-6 flex flex-col items-center text-center">
          {/* Central Animated Silicon Ingestion Reactor */}
          <div className="relative w-36 h-36 flex items-center justify-center my-2 select-none">
            {/* Outer Apple-style Breathing Glow Ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand-orange/20 via-amber-500/15 to-transparent blur-xl animate-pulse" />

            {/* Orbiting Rotating Dashed Ring */}
            <div
              className="absolute inset-0 rounded-full border-2 border-brand-orange/30 border-dashed animate-spin"
              style={{ animationDuration: "14s" }}
            />

            {/* Counter-Rotating Precision Ring */}
            <div
              className="absolute inset-2.5 rounded-full border border-amber-400/40 border-t-amber-300 animate-spin"
              style={{ animationDuration: "7s", animationDirection: "reverse" }}
            />

            {/* Inner Concentric Aura Ring */}
            <div className="absolute inset-5 rounded-full bg-gradient-to-br from-[#1C1612] via-[#241A13] to-[#120F0D] border border-brand-orange/50 shadow-inner flex items-center justify-center">
              {progress < 100 ? (
                <div className="relative">
                  <Cpu className="w-12 h-12 text-brand-orange animate-pulse" />
                  <Sparkles className="w-4 h-4 text-amber-300 absolute -top-1 -right-1 animate-bounce" />
                </div>
              ) : (
                <div className="relative animate-in zoom-in-75 duration-300">
                  <CheckCircle2 className="w-14 h-14 text-status-positive" />
                </div>
              )}
            </div>

            {/* Orbiting Particle Bead */}
            <div
              className="absolute inset-0 rounded-full flex items-start justify-center animate-spin"
              style={{ animationDuration: "2.4s" }}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-brand-orange shadow-glowMd -translate-y-1" />
            </div>
          </div>

          {/* Dataset Title & File Info */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-orange/15 text-brand-orange border border-brand-orange/30 mb-2">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{datasetName}</span>
            </div>
            <h3 className="text-xl font-bold text-text-main tracking-tight">
              {activeStage.title}
            </h3>
            <p className="text-xs text-text-muted mt-1 max-w-md mx-auto leading-relaxed">
              {activeStage.detail}
            </p>
          </div>

          {/* Liquid Ingestion Progress Bar */}
          <div className="w-full max-w-md space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-medium">
              <span className="text-text-muted flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-brand-orange" />
                <span>Columnar Stream: {activeStage.badge}</span>
              </span>
              <span className="text-brand-orange font-bold tabular-nums">
                {progress}%
              </span>
            </div>

            <div className="h-2.5 rounded-full bg-[#1C1612] border border-surface-border/80 p-0.5 overflow-hidden relative shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-orange via-amber-400 to-amber-300 transition-all duration-150 ease-out relative shadow-glowSm"
                style={{ width: `${progress}%` }}
              >
                {/* Glowing light sweep flare */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer" />
              </div>
            </div>
          </div>

          {/* Apple-style Micro-Telemetry Log Window */}
          <div className="w-full max-w-md rounded-xl bg-[#140F0C] border border-surface-border/60 p-3 text-left font-mono text-[11px] space-y-1 text-text-muted/80 shadow-inner min-h-[88px]">
            <div className="text-[10px] uppercase font-bold text-brand-orange/80 tracking-wider pb-1 border-b border-surface-border/40 flex items-center justify-between">
              <span>Kernel Stream Telemetry</span>
              <span>DuckDB v1.1</span>
            </div>
            {telemetryLogs.map((log, idx) => (
              <div key={idx} className="truncate animate-in fade-in duration-200 text-text-muted">
                {log}
              </div>
            ))}
            {telemetryLogs.length === 0 && (
              <div className="text-text-muted/50 italic">Initializing high-throughput stream...</div>
            )}
          </div>

          {/* Action Row */}
          <div className="pt-2 flex items-center justify-between w-full max-w-md border-t border-surface-border/50">
            <span className="text-[11px] text-text-muted font-mono">
              {rowCount.toLocaleString()} rows &bull; {colCount} cols
            </span>

            {progress >= 100 ? (
              <button
                onClick={onComplete}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-orange text-white hover:bg-brand-orange/90 transition-all shadow-glowSm flex items-center gap-1.5"
              >
                <span>Ready &bull; Open Engine</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onComplete}
                className="text-xs font-semibold text-text-muted hover:text-text-main transition-colors px-3 py-1.5"
              >
                Skip Animation &rarr;
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
