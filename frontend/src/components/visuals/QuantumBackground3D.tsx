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

const TERRAIN_VERTEX_SHADER = `
  varying vec3 vWorldPos;
  varying float vElevation;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vElevation = worldPos.y;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const TERRAIN_FRAGMENT_SHADER = `
  uniform vec3 uColorPrimary;
  uniform vec3 uColorGlow;
  uniform float uBaseAlpha;
  uniform float uIsStrong;
  varying vec3 vWorldPos;
  varying float vElevation;

  void main() {
    // Horizon depth fade (dissolves cleanly into infinity)
    float depthFade = smoothstep(-14.5, -1.5, vWorldPos.z) * smoothstep(9.5, 2.0, vWorldPos.z);

    // Lateral wing vignette
    float sideFade = 1.0 - smoothstep(6.0, 17.0, abs(vWorldPos.x));

    // Elevate luminescence on wave crests
    float crestBoost = clamp((vElevation + 3.4) * 0.85, 0.0, 1.0);
    vec3 col = mix(uColorPrimary, uColorGlow, crestBoost * 0.72);

    // Attenuate wireframe density behind upper-left hero typography for crisp legibility
    float heroReadZoneFade = mix(1.0, smoothstep(-9.0, 2.5, vWorldPos.x) * 0.78 + 0.22, uIsStrong);

    float alpha = uBaseAlpha * depthFade * sideFade * heroReadZoneFade * (0.65 + crestBoost * 0.75);
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.55));
  }
`;

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
      const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 100);
      camera.position.set(0, 3.0, 11.8);
      camera.lookAt(0, -1.1, 0);

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
      const isStrong = intensity === "strong";

      // 1. Cinema-Grade GLSL Horizon Shader Terrain
      const segX = 52;
      const segZ = 34;
      const planeGeo = new THREE.PlaneGeometry(36, 24, segX, segZ);
      planeGeo.rotateX(-Math.PI / 2.22);

      const basePositions = new Float32Array(planeGeo.attributes.position.array.length);
      basePositions.set(planeGeo.attributes.position.array);

      const wireMat = new THREE.ShaderMaterial({
        vertexShader: TERRAIN_VERTEX_SHADER,
        fragmentShader: TERRAIN_FRAGMENT_SHADER,
        wireframe: true,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uColorPrimary: { value: new THREE.Color(isLight ? 0xea580c : 0xff7a1a) },
          uColorGlow: { value: new THREE.Color(isLight ? 0xf59e0b : 0xffb347) },
          uBaseAlpha: { value: isStrong ? (isLight ? 0.16 : 0.24) : (isLight ? 0.08 : 0.11) },
          uIsStrong: { value: isStrong ? 1.0 : 0.0 },
        },
      });
      const terrainMesh = new THREE.Mesh(planeGeo, wireMat);
      terrainMesh.position.set(0, -3.25, -3.2);
      scene.add(terrainMesh);

      // 2. Soft Radial Bokeh Ember Sprite Texture
      const spriteCanvas = document.createElement("canvas");
      spriteCanvas.width = 64;
      spriteCanvas.height = 64;
      const sCtx = spriteCanvas.getContext("2d");
      if (sCtx) {
        const g = sCtx.createRadialGradient(32, 32, 1, 32, 32, 30);
        g.addColorStop(0, "rgba(255, 248, 240, 1)");
        g.addColorStop(0.22, "rgba(255, 179, 71, 0.88)");
        g.addColorStop(0.6, "rgba(255, 122, 26, 0.30)");
        g.addColorStop(1, "rgba(255, 122, 26, 0)");
        sCtx.fillStyle = g;
        sCtx.fillRect(0, 0, 64, 64);
      }
      const particleTex = new THREE.CanvasTexture(spriteCanvas);

      // 3. True Z-Depth Volumetric Energy Particles
      const particleCount = isStrong ? 95 : 60;
      const pGeo = new THREE.BufferGeometry();
      const pPos = new Float32Array(particleCount * 3);
      const pSpeeds = new Float32Array(particleCount);
      for (let i = 0; i < particleCount; i++) {
        pPos[i * 3] = (Math.random() - 0.5) * 28;
        pPos[i * 3 + 1] = (Math.random() - 0.35) * 11;
        pPos[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2;
        pSpeeds[i] = 0.22 + Math.random() * 0.55;
      }
      pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));

      const pMat = new THREE.PointsMaterial({
        size: isStrong ? 0.30 : 0.22,
        map: particleTex,
        transparent: true,
        opacity: isStrong ? (isLight ? 0.45 : 0.68) : (isLight ? 0.25 : 0.40),
        depthWrite: false,
        blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      });
      const particles = new THREE.Points(pGeo, pMat);
      scene.add(particles);

      // 4. Delicate Orbital Horizon Arc
      const ringGeo = new THREE.TorusGeometry(5.2, 0.014, 12, 112);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffb347,
        transparent: true,
        opacity: isStrong ? (isLight ? 0.10 : 0.16) : (isLight ? 0.05 : 0.08),
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(4.8, 1.5, -8.2);
      ring.rotation.x = Math.PI / 2.7;
      ring.rotation.y = 0.35;
      scene.add(ring);

      const targetPointer = { x: 0, y: 0 };
      const currentPointer = { x: 0, y: 0 };
      const onPointerMove = (e: MouseEvent) => {
        targetPointer.x = (e.clientX / window.innerWidth - 0.5) * 1.15;
        targetPointer.y = (e.clientY / window.innerHeight - 0.5) * 0.65;
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

        currentPointer.x += (targetPointer.x - currentPointer.x) * 0.035;
        currentPointer.y += (targetPointer.y - currentPointer.y) * 0.035;
        camera.position.x = currentPointer.x;
        camera.position.y = 3.0 - currentPointer.y;
        camera.lookAt(0, -1.1, 0);

        const posAttr = planeGeo.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          const bx = basePositions[i];
          const bz = basePositions[i + 2];
          arr[i + 1] =
            basePositions[i + 1] +
            Math.sin(bx * 0.38 + t * 0.78) * 0.44 +
            Math.cos(bz * 0.34 + t * 0.62) * 0.38;
        }
        posAttr.needsUpdate = true;

        const pArr = pGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          pArr[i * 3 + 1] += 0.004 * pSpeeds[i];
          pArr[i * 3] += Math.sin(t * 0.28 + i) * 0.0018;
          if (pArr[i * 3 + 1] > 7.5) {
            pArr[i * 3 + 1] = -3.8;
          }
        }
        pGeo.attributes.position.needsUpdate = true;

        ring.rotation.z = t * 0.06;

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
