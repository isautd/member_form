"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export default function StepWrapper({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
      className="flex w-full flex-col items-center gap-6 text-center"
    >
      {children}
    </motion.div>
  );
}