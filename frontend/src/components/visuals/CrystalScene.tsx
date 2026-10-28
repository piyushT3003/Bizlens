import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "framer-motion";

export interface CrystalSceneProps {
  initial?: string;
  completionPct?: number;
  size?: number;
  className?: string;
}

export const CrystalScene: React.FC<CrystalSceneProps> = ({
  initial = "P",
  completionPct = 85,
  size = 280,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, size, size);
      const center = size / 2;
      const radius = size * 0.38;

      if (!shouldReduceMotion) {
        angle += 0.01;
      }

      // Draw wireframe geometric icosahedron / crystal polygon
      const points = [];
      const numVertices = 8;
      for (let i = 0; i < numVertices; i++) {
        const theta = (i / numVertices) * Math.PI * 2 + angle;
        const x = center + Math.cos(theta) * radius;
        const y = center + Math.sin(theta) * (radius * 0.65);
        points.push({ x, y });
      }

      // Outer Facet Glow
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = "rgba(255, 122, 26, 0.4)";
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#FF7A1A";

      // Draw facet lines
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const p3 = points[(i + 3) % points.length];

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 180, 80, 0.2)";
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(center, center);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.stroke();
      }

      // Center Core Avatar Circle
      if (typeof ctx.createRadialGradient === "function") {
        const grad = ctx.createRadialGradient(center, center, 5, center, center, size * 0.16);
        grad.addColorStop(0, "#FFB347");
        grad.addColorStop(0.7, "#FF7A1A");
        grad.addColorStop(1, "#7C2D12");
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = "#FF7A1A";
      }

      ctx.beginPath();
      ctx.arc(center, center, size * 0.16, 0, Math.PI * 2);
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#FF7A1A";
      ctx.fill();

      // Avatar Letter
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${Math.round(size * 0.14)}px Space Grotesk, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowBlur = 0;
      ctx.fillText(initial, center, center);

      if (!shouldReduceMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [initial, size, shouldReduceMotion]);

  return (
    <div
      className={cn("relative flex flex-col items-center justify-center select-none", className)}
      style={{ width: size, height: size }}
    >
      <canvas ref={canvasRef} width={size} height={size} className="w-full h-full" />
      <div className="absolute bottom-2 text-center">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          Configuration: <strong className="text-brand-orange">{completionPct}% Complete</strong>
        </span>
      </div>
    </div>
  );
};
