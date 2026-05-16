"use client";

import { motion } from "framer-motion";
import { ChangeEvent, useState } from "react";

interface Props {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  suffix?: string;
  error?: string;
  hint?: string;
  inputMode?: "text" | "numeric" | "email" | "tel" | "url" | "search" | "none" | "decimal";
}

export default function GlassInput({
  label,
  value,
  onChange,
  type = "text",
  suffix,
  error,
  hint,
  inputMode,
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <motion.div
      animate={{ scale: focused ? 1.03 : 1 }}
      transition={{ type: "spring", stiffness: 160, damping: 18 }}
      className="relative w-full"
    >
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder=" "
        className={`
          peer
          h-14
          w-full
          rounded-2xl
          border
          bg-[#1c1c1e]/80
          pt-5
          text-sm
          text-white
          outline-none
          transition-all
          placeholder-transparent
          focus:bg-[#222225]/90

          ${suffix ? "px-5 pr-24" : "px-5"}

          ${error
            ? "border-red-500/50 focus:border-red-500/70"
            : "border-white/10 focus:border-white/20"
          }
        `}
      />

      <label
        className={`
          pointer-events-none
          absolute
          left-5
          top-1/2
          -translate-y-1/2
          text-sm
          transition-all

          peer-focus:top-4
          peer-focus:text-[11px]
          peer-focus:uppercase
          peer-focus:tracking-[0.2em]

          peer-[:not(:placeholder-shown)]:top-4
          peer-[:not(:placeholder-shown)]:text-[11px]
          peer-[:not(:placeholder-shown)]:uppercase
          peer-[:not(:placeholder-shown)]:tracking-[0.2em]

          ${error
            ? "text-red-400/70 peer-focus:text-red-400/70 peer-[:not(:placeholder-shown)]:text-red-400/70"
            : "text-white/40 peer-focus:text-white/60 peer-[:not(:placeholder-shown)]:text-white/50"
          }
        `}
      >
        {label}
      </label>

      {/* Suffix — has its own left padding so it never touches typed text */}
      {suffix && (
        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-white/40 pointer-events-none">
          {suffix}
        </div>
      )}
    </motion.div>
  );
}