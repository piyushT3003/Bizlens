import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "framer-motion";
import { brandTokens } from "@/design/tokens";
import { QuantumBackground3D } from "@/components/visuals/QuantumBackground3D";

export const AmbientBackground: React.FC<{ intensity?: "subtle" | "strong" }> = ({
  intensity = "subtle",
}) => {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (shouldReduceMotion) return;

    let rafId: number;
    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const x = (e.clientX / window.innerWidth - 0.5) * 38;
        const y = (e.clientY / window.innerHeight - 0.5) * 38;
        containerRef.current.style.setProperty("--px", `${x.toFixed(1)}px`);
        containerRef.current.style.setProperty("--py", `${y.toFixed(1)}px`);
        containerRef.current.style.setProperty("--nx", `${(-x * 1.2).toFixed(1)}px`);
        containerRef.current.style.setProperty("--ny", `${(-y * 1.2).toFixed(1)}px`);
        containerRef.current.style.setProperty("--cx", `${e.clientX}px`);
        containerRef.current.style.setProperty("--cy", `${e.clientY}px`);
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, [shouldReduceMotion]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* Real-time Three.js WebGL 3D Neural Terrain & Spatial Particles */}
      <QuantumBackground3D intensity={intensity} />

      {/* Interactive Volumetric Pointer Spotlight Field */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background:
            intensity === "strong"
              ? "radial-gradient(640px circle at var(--cx, 55%) var(--cy, 38%), rgba(255, 130, 35, 0.11), transparent 72%)"
              : "radial-gradient(560px circle at var(--cx, 55%) var(--cy, 38%), rgba(255, 130, 35, 0.065), transparent 70%)",
        }}
      />

      {/* Top right orange glow with 3D parallax */}
      <div
        style={{
          transform: "translate3d(var(--px, 0px), var(--py, 0px), 0)",
          transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className={cn(
          "absolute -top-32 -right-32 w-[30rem] h-[30rem] rounded-full blur-[130px] parallax-ambient-1",
          intensity === "strong"
            ? "bg-brand-orange/[0.22]"
            : "bg-brand-orange/[0.10]"
        )}
      />
      {/* Bottom left amber glow with counter parallax */}
      <div
        style={{
          transform: "translate3d(var(--nx, 0px), var(--ny, 0px), 0)",
          transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className={cn(
          "absolute -bottom-32 -left-32 w-[34rem] h-[34rem] rounded-full blur-[150px] parallax-ambient-2",
          intensity === "strong"
            ? "bg-brand-amber/[0.16]"
            : "bg-brand-amber/[0.07]"
        )}
      />
    </div>
  );
};

export const ParticleField: React.FC<{ count?: number; className?: string }> = ({
  count = 25,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let isVisible = true;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Particle pool
    const particles = Array.from({ length: count }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.8 + 0.6,
      vy: -(Math.random() * 0.4 + 0.15),
      vx: (Math.random() - 0.5) * 0.2,
      alpha: Math.random() * 0.6 + 0.2,
    }));

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    observer.observe(canvas);

    const render = () => {
      if (isVisible) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach((p) => {
          p.y += p.vy;
          p.x += p.vx;
          if (p.y < 0) {
            p.y = canvas.height;
            p.x = Math.random() * canvas.width;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 122, 26, ${p.alpha})`;
          ctx.shadowBlur = 6;
          ctx.shadowColor = brandTokens.orange;
          ctx.fill();
        });
      }
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      observer.disconnect();
    };
  }, [count, shouldReduceMotion]);

  if (shouldReduceMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 pointer-events-none -z-10", className)}
      aria-hidden="true"
    />
  );
};
