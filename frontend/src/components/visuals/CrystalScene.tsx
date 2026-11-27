import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "framer-motion";

export interface CrystalSceneProps {
  initial?: string;
  completionPct?: number;
  size?: number;
  className?: string;
}

function canUseWebGL(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent || "")) {
    return false;
  }
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export const CrystalScene: React.FC<CrystalSceneProps> = ({
  initial = "P",
  completionPct = 85,
  size = 280,
  className,
}) => {
  const webglContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [useWebGL, setUseWebGL] = useState<boolean>(() => canUseWebGL());
  const pointerHoverRef = useRef({ active: false, x: 0, y: 0 });

  // Primary Three.js WebGL 3D Crystal Scene
  useEffect(() => {
    if (!useWebGL) return;
    const container = webglContainerRef.current;
    if (!container) return;

    let animId = 0;
    let renderer: THREE.WebGLRenderer | null = null;

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
      camera.position.set(0, 0.15, 5.85);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(size, size);
      renderer.setClearColor(0x000000, 0);
      container.innerHTML = "";
      container.appendChild(renderer.domElement);

      // Lighting for Obsidian & Molten Amber Crystal
      const ambientLight = new THREE.AmbientLight(0xffd6a5, 0.7);
      scene.add(ambientLight);

      const keyLight = new THREE.PointLight(0xff7a1a, 5.5, 18);
      keyLight.position.set(2.8, 3.2, 3.8);
      scene.add(keyLight);

      const rimLight = new THREE.PointLight(0xffb347, 4.0, 15);
      rimLight.position.set(-3.2, -2.2, 2.5);
      scene.add(rimLight);

      const crystalGroup = new THREE.Group();
      scene.add(crystalGroup);

      // 1. Inner Faceted Translucent Core
      const innerGeo = new THREE.IcosahedronGeometry(1.12, 0);
      const innerMat = new THREE.MeshPhysicalMaterial({
        color: 0xff7a1a,
        emissive: 0x9a3412,
        emissiveIntensity: 0.65,
        roughness: 0.18,
        metalness: 0.35,
        transparent: true,
        opacity: 0.86,
        flatShading: true,
      });
      const innerCrystal = new THREE.Mesh(innerGeo, innerMat);
      crystalGroup.add(innerCrystal);

      // 2. Outer Crystalline Lattice Wireframe
      const outerGeo = new THREE.IcosahedronGeometry(1.42, 0);
      const edgesGeo = new THREE.EdgesGeometry(outerGeo);
      const edgesMat = new THREE.LineBasicMaterial({
        color: 0xffb347,
        transparent: true,
        opacity: 0.85,
      });
      const outerLattice = new THREE.LineSegments(edgesGeo, edgesMat);
      crystalGroup.add(outerLattice);

      // 3. Dual Gyroscope Orbit Rings
      const ring1Geo = new THREE.TorusGeometry(1.88, 0.022, 16, 80);
      const ring1Mat = new THREE.MeshBasicMaterial({
        color: 0xff9a3c,
        transparent: true,
        opacity: 0.55,
      });
      const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
      ring1.rotation.x = Math.PI / 3;
      ring1.rotation.y = Math.PI / 6;
      scene.add(ring1);

      const ring2Geo = new THREE.TorusGeometry(2.12, 0.016, 16, 90);
      const ring2Mat = new THREE.MeshBasicMaterial({
        color: 0xffd166,
        transparent: true,
        opacity: 0.38,
      });
      const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
      ring2.rotation.x = -Math.PI / 2.6;
      ring2.rotation.y = -Math.PI / 4;
      scene.add(ring2);

      // 4. Orbiting Micro Sparks
      const sparkCount = 28;
      const sparkGeo = new THREE.BufferGeometry();
      const sparkPos = new Float32Array(sparkCount * 3);
      for (let i = 0; i < sparkCount; i++) {
        const theta = (i / sparkCount) * Math.PI * 2;
        const r = 1.7 + (i % 3) * 0.25;
        sparkPos[i * 3] = Math.cos(theta) * r;
        sparkPos[i * 3 + 1] = Math.sin(i * 1.4) * 0.9;
        sparkPos[i * 3 + 2] = Math.sin(theta) * r;
      }
      sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
      const sparkMat = new THREE.PointsMaterial({
        color: 0xfff4ea,
        size: 0.09,
        transparent: true,
        opacity: 0.85,
      });
      const sparks = new THREE.Points(sparkGeo, sparkMat);
      scene.add(sparks);

      const clock = new THREE.Clock();

      const animate = () => {
        const t = clock.getElapsedTime();
        const boost = pointerHoverRef.current.active ? 2.1 : 1.0;

        if (!shouldReduceMotion) {
          crystalGroup.rotation.y += 0.009 * boost;
          crystalGroup.rotation.x = Math.sin(t * 0.7) * 0.22 + pointerHoverRef.current.y * 0.35;
          crystalGroup.rotation.z = pointerHoverRef.current.x * 0.25;
          crystalGroup.position.y = Math.sin(t * 1.6) * 0.1;

          outerLattice.rotation.y -= 0.004 * boost;
          ring1.rotation.z += 0.012 * boost;
          ring1.rotation.x = Math.PI / 3 + Math.sin(t * 0.5) * 0.15;
          ring2.rotation.z -= 0.009 * boost;
          ring2.rotation.y = -Math.PI / 4 + Math.cos(t * 0.4) * 0.15;
          sparks.rotation.y += 0.006 * boost;
        }

        renderer?.render(scene, camera);
        if (!shouldReduceMotion) {
          animId = requestAnimationFrame(animate);
        }
      };

      animate();

      return () => {
        cancelAnimationFrame(animId);
        innerGeo.dispose();
        innerMat.dispose();
        outerGeo.dispose();
        edgesGeo.dispose();
        edgesMat.dispose();
        ring1Geo.dispose();
        ring1Mat.dispose();
        ring2Geo.dispose();
        ring2Mat.dispose();
        sparkGeo.dispose();
        sparkMat.dispose();
        if (renderer) {
          renderer.dispose();
          if (renderer.domElement && renderer.domElement.parentNode === container) {
            container.removeChild(renderer.domElement);
          }
        }
      };
    } catch {
      setUseWebGL(false);
      return undefined;
    }
  }, [useWebGL, size, shouldReduceMotion]);

  // Graceful 2D Canvas Fallback when WebGL is disabled or running inside headless jsdom tests
  useEffect(() => {
    if (useWebGL) return;
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

      const points = [];
      const numVertices = 8;
      for (let i = 0; i < numVertices; i++) {
        const theta = (i / numVertices) * Math.PI * 2 + angle;
        const x = center + Math.cos(theta) * radius;
        const y = center + Math.sin(theta) * (radius * 0.65);
        points.push({ x, y });
      }

      ctx.lineWidth = 1.4;
      ctx.strokeStyle = "rgba(255, 122, 26, 0.45)";
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#FF7A1A";

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
  }, [useWebGL, initial, size, shouldReduceMotion]);

  return (
    <div
      className={cn("relative flex flex-col items-center justify-center select-none group", className)}
      style={{ width: size }}
      onMouseEnter={() => {
        pointerHoverRef.current.active = true;
      }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        pointerHoverRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        pointerHoverRef.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      }}
      onMouseLeave={() => {
        pointerHoverRef.current = { active: false, x: 0, y: 0 };
      }}
    >
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {useWebGL ? (
          <>
            {/* Atmospheric Glow Aura behind Crystal */}
            <div
              className="absolute rounded-full bg-brand-orange/20 blur-3xl pointer-events-none transition-transform duration-500 group-hover:scale-110"
              style={{ width: size * 0.58, height: size * 0.58 }}
            />
            <div ref={webglContainerRef} className="w-full h-full" />
            {/* Crisp Floating Monogram Medallion */}
            <div
              className="pointer-events-none absolute flex items-center justify-center rounded-full border border-white/30 bg-gradient-to-br from-amber-300/90 via-brand-orange/90 to-orange-900/95 text-white font-display font-bold shadow-glowMd backdrop-blur-md transition-transform duration-300 group-hover:scale-110"
              style={{
                width: Math.round(size * 0.21),
                height: Math.round(size * 0.21),
                fontSize: Math.round(size * 0.105),
              }}
            >
              {initial}
            </div>
          </>
        ) : (
          <canvas ref={canvasRef} width={size} height={size} className="w-full h-full" />
        )}
      </div>

      <div className="mt-1 px-3 py-1 rounded-full bg-surface-card/90 backdrop-blur-md border border-brand-orange/30 shadow-glowSm text-center z-10">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          Configuration: <strong className="text-brand-orange">{completionPct}% Complete</strong>
        </span>
      </div>
    </div>
  );
};
