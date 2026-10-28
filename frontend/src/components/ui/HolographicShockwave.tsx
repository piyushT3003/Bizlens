import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ShockwaveParticle {
  dx: number;
  dy: number;
  dz: number;
  variantClass: string;
}

interface ActiveWave {
  id: number;
  x: number;
  y: number;
  tiltX: number;
  tiltY: number;
  rotateZ: number;
  particles: ShockwaveParticle[];
}

const PARTICLE_VARIANTS = [
  "holo-particle-orange",
  "holo-particle-ember",
  "holo-particle-amber",
  "holo-particle-gold",
  "holo-particle-flame",
  "holo-particle-white",
] as const;

export const HolographicShockwaveOverlay: React.FC = () => {
  const [waves, setWaves] = useState<ActiveWave[]>([]);
  const nextIdRef = useRef(0);
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | PointerEvent) => {
      // Check if user explicitly turned off motion in BizLens settings
      if (typeof document !== "undefined" && document.documentElement.getAttribute("data-motion") === "off") {
        return;
      }

      // Trigger on primary click (left mouse button) or touch/pen tap
      if (e.button !== 0 && "pointerType" in e && (e as PointerEvent).pointerType === "mouse") return;
      if (e.button !== 0 && !("pointerType" in e)) return;

      const x = e.clientX;
      const y = e.clientY;
      const id = ++nextIdRef.current;

      // Dynamic 3D perspective orientation based on viewport location
      const normX = x / Math.max(window.innerWidth, 1) - 0.5; // -0.5 to 0.5
      const normY = y / Math.max(window.innerHeight, 1) - 0.5; // -0.5 to 0.5

      const tiltX = 42 + normY * 18; // 33deg to 51deg
      const tiltY = -normX * 24;     // -12deg to +12deg
      const rotateZ = (id * 37) % 60 - 30; // -30deg to +30deg jitter

      // Generate 6 micro quantum photons
      const particles: ShockwaveParticle[] = Array.from({ length: 6 }).map((_, i) => {
        const baseAngle = (i * Math.PI) / 3; // 60 deg steps
        const jitter = (Math.random() - 0.5) * 0.45;
        const angle = baseAngle + jitter;
        const dist = 55 + Math.random() * 45; // 55px to 100px travel
        return {
          dx: Math.round(Math.cos(angle) * dist),
          dy: Math.round(Math.sin(angle) * dist),
          dz: Math.round((Math.random() - 0.3) * 60),
          variantClass: PARTICLE_VARIANTS[i % PARTICLE_VARIANTS.length],
        };
      });

      const newWave: ActiveWave = {
        id,
        x,
        y,
        tiltX,
        tiltY,
        rotateZ,
        particles,
      };

      // Cap to 12 active waves maximum to preserve 60/120fps under rapid clicking
      setWaves((prev) => {
        const trimmed = prev.length >= 12 ? prev.slice(prev.length - 11) : prev;
        return [...trimmed, newWave];
      });

      // Automatically prune wave after animation completes (650ms)
      const timeout = setTimeout(() => {
        setWaves((prev) => prev.filter((w) => w.id !== id));
        timeoutsRef.current.delete(id);
      }, 650);

      timeoutsRef.current.set(id, timeout);
    };

    // Use capture phase so all clicks across cards, buttons, drawers trigger reliably
    window.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
      passive: true,
    });

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current.clear();
    };
  }, []);

  if (waves.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden select-none"
      aria-hidden="true"
    >
      {waves.map((wave) => (
        <div
          key={wave.id}
          className="holo-shockwave-container"
          style={{
            left: `${wave.x}px`,
            top: `${wave.y}px`,
          }}
        >
          <div
            className="holo-shockwave-disk"
            style={{
              transform: `translate(-50%, -50%) rotateX(${wave.tiltX}deg) rotateY(${wave.tiltY}deg) rotateZ(${wave.rotateZ}deg)`,
            }}
          >
            {/* 1. The Impact Singularity Core Flash */}
            <div className="holo-center-flash" />

            {/* 2. Primary 3D Holographic Ring */}
            <div className="holo-ring-primary" />

            {/* 3. Secondary Holographic Echo Wave */}
            <div className="holo-ring-echo" />

            {/* 4. Tertiary Core Amber Wave */}
            <div className="holo-ring-core" />

            {/* 5. Holographic Target Reticle Diamond */}
            <div className="holo-reticle-diamond" />

            {/* 6. Holographic Crosshair Beams */}
            <div className="holo-spine-x" />
            <div className="holo-spine-y" />

            {/* 7. Quantum Spark Photons */}
            {wave.particles.map((p, idx) => (
              <div
                key={idx}
                className={cn("holo-quantum-particle", p.variantClass)}
                style={
                  {
                    "--p-dx": `${p.dx}px`,
                    "--p-dy": `${p.dy}px`,
                    "--p-dz": `${p.dz}px`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
