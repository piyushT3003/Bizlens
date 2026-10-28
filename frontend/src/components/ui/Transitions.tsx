import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { motionVariants, standardEase } from "@/design/motion";
import { cn } from "@/lib/utils";

export interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: React.ElementType;
}

export const Reveal: React.FC<RevealProps> = ({
  children,
  delay = 0,
  className,
}) => {
  const isMotionDisabled = typeof document !== "undefined" && document.documentElement.getAttribute("data-motion") === "off";

  if (isMotionDisabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={motionVariants.revealUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.6, ease: standardEase, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  direction?: number;
}

/**
 * 3D Flipping Card Navigation Panel Transition
 * Implements silky-smooth, hardware-accelerated 3D perspective rotation,
 * dynamic glare sheen, and directional flip mechanics across every navigation panel.
 */
export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className,
  direction = 1,
}) => {
  const isMotionDisabled = typeof document !== "undefined" && document.documentElement.getAttribute("data-motion") === "off";

  React.useEffect(() => {
    // When the new page card enters, ensure scroll position resets to top
    const stage = document.querySelector(".flip-card-stage.overflow-y-auto, main.overflow-y-auto");
    if (stage) {
      stage.scrollTop = 0;
    }
  }, []);

  if (isMotionDisabled) {
    return <div className={cn("w-full min-h-full", className)}>{children}</div>;
  }

  return (
    <div
      className="w-full min-h-full flip-card-stage"
      style={{
        perspective: 1400,
        WebkitPerspective: 1400,
        transformStyle: "preserve-3d",
        WebkitTransformStyle: "preserve-3d",
      }}
    >
      <motion.div
        custom={direction}
        variants={motionVariants.flipCard}
        initial="initial"
        animate="animate"
        exit="exit"
        className={cn(
          "w-full min-h-full relative flip-card-panel transform-gpu",
          className
        )}
        style={{
          transformStyle: "preserve-3d",
          WebkitTransformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
      >
        {/* 3D Panel Surface Container */}
        <div className="w-full min-h-full relative">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export const FlipCardTransition = PageTransition;
