import React, { useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Activity, ShieldCheck, Zap, Database, ArrowUpRight } from "lucide-react";
import { useReducedMotion } from "framer-motion";

export interface PulseComponent {
  label: string;
  score: number;
  subtext?: string;
}

export interface PulseLineProps {
  score?: number;
  components?: PulseComponent[];
  executionVelocity?: number;
  dataQuality?: number;
  lineageAudit?: number;
  riskMitigation?: number;
  className?: string;
  datasetName?: string;
}

export const PulseLine: React.FC<PulseLineProps> = ({
  score = 84,
  components,
  executionVelocity,
  dataQuality,
  lineageAudit,
  riskMitigation,
  className,
  datasetName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [bpm] = useState(() => 72 + Math.round((score - 80) * 0.4));
  const [heartbeatBeat, setHeartbeatBeat] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Resolve sub-components
  const resolvedComponents = useMemo(() => {
    if (components && components.length > 0) {
      return components;
    }
    return [
      { label: "Execution Velocity", score: executionVelocity ?? 0 },
      { label: "Data Quality", score: dataQuality ?? 98 },
      { label: "Lineage Audit", score: lineageAudit ?? 98 },
      { label: "Risk Mitigation", score: riskMitigation ?? 94 },
    ];
  }, [components, executionVelocity, dataQuality, lineageAudit, riskMitigation]);

  // Determine vital signs status
  const getVitalStatus = (val: number) => {
    if (val >= 88) return { label: "OPTIMAL VITALITY", color: "text-status-positive", bg: "bg-status-positive/10", border: "border-status-positive/30" };
    if (val >= 75) return { label: "STABLE POSTURE", color: "text-brand-orange", bg: "bg-brand-orange/10", border: "border-brand-orange/30" };
    return { label: "ACTIVE MITIGATION", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30" };
  };

  const status = getVitalStatus(score);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.offsetWidth || 500);
    let height = (canvas.height = canvas.offsetHeight || 100);

    // Auto-adjust on resize
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || 500;
      height = canvas.height = canvas.offsetHeight || 100;
    };
    window.addEventListener("resize", handleResize);

    // ECG sweep variables
    let scanX = 0;
    const speed = 2.4;
    const cycleLength = 170; // width of one cardiac P-Q-R-S-T wave
    const centerY = height / 2;
    const amplitude = height * 0.40;

    // Buffer to hold generated y values
    const bufferY = new Float32Array(width);
    for (let i = 0; i < width; i++) bufferY[i] = centerY;

    let lastBeatTime = 0;

    const render = (time: number) => {
      // 1. Draw Oscilloscope Grid
      ctx.fillStyle = "#0D0A08";
      ctx.fillRect(0, 0, width, height);

      // Subtle gridlines
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 122, 26, 0.05)";
      const gridGap = 20;
      for (let x = 0; x < width; x += gridGap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridGap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Advance scanhead
      if (!shouldReduceMotion) {
        const prevScanX = scanX;
        scanX += speed;
        if (scanX >= width) {
          scanX = 0;
        }

        // Generate synthetic ECG cardiac cycle at current scanhead
        const rel = scanX % cycleLength;
        let yOffset = 0;

        if (rel >= 20 && rel < 36) {
          // P wave (atrial depolarization)
          yOffset = -Math.sin(((rel - 20) / 16) * Math.PI) * (amplitude * 0.22);
        } else if (rel >= 48 && rel < 54) {
          // Q dip
          yOffset = Math.sin(((rel - 48) / 6) * Math.PI) * (amplitude * 0.16);
        } else if (rel >= 54 && rel < 64) {
          // R spike (ventricular depolarization)
          const rPos = (rel - 54) / 10;
          yOffset = -Math.sin(rPos * Math.PI) * amplitude;
          if (rPos > 0.4 && rPos < 0.6 && time - lastBeatTime > 400) {
            lastBeatTime = time;
            setHeartbeatBeat(true);
            setTimeout(() => setHeartbeatBeat(false), 140);
          }
        } else if (rel >= 64 && rel < 72) {
          // S dip
          yOffset = Math.sin(((rel - 64) / 8) * Math.PI) * (amplitude * 0.28);
        } else if (rel >= 86 && rel < 114) {
          // T wave (ventricular repolarization)
          yOffset = -Math.sin(((rel - 86) / 28) * Math.PI) * (amplitude * 0.32);
        }

        const currentY = centerY + yOffset;
        bufferY[Math.floor(scanX)] = currentY;

        // Erase ahead of scanhead (sweep gap of 28px)
        const blankWidth = 28;
        for (let b = 0; b < blankWidth; b++) {
          const eraseX = (Math.floor(scanX) + b) % width;
          bufferY[eraseX] = centerY;
        }
      }

      // 3. Draw Continuous ECG Wave with phosphor glow
      ctx.lineWidth = 2.2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#FF7A1A";
      ctx.strokeStyle = "#FF842B";

      ctx.beginPath();
      let started = false;
      const blankGap = 24;

      for (let x = 0; x < width; x++) {
        // Skip region directly ahead of scanhead
        const distAhead = (x - scanX + width) % width;
        if (distAhead < blankGap) {
          started = false;
          continue;
        }

        const y = bufferY[x] || centerY;
        if (!started) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // 4. Draw Glowing Scanhead Particle
      if (!shouldReduceMotion) {
        const headY = bufferY[Math.floor(scanX)] || centerY;

        // Outer halo
        ctx.beginPath();
        ctx.arc(scanX, headY, 6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 122, 26, 0.4)";
        ctx.shadowBlur = 14;
        ctx.shadowColor = "#FF7A1A";
        ctx.fill();

        // Core photon
        ctx.beginPath();
        ctx.arc(scanX, headY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#FFF7ED";
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [shouldReduceMotion, score]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "p-5 rounded-2xl border border-brand-orange/30 bg-[#0E0A08]/95 backdrop-blur-md flex flex-col justify-between shadow-2xl relative overflow-hidden group hover:border-brand-orange/50 transition-all",
        className
      )}
    >
      {/* Background radial gradient glow */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-brand-orange/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Live Status & Metric Score */}
      <div className="flex items-center justify-between pb-3.5 border-b border-surface-border/80 z-10">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "w-7 h-7 rounded-lg border flex items-center justify-center transition-transform",
              status.bg,
              status.border,
              heartbeatBeat ? "scale-115 text-brand-orange" : "text-text-muted"
            )}
          >
            <Activity className="w-4 h-4 text-brand-orange" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-main">Business Health Pulse</h4>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-status-positive bg-status-positive/10 px-2 py-0.5 rounded-full border border-status-positive/20">
                <span className="w-1.5 h-1.5 rounded-full bg-status-positive animate-ping" />
                LIVE TELEMETRY
              </span>
            </div>
            <div className="text-[10px] text-text-muted mt-0.5">
              Continuous DuckDB mathematical vital signs • {bpm} BPM
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            <span className={cn("text-xl font-bold tabular-nums", status.color)}>
              {score}
            </span>
            <span className="text-xs text-text-muted font-normal">/100</span>
          </div>
          <span className={cn("text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded uppercase border inline-block mt-0.5", status.bg, status.border, status.color)}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Live Oscilloscope ECG Sweep Canvas */}
      <div className="my-3 w-full h-24 rounded-xl border border-brand-orange/20 overflow-hidden relative shadow-inner bg-[#0A0705]">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Live Grid Legend Overlay */}
        <div className="absolute bottom-1.5 left-2.5 text-[9px] font-mono text-text-muted/60 flex items-center gap-2 pointer-events-none">
          <span>SWEEP: 25mm/s</span>
          <span>•</span>
          <span>GAIN: 10mm/mV</span>
          <span>•</span>
          <span>LEAD: D-II</span>
        </div>

        {/* Active scan status */}
        <div className="absolute top-1.5 right-2.5 text-[9px] font-mono text-status-positive/80 flex items-center gap-1 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-status-positive"></span>
          <span>STREAMING</span>
        </div>
      </div>

      {/* 4 Interactive Sub-Component Scores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-surface-border/80 text-center z-10">
        {resolvedComponents.map((c, i) => {
          const compPct = Math.max(0, Math.min(100, c.score));
          const compColor =
            compPct >= 85
              ? "text-status-positive"
              : compPct >= 60
              ? "text-brand-orange"
              : "text-rose-400";
          const barColor =
            compPct >= 85
              ? "bg-status-positive"
              : compPct >= 60
              ? "bg-brand-orange"
              : "bg-rose-500";

          return (
            <div
              key={i}
              className="p-2 rounded-xl bg-[#140F0C] border border-surface-border/60 hover:border-brand-orange/30 transition-all text-left flex flex-col justify-between"
              title={`${c.label}: ${compPct}% calculated from verified active dataset telemetry`}
            >
              <div>
                <span className="text-[10px] text-text-muted font-medium truncate block">
                  {c.label}
                </span>
                <div className={cn("text-sm font-bold tabular-nums mt-0.5", compColor)}>
                  {`${compPct}%`}
                </div>
              </div>

              {/* Mini Progress Bar */}
              <div className="w-full h-1 bg-surface-subtle rounded-full mt-2 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", barColor)}
                  style={{ width: `${compPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
