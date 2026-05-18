"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";

type Member = {
  firstName: string;
  lastName: string;
  netId: string;
  status: string;
  graduationInfo: string;
  memberId: string;
};

function PassSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-[22rem] animate-pulse">
      <div className="h-6 w-48 rounded-full bg-white/10" />
      <div className="w-full rounded-[1.75rem] border border-white/10 bg-white/5 p-6 flex flex-col items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-white/10" />
        <div className="h-3 w-32 rounded-full bg-white/10" />
        <div className="h-6 w-40 rounded-full bg-white/10" />
        <div className="h-3 w-24 rounded-full bg-white/10" />
        <div className="h-3 w-28 rounded-full bg-white/10" />
      </div>
    </div>
  );
}

function InvalidPass() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 text-center max-w-[18rem]"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none">
          <path d="M6 6l12 12M6 18L18 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-white">Invalid Pass</h2>
      <p className="text-sm text-white/50">
        This membership pass is invalid or the link has been tampered with.
        Please contact ISA if you think this is a mistake.
      </p>
    </motion.div>
  );
}

export default function MemberPage() {
  const params        = useParams();
  const searchParams  = useSearchParams();

  const id    = params.id as string;
  const token = searchParams.get("token") ?? "";

  const [member, setMember]   = useState<Member | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [loading, setLoading] = useState(true);

  const qrUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/member/${id}?token=${token}`
      : "";

  useEffect(() => {
    if (!id || !token) { setInvalid(true); setLoading(false); return; }

    fetch(`/api/member?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setMember(data.member);
        else setInvalid(true);
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [id, token]);

  return (
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center gap-6 overflow-x-hidden bg-[#030303] px-4 py-12 [overflow-x:clip]">
      {/* Background glows */}
      <div className="absolute left-[-10%] top-[-10%] z-[1] h-[32rem] w-[32rem] rounded-full bg-[#FF9933] opacity-[0.10] blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] z-[1] h-[32rem] w-[32rem] rounded-full bg-[#138808] opacity-[0.10] blur-3xl pointer-events-none" />
      <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_center,transparent_15%,rgba(0,0,0,0.72)_100%)]" />

      <div className="relative z-10 flex w-full flex-col items-center gap-6">
        {loading && <PassSkeleton />}
        {!loading && invalid && <InvalidPass />}
        {!loading && member && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            className="flex w-full max-w-[22rem] flex-col items-center gap-5"
          >
            {/* MEMBER CARD */}
            <div className="relative w-full">
              <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-[#FF9933]/25 via-transparent to-[#138808]/25 blur-xl" />
              <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] backdrop-blur-2xl">
                {/* Tricolor stripe */}
                <div className="flex h-1">
                  <div className="flex-1 bg-[#FF9933]" />
                  <div className="flex-1 bg-white" />
                  <div className="flex-1 bg-[#138808]" />
                </div>

                {/* Shimmer */}
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "220%" }}
                  transition={{ delay: 0.4, duration: 1.1, ease: "easeInOut" }}
                  className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/8 to-transparent -skew-x-12 pointer-events-none"
                />

                <img
                  src="/chakra.svg"
                  className="absolute right-[-8px] top-[-8px] h-24 w-24 opacity-[0.06] pointer-events-none"
                />

                <div className="flex flex-col items-center gap-4 px-6 py-7">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/40">
                    <img src="/isa-logo.png" className="h-9 w-9 object-contain" />
                  </div>

                  <p className="text-[10px] font-medium uppercase tracking-[0.4em] text-white/40">
                    ISA · UTD · Member
                  </p>

                  <div className="w-16 border-t border-white/10" />

                  <h2 className="text-2xl font-semibold tracking-tight text-white text-center">
                    {member.firstName} {member.lastName}
                  </h2>

                  <p className="text-sm text-white/60">{member.status}</p>
                  <p className="text-sm text-white/60">{member.graduationInfo}</p>

                  <div className="w-full border-t border-white/[0.07]" />

                  <p className="text-xs tracking-wide text-white/30">
                    {member.netId}@utdallas.edu
                  </p>
                </div>
              </div>
            </div>

            {/* QR CODE BLOCK */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative w-full"
            >
              <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-[#FF9933]/15 via-transparent to-[#138808]/15 blur-xl" />
              <div className="relative flex flex-col items-center gap-4 rounded-[1.75rem] border border-white/10 bg-white/[0.04] px-6 py-6 backdrop-blur-xl">
                {/* QR rendered on white background so scanners can read it */}
                <div className="rounded-2xl bg-white p-3 shadow-lg">
                  {qrUrl && (
                    <QRCodeSVG
                      value={qrUrl}
                      size={160}
                      level="M"
                      includeMargin={false}
                    />
                  )}
                </div>

                <div className="flex flex-col items-center gap-1 text-center">
                  <p className="text-xs font-mono tracking-widest text-white/50">
                    {member.memberId}
                  </p>
                  <p className="text-[11px] text-white/30">
                    Show this at ISA events to mark attendance
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </main>
  );
}