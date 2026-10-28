import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "framer-motion";
import { brandTokens } from "@/design/tokens";

export const AmbientBackground: React.FC<{ intensity?: "subtle" | "strong" }> = ({
  intensity = "subtle",
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [parallaxOffset, setParallaxOffset] = React.useState({ x: 0, y: 0 });

  useEffect(() => {
    if (shouldReduceMotion) return;

    let rafId: number;
    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 36;
        const y = (e.clientY / window.innerHeight - 0.5) * 36;
        setParallaxOffset({ x, y });
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, [shouldReduceMotion]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
      {/* Top right orange glow with 3D parallax */}
      <div
        style={{
          transform: `translate3d(${parallaxOffset.x}px, ${parallaxOffset.y}px, 0)`,
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className={cn(
          "absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full blur-[130px] parallax-ambient-1",
          intensity === "strong"
            ? "bg-brand-orange/[0.20]"
            : "bg-brand-orange/[0.09]"
        )}
      />
      {/* Bottom left amber glow with counter parallax */}
      <div
        style={{
          transform: `translate3d(${-parallaxOffset.x * 1.2}px, ${-parallaxOffset.y * 1.2}px, 0)`,
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className={cn(
          "absolute -bottom-32 -left-32 w-[32rem] h-[32rem] rounded-full blur-[150px] parallax-ambient-2",
          intensity === "strong"
            ? "bg-brand-amber/[0.14]"
            : "bg-brand-amber/[0.06]"
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
