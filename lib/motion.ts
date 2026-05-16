import { Transition, Variants } from "framer-motion";

export const SPRING: Transition = {
  type: "spring",
  stiffness: 120,
  damping: 18,
  mass: 0.6,
};

export const CARD_SPRING: Transition = {
  type: "spring",
  stiffness: 90,
  damping: 20,
};

export const STEP_TRANSITION: Transition = {
  duration: 0.45,
  ease: [0.22, 1, 0.36, 1],
};

export const STAGGER_CONTAINER: Variants = {
  hidden: {},

  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

export const FADE_UP: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
    filter: "blur(10px)",
  },

  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",

    transition: STEP_TRANSITION,
  },

  exit: {
    opacity: 0,
    y: -10,
    filter: "blur(10px)",

    transition: STEP_TRANSITION,
  },
};