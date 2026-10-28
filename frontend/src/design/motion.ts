import { Transition, Variants } from "framer-motion";

/**
 * BIZLENS PART AA MOTION PRESET CATALOG
 * Strict adherence to transform/opacity rules, 250ms UI transitions, and reduced-motion fallbacks.
 */

export const standardEase = [0.22, 1, 0.36, 1] as const;
export const smoothCardEase = [0.16, 1, 0.3, 1] as const;

export const motionTransitions = {
  revealUp: {
    duration: 0.6,
    ease: standardEase,
  },
  listReveal: {
    duration: 0.35,
    ease: "easeOut",
  },
  press: {
    duration: 0.12,
    ease: "easeOut",
  },
  pageTransition: {
    duration: 0.38,
    ease: smoothCardEase,
  },
  flipCardEnter: {
    duration: 0.38,
    ease: smoothCardEase,
  },
  flipCardExit: {
    duration: 0.18,
    ease: [0.36, 0, 0.66, 0],
  },
  navIndicator: {
    type: "spring",
    stiffness: 380,
    damping: 30,
  },
  modalSpring: {
    type: "spring",
    stiffness: 320,
    damping: 26,
  },
  popoverSpring: {
    type: "spring",
    stiffness: 400,
    damping: 28,
  },
  toastIn: {
    type: "spring",
    stiffness: 350,
    damping: 25,
  },
} satisfies Record<string, Transition>;

export const motionVariants: Record<string, Variants> = {
  revealUp: {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: motionTransitions.revealUp },
  },
  listRevealItem: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: motionTransitions.listReveal },
  },
  flipCard: {
    initial: (direction: number = 1) => ({
      opacity: 0,
      rotateY: direction >= 0 ? -75 : 75,
      z: -100,
      scale: 0.94,
      transformOrigin: "center center",
    }),
    animate: {
      opacity: 1,
      rotateY: 0,
      z: 0,
      scale: 1,
      transformOrigin: "center center",
      transition: {
        duration: 0.38,
        ease: smoothCardEase,
      },
    },
    exit: (direction: number = 1) => ({
      opacity: 0,
      rotateY: direction >= 0 ? 75 : -75,
      z: -100,
      scale: 0.94,
      transformOrigin: "center center",
      transition: {
        duration: 0.18,
        ease: [0.36, 0, 0.66, 0],
      },
    }),
  },
  pageTransition: {
    initial: (direction: number = 1) => ({
      opacity: 0,
      rotateY: direction >= 0 ? -75 : 75,
      z: -100,
      scale: 0.94,
      transformOrigin: "center center",
    }),
    animate: {
      opacity: 1,
      rotateY: 0,
      z: 0,
      scale: 1,
      transformOrigin: "center center",
      transition: {
        duration: 0.38,
        ease: smoothCardEase,
      },
    },
    exit: (direction: number = 1) => ({
      opacity: 0,
      rotateY: direction >= 0 ? 75 : -75,
      z: -100,
      scale: 0.94,
      transformOrigin: "center center",
      transition: {
        duration: 0.18,
        ease: [0.36, 0, 0.66, 0],
      },
    }),
  },
  messageIn: {
    initial: { opacity: 0, y: 8, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: "easeOut" } },
  },
  chipPop: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 450, damping: 25 } },
  },
  modalContent: {
    hidden: { opacity: 0, scale: 0.95, y: 12 },
    visible: { opacity: 1, scale: 1, y: 0, transition: motionTransitions.modalSpring },
    exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.15 } },
  },
  drawerRight: {
    hidden: { x: "100%", opacity: 0.5 },
    visible: { x: 0, opacity: 1, transition: motionTransitions.modalSpring },
    exit: { x: "100%", opacity: 0.5, transition: { duration: 0.2 } },
  },
  drawerLeft: {
    hidden: { x: "-100%", opacity: 0.5 },
    visible: { x: 0, opacity: 1, transition: motionTransitions.modalSpring },
    exit: { x: "-100%", opacity: 0.5, transition: { duration: 0.2 } },
  },
};
