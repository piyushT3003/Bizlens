import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/hooks/useTheme";

export interface QuantumBackground3DProps {
  intensity?: "subtle" | "strong";
  className?: string;
}

function canUseWebGL(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  // Skip in jsdom automated test runners
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

export const QuantumBackground3D: React.FC<QuantumBackground3DProps> = ({
  intensity = "subtle",
  className,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const { theme } = useThemeStore();

  useEffect(() => {
    const container = mountRef.current;
    if (!container || shouldReduceMotion || !canUseWebGL()) return;

    const isMotionDisabled =
      typeof document !== "undefined" &&
      document.documentElement.getAttribute("data-motion") === "off";
    if (isMotionDisabled) return;

    let animId = 0;
    let renderer: THREE.WebGLRenderer | null = null;

    try {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
      camera.position.set(0, 3.2, 11.5);
      camera.lookAt(0, -0.8, 0);

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);

      const isLight = theme === "light";
      const opacityBoost = intensity === "strong" ? 1.55 : 1.0;

      // 1. Undulating 3D Perspective Wireframe Neural Terrain
      const segX = 44;
      const segZ = 28;
      const planeGeo = new THREE.PlaneGeometry(34, 22, segX, segZ);
      planeGeo.rotateX(-Math.PI / 2.25);

      const basePositions = new Float32Array(planeGeo.attributes.position.array.length);
      basePositions.set(planeGeo.attributes.position.array);

      const wireMat = new THREE.MeshBasicMaterial({
        color: isLight ? 0xea580c : 0xff7a1a,
        wireframe: true,
        transparent: true,
        opacity: Math.min(0.32, (isLight ? 0.08 : 0.13) * opacityBoost),
      });
      const terrainMesh = new THREE.Mesh(planeGeo, wireMat);
      terrainMesh.position.set(0, -3.1, -3.0);
      scene.add(terrainMesh);

      // 2. Soft Circular Ember Particle Texture
      const spriteCanvas = document.createElement("canvas");
      spriteCanvas.width = 64;
      spriteCanvas.height = 64;
      const sCtx = spriteCanvas.getContext("2d");
      if (sCtx) {
        const g = sCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
        g.addColorStop(0, "rgba(255, 244, 234, 1)");
        g.addColorStop(0.28, "rgba(255, 179, 71, 0.85)");
        g.addColorStop(0.65, "rgba(255, 122, 26, 0.35)");
        g.addColorStop(1, "rgba(255, 122, 26, 0)");
        sCtx.fillStyle = g;
        sCtx.fillRect(0, 0, 64, 64);
      }
      const particleTex = new THREE.CanvasTexture(spriteCanvas);

      // 3. 3D Spatial Floating Energy Particles
      const particleCount = intensity === "strong" ? 110 : 75;
      const pGeo = new THREE.BufferGeometry();
      const pPos = new Float32Array(particleCount * 3);
      const pSpeeds = new Float32Array(particleCount);
      for (let i = 0; i < particleCount; i++) {
        pPos[i * 3] = (Math.random() - 0.5) * 26;
        pPos[i * 3 + 1] = (Math.random() - 0.3) * 11;
        pPos[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2;
        pSpeeds[i] = 0.25 + Math.random() * 0.55;
      }
      pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));

      const pMat = new THREE.PointsMaterial({
        size: intensity === "strong" ? 0.32 : 0.24,
        map: particleTex,
        transparent: true,
        opacity: Math.min(0.85, (isLight ? 0.35 : 0.55) * opacityBoost),
        depthWrite: false,
        blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      });
      const particles = new THREE.Points(pGeo, pMat);
      scene.add(particles);

      // 4. Subtle Elevated Orbital Wireframe Ring in Background Depth
      const ringGeo = new THREE.TorusGeometry(4.8, 0.018, 12, 96);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffb347,
        transparent: true,
        opacity: Math.min(0.28, (isLight ? 0.08 : 0.14) * opacityBoost),
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(4.5, 1.4, -7.5);
      ring.rotation.x = Math.PI / 2.8;
      ring.rotation.y = 0.35;
      scene.add(ring);

      // Pointer parallax tracking
      const targetPointer = { x: 0, y: 0 };
      const currentPointer = { x: 0, y: 0 };
      const onPointerMove = (e: MouseEvent) => {
        targetPointer.x = (e.clientX / window.innerWidth - 0.5) * 1.4;
        targetPointer.y = (e.clientY / window.innerHeight - 0.5) * 0.8;
      };
      window.addEventListener("mousemove", onPointerMove, { passive: true });

      const onResize = () => {
        if (!container || !renderer) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize);

      const clock = new THREE.Clock();

      const animate = () => {
        animId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        // Smooth camera parallax
        currentPointer.x += (targetPointer.x - currentPointer.x) * 0.04;
        currentPointer.y += (targetPointer.y - currentPointer.y) * 0.04;
        camera.position.x = currentPointer.x;
        camera.position.y = 3.2 - currentPointer.y;
        camera.lookAt(0, -0.8, 0);

        // Animate terrain wave vertices
        const posAttr = planeGeo.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          const bx = basePositions[i];
          const bz = basePositions[i + 2];
          arr[i + 1] =
            basePositions[i + 1] +
            Math.sin(bx * 0.42 + t * 0.9) * 0.42 +
            Math.cos(bz * 0.38 + t * 0.7) * 0.36;
        }
        posAttr.needsUpdate = true;

        // Drift 3D particles gently upward
        const pArr = pGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          pArr[i * 3 + 1] += 0.0045 * pSpeeds[i];
          pArr[i * 3] += Math.sin(t * 0.3 + i) * 0.002;
          if (pArr[i * 3 + 1] > 7.5) {
            pArr[i * 3 + 1] = -3.5;
          }
        }
        pGeo.attributes.position.needsUpdate = true;

        // Slow atmospheric ring spin
        ring.rotation.z = t * 0.08;

        renderer?.render(scene, camera);
      };

      animate();

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("mousemove", onPointerMove);
        window.removeEventListener("resize", onResize);
        planeGeo.dispose();
        wireMat.dispose();
        pGeo.dispose();
        pMat.dispose();
        particleTex.dispose();
        ringGeo.dispose();
        ringMat.dispose();
        if (renderer) {
          renderer.dispose();
          if (renderer.domElement && renderer.domElement.parentNode === container) {
            container.removeChild(renderer.domElement);
          }
        }
      };
    } catch {
      // Fail safely if GPU context unavailable
      return undefined;
    }
  }, [intensity, shouldReduceMotion, theme]);

  if (shouldReduceMotion) return null;

  return (
    <div
      ref={mountRef}
      className={cn("fixed inset-0 pointer-events-none overflow-hidden z-0", className)}
      aria-hidden="true"
    />
  );
};
