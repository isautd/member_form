"use client";

import { motion } from "framer-motion";
import { ChangeEvent, useState } from "react";

interface Props {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  suffix?: string;
}

export default function GlassInput({
  label,
  value,
  onChange,
  type = "text",
  suffix,
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
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder=" "
        className="
          peer
          h-14
          w-full
          rounded-2xl
          border
          border-white/10
          bg-[#1c1c1e]/80
          px-5
          pt-5
          text-sm
          text-white
          outline-none
          transition-all
          placeholder-transparent
          focus:border-white/20
          focus:bg-[#222225]/90
        "
      />

      <label
        className="
          pointer-events-none
          absolute
          left-5
          top-1/2
          -translate-y-1/2
          text-sm
          text-white/40
          transition-all

          peer-focus:top-4
          peer-focus:text-[11px]
          peer-focus:uppercase
          peer-focus:tracking-[0.2em]
          peer-focus:text-white/60

          peer-[:not(:placeholder-shown)]:top-4
          peer-[:not(:placeholder-shown)]:text-[11px]
          peer-[:not(:placeholder-shown)]:uppercase
          peer-[:not(:placeholder-shown)]:tracking-[0.2em]
        "
      >
        {label}
      </label>

      {suffix && (
        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-white/40">
          {suffix}
        </div>
      )}
    </motion.div>
  );
}