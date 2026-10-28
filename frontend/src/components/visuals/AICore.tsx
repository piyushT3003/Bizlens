import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "framer-motion";

export interface AICoreProps {
  mode?: "hero" | "welcome" | "calm" | "compact" | "thinking" | "exchange";
  className?: string;
  size?: number;
  showExchangeChips?: boolean;
  exchangeNetText?: string;
  exchangeGrossText?: string;
  exchangeInsightsText?: string;
  exchangeFeaturesText?: string;
  exchangeKpisText?: string;
  exchangeSolvedText?: string;
}

// Major Global Business Hubs on 3D Globe (lat, lon in degrees)
const GLOBAL_HUBS = [
  { name: "Mumbai", lat: 19.07, lon: 72.87 },
  { name: "Singapore", lat: 1.35, lon: 103.82 },
  { name: "Tokyo", lat: 35.68, lon: 139.69 },
  { name: "London", lat: 51.51, lon: -0.12 },
  { name: "Frankfurt", lat: 50.11, lon: 8.68 },
  { name: "New York", lat: 40.71, lon: -74.01 },
  { name: "San Francisco", lat: 37.77, lon: -122.42 },
  { name: "Dubai", lat: 25.20, lon: 55.27 },
];

export const AICore: React.FC<AICoreProps> = ({
  mode = "welcome",
  className,
  size = 360,
  showExchangeChips = false,
  exchangeNetText = "₹12.48L Net",
  exchangeGrossText = "₹12.40L Gross",
  exchangeInsightsText = "10+ Insights",
  exchangeFeaturesText = "109+ Features",
  exchangeKpisText = "10",
  exchangeSolvedText = "1899+ Solved",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const isExchange = mode === "exchange" || showExchangeChips;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || !ctx.createRadialGradient) return;

    let animId: number;
    let angle = 0;
    let pulsePhase = 0;
    let isVisible = true;

    // High-DPI Sharpness
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    observer.observe(canvas);

    // Pre-generate 3D Orbiting Cloud Particles
    const particles = Array.from({ length: 32 }, (_, i) => {
      const theta = (i / 32) * Math.PI * 2;
      const phi = ((i % 5) - 2) * 0.38;
      const dist = 1.12 + (i % 4) * 0.11;
      const speedMult = 0.8 + ((i % 3) * 0.35);
      return { theta, phi, dist, speedMult, baseRadius: 1.2 + (i % 3) * 0.9 };
    });

    const render = () => {
      if (isVisible) {
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, size, size);

        const center = size / 2;
        const R = size * 0.34; // Globe sphere radius (~150px for size=440)
        const tilt = 0.38; // 21.8 degrees axial tilt

        const speed = mode === "thinking" ? 0.024 : mode === "exchange" ? 0.009 : mode === "hero" ? 0.012 : 0.007;
        if (!shouldReduceMotion) {
          angle += speed;
          pulsePhase += 0.035;
        }

        // Helper 3D Projection with Axial Tilt
        const project3D = (x: number, y: number, z: number) => {
          // Tilt along Z-axis (Earth tilt)
          const cosT = Math.cos(tilt);
          const sinT = Math.sin(tilt);
          const xT = x * cosT - y * sinT;
          const yT = x * sinT + y * cosT;
          const zT = z;
          return {
            px: center + xT,
            py: center + yT,
            pz: zT,
          };
        };

        // 1. Pedestal Bottom Reflection / Holographic Base Grid
        const gradPedestal = ctx.createRadialGradient(center, center + size * 0.38, 5, center, center + size * 0.38, size * 0.44);
        gradPedestal.addColorStop(0, "rgba(255, 122, 26, 0.45)");
        gradPedestal.addColorStop(0.4, "rgba(255, 154, 60, 0.18)");
        gradPedestal.addColorStop(0.8, "rgba(255, 180, 80, 0.05)");
        gradPedestal.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradPedestal;
        ctx.beginPath();
        ctx.ellipse(center, center + size * 0.38, size * 0.42, size * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Deep Outer Atmospheric Corona & Backglow
        const gradCorona = ctx.createRadialGradient(center, center, R * 0.85, center, center, R * 1.55);
        gradCorona.addColorStop(0, "rgba(255, 122, 26, 0.32)");
        gradCorona.addColorStop(0.4, "rgba(255, 154, 60, 0.15)");
        gradCorona.addColorStop(0.7, "rgba(255, 180, 90, 0.06)");
        gradCorona.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradCorona;
        ctx.beginPath();
        ctx.arc(center, center, R * 1.55, 0, Math.PI * 2);
        ctx.fill();

        // 3. Back-side 3D Orbiting Particles (z < 0)
        particles.forEach((p) => {
          const currentTheta = p.theta + angle * p.speedMult;
          const pxRaw = R * p.dist * Math.cos(p.phi) * Math.sin(currentTheta);
          const pyRaw = -R * p.dist * Math.sin(p.phi);
          const pzRaw = R * p.dist * Math.cos(p.phi) * Math.cos(currentTheta);
          const { px, py, pz } = project3D(pxRaw, pyRaw, pzRaw);

          if (pz < 0) {
            ctx.fillStyle = "rgba(255, 170, 80, 0.28)";
            ctx.beginPath();
            ctx.arc(px, py, p.baseRadius * 0.75, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // 4. Outer 3D Gyro Ring 1 (Inclined Orbit)
        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(angle * 0.45);
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = "rgba(255, 154, 60, 0.32)";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#FF7A1A";
        ctx.beginPath();
        ctx.ellipse(0, 0, R * 1.38, R * 0.58, Math.PI / 4, 0, Math.PI * 2);
        ctx.stroke();

        // Satellite Orb on Ring 1
        const satAngle = angle * 1.6;
        const satX = Math.cos(satAngle) * (R * 1.38);
        const satY = Math.sin(satAngle) * (R * 0.58);
        const rotSatX = satX * Math.cos(Math.PI / 4) - satY * Math.sin(Math.PI / 4);
        const rotSatY = satX * Math.sin(Math.PI / 4) + satY * Math.cos(Math.PI / 4);
        ctx.fillStyle = "#FFF4EA";
        ctx.shadowBlur = 14;
        ctx.shadowColor = "#FFAA44";
        ctx.beginPath();
        ctx.arc(rotSatX, rotSatY, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 5. Outer 3D Gyro Ring 2 (Counter-Inclined Orbit)
        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(-angle * 0.6);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "rgba(255, 180, 90, 0.26)";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#FF7A1A";
        ctx.beginPath();
        ctx.ellipse(0, 0, R * 1.28, R * 0.50, -Math.PI / 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 6. Equatorial Outer Caliper Ring (Horizontal with tick marks)
        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(angle * 0.2);
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = "rgba(255, 154, 60, 0.24)";
        ctx.beginPath();
        ctx.ellipse(0, 0, R * 1.45, R * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 7. Core 3D Solid Shading Sphere (Deep Physical Volume)
        // Light key offset to top-left (-0.3 R, -0.3 R)
        const lightX = center - R * 0.32;
        const lightY = center - R * 0.32;
        const gradCore = ctx.createRadialGradient(lightX, lightY, R * 0.05, center, center, R);
        gradCore.addColorStop(0, "#FFFDF5"); // Brilliant specular highlight
        gradCore.addColorStop(0.18, "#FED7AA"); // Warm amber specular envelope
        gradCore.addColorStop(0.48, "#FB923C"); // Vibrant molten orange body
        gradCore.addColorStop(0.74, "#EA580C"); // Deep brand orange
        gradCore.addColorStop(0.88, "#9A3412"); // Deep mantle terminator
        gradCore.addColorStop(0.97, "#2A0E05"); // Shadow hemisphere
        gradCore.addColorStop(1.0, "#0E0502"); // Deep space nightside

        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, R, 0, Math.PI * 2);
        ctx.fillStyle = gradCore;
        ctx.shadowBlur = 28;
        ctx.shadowColor = "#FF7A1A";
        ctx.fill();

        // Inner Ambient Rim Light on Shadow Hemisphere (Atmospheric Bounce)
        const gradRim = ctx.createRadialGradient(center + R * 0.35, center + R * 0.35, R * 0.4, center, center, R);
        gradRim.addColorStop(0, "rgba(0, 0, 0, 0)");
        gradRim.addColorStop(0.8, "rgba(255, 122, 26, 0.0)");
        gradRim.addColorStop(1, "rgba(255, 160, 60, 0.35)");
        ctx.fillStyle = gradRim;
        ctx.beginPath();
        ctx.arc(center, center, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 8. 3D Spherical Latitude & Longitude Orthographic Grid Lines
        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, R, 0, Math.PI * 2);
        ctx.clip(); // Clip strictly inside the sphere boundary

        // 8a. Parallels (Latitudes)
        const latitudes = [-60, -35, 0, 35, 60];
        latitudes.forEach((latDeg) => {
          const latRad = (latDeg * Math.PI) / 180;
          const isEquator = latDeg === 0;
          ctx.lineWidth = isEquator ? 1.4 : 0.9;
          ctx.strokeStyle = isEquator ? "rgba(255, 255, 255, 0.55)" : "rgba(255, 220, 180, 0.32)";

          ctx.beginPath();
          let started = false;
          // Step through longitude from 0 to 2*PI
          for (let lonDeg = 0; lonDeg <= 360; lonDeg += 6) {
            const lonRad = (lonDeg * Math.PI) / 180 + angle;
            const xRaw = R * Math.cos(latRad) * Math.sin(lonRad);
            const yRaw = -R * Math.sin(latRad);
            const zRaw = R * Math.cos(latRad) * Math.cos(lonRad);
            const { px, py, pz } = project3D(xRaw, yRaw, zRaw);

            if (pz > 0) {
              if (!started) {
                ctx.moveTo(px, py);
                started = true;
              } else {
                ctx.lineTo(px, py);
              }
            } else {
              started = false;
            }
          }
          ctx.stroke();
        });

        // 8b. Meridians (Longitudes every 30 degrees)
        for (let m = 0; m < 12; m++) {
          const baseLonRad = (m * Math.PI) / 6;
          const currentLonRad = baseLonRad + angle;
          ctx.lineWidth = m % 3 === 0 ? 1.3 : 0.85;
          ctx.strokeStyle = m % 3 === 0 ? "rgba(255, 255, 255, 0.48)" : "rgba(255, 210, 160, 0.28)";

          ctx.beginPath();
          let started = false;
          for (let latDeg = -85; latDeg <= 85; latDeg += 5) {
            const latRad = (latDeg * Math.PI) / 180;
            const xRaw = R * Math.cos(latRad) * Math.sin(currentLonRad);
            const yRaw = -R * Math.sin(latRad);
            const zRaw = R * Math.cos(latRad) * Math.cos(currentLonRad);
            const { px, py, pz } = project3D(xRaw, yRaw, zRaw);

            if (pz > 0) {
              if (!started) {
                ctx.moveTo(px, py);
                started = true;
              } else {
                ctx.lineTo(px, py);
              }
            } else {
              started = false;
            }
          }
          ctx.stroke();
        }

        // 9. 3D Global Business Data Hubs (Pulsing Beacons)
        GLOBAL_HUBS.forEach((hub, idx) => {
          const latRad = (hub.lat * Math.PI) / 180;
          const lonRad = (hub.lon * Math.PI) / 180 + angle;
          const xRaw = R * Math.cos(latRad) * Math.sin(lonRad);
          const yRaw = -R * Math.sin(latRad);
          const zRaw = R * Math.cos(latRad) * Math.cos(lonRad);
          const { px, py, pz } = project3D(xRaw, yRaw, zRaw);

          // Only render hubs facing the camera (pz > 0)
          if (pz > 15) {
            const depthFactor = pz / R; // 0 to 1
            const pulse = (Math.sin(pulsePhase + idx * 0.9) + 1) / 2; // 0 to 1

            // Beacon Node Core
            ctx.fillStyle = "#FFFFFF";
            ctx.shadowBlur = 12;
            ctx.shadowColor = "#FF7A1A";
            ctx.beginPath();
            ctx.arc(px, py, 2.5 + depthFactor * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Pulsing Ring Beacon
            ctx.strokeStyle = `rgba(255, 170, 70, ${0.7 * (1 - pulse) * depthFactor})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(px, py, 3 + pulse * 9 * depthFactor, 0, Math.PI * 2);
            ctx.stroke();

            // Subtle City Tag for Prime Nodes (Mumbai, Tokyo, New York, London)
            if (depthFactor > 0.65 && (idx === 0 || idx === 2 || idx === 3 || idx === 5)) {
              ctx.font = "bold 9px 'Inter', sans-serif";
              ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
              ctx.shadowBlur = 6;
              ctx.shadowColor = "#000000";
              ctx.fillText(hub.name, px + 7, py - 3);
            }
          }
        });

        ctx.restore(); // End Sphere Clip

        // 10. Front-side 3D Orbiting Particles (z > 0)
        particles.forEach((p) => {
          const currentTheta = p.theta + angle * p.speedMult;
          const pxRaw = R * p.dist * Math.cos(p.phi) * Math.sin(currentTheta);
          const pyRaw = -R * p.dist * Math.sin(p.phi);
          const pzRaw = R * p.dist * Math.cos(p.phi) * Math.cos(currentTheta);
          const { px, py, pz } = project3D(pxRaw, pyRaw, pzRaw);

          if (pz >= 0) {
            const zNorm = pz / (R * 1.4);
            ctx.fillStyle = `rgba(255, 235, 205, ${0.45 + zNorm * 0.55})`;
            ctx.shadowBlur = 8;
            ctx.shadowColor = "#FF9A3C";
            ctx.beginPath();
            ctx.arc(px, py, p.baseRadius * (0.9 + zNorm * 0.5), 0, Math.PI * 2);
            ctx.fill();
          }
        });

        ctx.restore(); // Restore scale
      }

      if (!shouldReduceMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, [mode, size, shouldReduceMotion, isExchange]);

  return (
    <div
      className={cn("relative flex items-center justify-center select-none", className)}
      style={{ width: isExchange ? Math.max(size, 460) : size, height: size }}
      role="img"
      aria-label="BizLens 3D Intelligence Globe Core"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full drop-shadow-[0_20px_50px_rgba(255,122,26,0.22)]"
      />

      {/* Center Welcome Monogram & Text Overlay for Exchange/Welcome Modes */}
      {isExchange && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 text-center px-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-orange to-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-glowMd border-2 border-white/40 mb-1.5 animate-pulse">
            P
          </div>
          <div className="text-sm font-extrabold text-[#FFF4EA] drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
            Piyush's Welcome!
          </div>
          <div className="text-[10px] text-amber-200/90 font-semibold max-w-[150px] leading-tight mt-0.5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            Verified Lineage • DuckDB
          </div>
        </div>
      )}

      {/* 6 Orbiting Glass Chips for Exchange Mode (Master Collage compatibility) */}
      {isExchange && (
        <>
          {/* Top Left: Net Revenue */}
          <div className="absolute top-4 left-0 sm:left-4 bg-[#0E0B09]/95 backdrop-blur-md border border-brand-orange/40 rounded-xl px-3 py-1.5 shadow-glowSm text-left z-20">
            <span className="text-[9px] uppercase font-bold text-text-muted block">Sample Data</span>
            <span className="text-xs font-mono font-bold text-brand-orange tabular-nums">{exchangeNetText}</span>
          </div>

          {/* Bottom Left: Gross Output */}
          <div className="absolute bottom-4 left-0 sm:left-4 bg-[#0E0B09]/95 backdrop-blur-md border border-brand-orange/40 rounded-xl px-3 py-1.5 shadow-glowSm text-left z-20">
            <span className="text-[9px] uppercase font-bold text-text-muted block">Gross Output</span>
            <span className="text-xs font-mono font-bold text-[#FFF4EA] tabular-nums">{exchangeGrossText}</span>
          </div>

          {/* Far Left: Insights */}
          <div className="absolute top-1/2 -translate-y-1/2 left-[-10px] sm:left-1 bg-[#0E0B09]/95 backdrop-blur-md border border-brand-orange/35 rounded-xl px-2.5 py-1 shadow-glowSm text-center z-20">
            <span className="text-xs font-bold text-brand-orange">{exchangeInsightsText}</span>
            <span className="text-[8px] uppercase tracking-wider text-text-muted block">Insights</span>
          </div>

          {/* Top Right: Features */}
          <div className="absolute top-4 right-0 sm:right-4 bg-[#0E0B09]/95 backdrop-blur-md border border-brand-orange/40 rounded-xl px-3 py-1.5 shadow-glowSm text-right z-20">
            <span className="text-[9px] uppercase font-bold text-text-muted block">Capabilities</span>
            <span className="text-xs font-mono font-bold text-brand-orange tabular-nums">{exchangeFeaturesText}</span>
          </div>

          {/* Far Right: KPIs Circle */}
          <div className="absolute top-1/2 -translate-y-1/2 right-[-10px] sm:right-1 bg-[#0E0B09]/95 backdrop-blur-md border border-brand-orange/35 rounded-xl px-2.5 py-1 shadow-glowSm text-center z-20 flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-brand-orange/20 border border-brand-orange text-brand-orange font-bold text-[11px] flex items-center justify-center font-mono">
              {exchangeKpisText}
            </div>
            <span className="text-[8px] uppercase tracking-wider text-text-muted mt-0.5">KPIs</span>
          </div>

          {/* Bottom Right: Solved */}
          <div className="absolute bottom-4 right-0 sm:right-4 bg-[#0E0B09]/95 backdrop-blur-md border border-brand-orange/40 rounded-xl px-3 py-1.5 shadow-glowSm text-right z-20">
            <span className="text-[9px] uppercase font-bold text-status-positive block">Audited</span>
            <span className="text-xs font-mono font-bold text-[#FFF4EA] tabular-nums">{exchangeSolvedText}</span>
          </div>
        </>
      )}
    </div>
  );
};
