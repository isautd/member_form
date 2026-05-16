"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

import { useEffect, useRef, useState } from "react";

import GlassInput from "./GlassInput";
import StepWrapper from "./StepWrapper";

import { CARD_SPRING } from "@/lib/motion";

/* -------------------------------------------------- */
/* CONFETTI                                            */
/* -------------------------------------------------- */
const COLORS = ["#FF9933", "#ffffff", "#138808", "#FF6B00", "#00A550"];

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  angle: number; spin: number;
  size: number; color: string; opacity: number;
}

function useConfetti(active: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef   = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: Particle[] = Array.from({ length: 90 }, () => ({
      x: canvas.width / 2,
      y: canvas.height * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -(Math.random() * 10 + 4),
      angle: Math.random() * 360,
      spin: (Math.random() - 0.5) * 8,
      size: Math.random() * 7 + 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: 1,
    }));

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.vy += 0.35; p.vx *= 0.99;
        p.x += p.vx;  p.y += p.vy;
        p.angle   += p.spin;
        p.opacity -= 0.012;
        if (p.opacity <= 0) continue;
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (alive) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  return canvasRef;
}

/* -------------------------------------------------- */
/* HELPERS                                            */
/* -------------------------------------------------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOTAL_STEPS = 5;

const fullBtn =
  "h-12 sm:h-14 w-full rounded-2xl bg-white text-black transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]";

const compactBtn =
  "h-10 sm:h-11 px-10 rounded-2xl bg-white text-sm text-black transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]";

function Hint({ text }: { text: string }) {
  return <p className="text-[11px] text-white/35 pl-1 -mt-1">{text}</p>;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-red-400 pl-1 -mt-1">{msg}</p>;
}

/* -------------------------------------------------- */
/* COMPONENT                                          */
/* -------------------------------------------------- */
export default function DigitalPass() {
  const [step, setStep]               = useState(0);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [loading, setLoading]         = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [formData, setFormData] = useState({
    firstName:        "",
    lastName:         "",
    netId:            "",
    personalEmail:    "",
    countryCode:      "+1",
    whatsappNumber:   "",
    status:           "",
    // Two separate fields in UI — combined into one string on submit
    startingSemester: "",
    graduationInfo:   "",
    interests:        [] as string[],
    otherInterest:    "",
    website:          "",
  });

  const confettiRef = useConfetti(step === 5);

  /* ---------------------------------- */
  /* MOTION                             */
  /* ---------------------------------- */
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-200, 200], [4, -4]), CARD_SPRING);
  const rotateY = useSpring(useTransform(mouseX, [-200, 200], [-4, 4]), CARD_SPRING);

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };
  const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0); };

  const goBack = () => {
    setErrors({});
    setSubmitError("");
    setStep((p) => Math.max(0, p - 1));
  };

  /* ---------------------------------- */
  /* INPUT HANDLERS                     */
  /* ---------------------------------- */
  const handleNameChange = (field: "firstName" | "lastName", value: string) => {
    const cleaned = value.replace(/[^a-zA-Z\s'-]/g, "");
    setFormData((p) => ({ ...p, [field]: cleaned }));
    if (cleaned) setErrors((p) => ({ ...p, [field]: "" }));
  };

  const handleWhatsAppChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 10);
    setFormData((p) => ({ ...p, whatsappNumber: cleaned }));
    if (cleaned.length === 10) setErrors((p) => ({ ...p, whatsappNumber: "" }));
  };

  const handleEmailChange = (value: string) => {
    setFormData((p) => ({ ...p, personalEmail: value }));
    if (EMAIL_RE.test(value)) setErrors((p) => ({ ...p, personalEmail: "" }));
  };

  const toggleInterest = (interest: string) => {
    setFormData((p) => {
      const exists = p.interests.includes(interest);
      return {
        ...p,
        interests: exists
          ? p.interests.filter((i) => i !== interest)
          : [...p.interests, interest],
      };
    });
    setErrors((p) => ({ ...p, interests: "" }));
  };

  /* ---------------------------------- */
  /* DYNAMIC LABELS                     */
  /* ---------------------------------- */
  const startingLabel = "Starting semester";
  const startingHint  = "e.g. Fall 2023, Spring 2024";

  const graduationLabel =
    formData.status === "Alumni"  ? "Graduating semester" :
    formData.status === "Student" ? "Expected graduation"  :
                                    "Graduation semester";

  const graduationHint =
    formData.status === "Alumni"
      ? "e.g. Fall 2024, Spring 2023"
      : "e.g. Fall 2026, Spring 2027";

  // The combined range shown on the final card and sent to Google Sheets
  const semesterRange =
    formData.startingSemester && formData.graduationInfo
      ? `${formData.startingSemester} – ${formData.graduationInfo}`
      : formData.startingSemester || formData.graduationInfo;

  /* ---------------------------------- */
  /* VALIDATION                         */
  /* ---------------------------------- */
  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!formData.firstName.trim()) errs.firstName = "Required";
    if (!formData.lastName.trim())  errs.lastName  = "Required";
    setErrors(errs);
    if (!Object.keys(errs).length) setStep(2);
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!formData.netId.trim())
      errs.netId = "Required";
    if (!formData.personalEmail.trim())
      errs.personalEmail = "Required";
    else if (!EMAIL_RE.test(formData.personalEmail))
      errs.personalEmail = "Enter a valid email address";
    if (!formData.whatsappNumber)
      errs.whatsappNumber = "Required";
    else if (formData.whatsappNumber.length !== 10)
      errs.whatsappNumber = `${formData.whatsappNumber.length}/10 digits — must be exactly 10`;
    setErrors(errs);
    if (!Object.keys(errs).length) setStep(3);
  };

  const validateStep3 = () => {
    const errs: Record<string, string> = {};
    if (!formData.status)
      errs.status = "Please select one";
    if (!formData.startingSemester.trim())
      errs.startingSemester = "Required";
    if (!formData.graduationInfo.trim())
      errs.graduationInfo = "Required";
    setErrors(errs);
    if (!Object.keys(errs).length) setStep(4);
  };

  const submitMembership = async () => {
    const errs: Record<string, string> = {};
    if (formData.interests.length === 0)
      errs.interests = "Pick at least one";
    if (formData.interests.includes("Other") && !formData.otherInterest.trim())
      errs.otherInterest = "Required";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      setLoading(true);
      setSubmitError("");

      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          // Combine both semesters into the single graduationInfo cell
          // so the Google Sheet receives e.g. "Fall 2025 - Spring 2027"
          // No changes needed on the sheet or API route side.
          graduationInfo: semesterRange,
          // startingSemester is intentionally omitted — it's already
          // baked into graduationInfo above, so no extra column is created.
          startingSemester: undefined,
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error();
      setStep(5);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------- */
  /* RENDER                             */
  /* ---------------------------------- */
  return (
    <motion.div
      onMouseMove={handleMouse}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "flat", overflow: "visible" }}
      className="relative w-full max-w-[92vw] sm:max-w-[30rem]"
    >
      {step === 5 && (
        <canvas
          ref={confettiRef}
          className="pointer-events-none absolute inset-0 z-[90] h-full w-full"
        />
      )}

      {/* BACK BUTTON */}
      {step > 0 && step < 5 && (
        <button
          onClick={goBack}
          className="
            absolute left-4 top-[4.5rem] sm:top-4 z-[80]
            flex items-center gap-2 rounded-full border border-white/10
            bg-black/40 px-3 py-1.5 text-sm text-white/80 backdrop-blur-md
            transition hover:text-white active:scale-95
          "
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      )}

      {/* FLOATING LOGO */}
      <div className="
        pointer-events-none absolute left-1/2 top-0 z-[70]
        flex h-16 w-16 sm:h-20 sm:w-20
        -translate-x-1/2 -translate-y-[42%] items-center justify-center
        rounded-full border border-white/10 bg-[#0f0f11]/92
        shadow-[0_10px_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl
      ">
        <img src="/isa-logo.png" alt="ISA Logo" className="h-10 w-10 sm:h-14 sm:w-14 object-contain" />
      </div>

      {/* OUTER SHELL */}
      <div className="relative overflow-visible rounded-2xl sm:rounded-[2rem] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.95)]">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-[2rem] border border-white/10 bg-[#09090b]/72 backdrop-blur-3xl">

          {/* PROGRESS BAR */}
          <div className="absolute inset-x-0 top-0 z-30 h-[3px] overflow-hidden rounded-t-[2rem]">
            <motion.div
              className="h-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]"
              animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
              transition={{ duration: 0.45 }}
            />
          </div>

          {/* CONTENT */}
          <div className="flex min-h-[72vh] sm:min-h-[680px] items-center justify-center px-4 sm:px-8 py-14 sm:py-20">
            <div className="w-full max-w-[22rem]">
              <AnimatePresence mode="wait">

                {/* ── STEP 0 — WELCOME ── */}
                {step === 0 && (
                  <StepWrapper key="step0">
                    <Sparkles className="h-10 w-10 text-white" />
                    <h1 className="text-center text-2xl font-semibold text-white sm:text-3xl">
                      Welcome to ISA
                    </h1>
                    <p className="text-center text-sm text-white/60">
                      Indian Student Association Membership
                    </p>
                    <button onClick={() => setStep(1)} className={fullBtn}>
                      Get Started <ArrowRight className="ml-2 inline h-4 w-4" />
                    </button>
                  </StepWrapper>
                )}

                {/* ── STEP 1 — NAME ── */}
                {step === 1 && (
                  <StepWrapper key="step1">
                    <input type="text" autoComplete="off" tabIndex={-1} className="hidden"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                    <div className="text-center">
                      <h2 className="text-xl text-white sm:text-2xl">
                        Every great story starts with a name.
                      </h2>
                      <p className="mt-1 text-sm text-white/40">Yours included.</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <GlassInput label="First Name" value={formData.firstName}
                        onChange={(e) => handleNameChange("firstName", e.target.value)}
                        error={errors.firstName}
                      />
                      <FieldError msg={errors.firstName} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <GlassInput label="Last Name" value={formData.lastName}
                        onChange={(e) => handleNameChange("lastName", e.target.value)}
                        error={errors.lastName}
                      />
                      <FieldError msg={errors.lastName} />
                    </div>
                    <div className="flex justify-center">
                      <button onClick={validateStep1} className={compactBtn}>Continue</button>
                    </div>
                  </StepWrapper>
                )}

                {/* ── STEP 2 — CONTACT ── */}
                {step === 2 && (
                  <StepWrapper key="step2">
                    <div className="text-center">
                      <h2 className="text-xl text-white sm:text-2xl">
                        {formData.firstName}, how do we find you in the crowd?
                      </h2>
                      <p className="mt-1 text-sm text-white/40">Won&apos;t spam, promise.</p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <GlassInput label="NetID" value={formData.netId}
                        onChange={(e) => {
                          setFormData({ ...formData, netId: e.target.value });
                          setErrors((p) => ({ ...p, netId: "" }));
                        }}
                        error={errors.netId}
                      />
                      {!errors.netId && (
                        <Hint text={formData.netId ? `${formData.netId}@utdallas.edu` : "@utdallas.edu will be appended"} />
                      )}
                      <FieldError msg={errors.netId} />
                    </div>

                    <div className="flex flex-col gap-1">
                      <GlassInput label="Personal Email" value={formData.personalEmail}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        error={errors.personalEmail}
                      />
                      <FieldError msg={errors.personalEmail} />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <div className="relative min-w-[84px]">
                          <select
                            value={formData.countryCode}
                            onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                            className="h-12 sm:h-14 w-full appearance-none rounded-xl border border-white/10 bg-[#1c1c1e] px-3 pr-8 text-center text-sm text-white outline-none"
                          >
                            <option value="+1">+1</option>
                            <option value="+91">+91</option>
                            <option value="+44">+44</option>
                            <option value="+61">+61</option>
                          </select>
                          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/50">▼</div>
                        </div>
                        <div className="flex-1">
                          <GlassInput
                            label="WhatsApp Number"
                            inputMode="numeric"
                            value={formData.whatsappNumber}
                            onChange={(e) => handleWhatsAppChange(e.target.value)}
                            error={errors.whatsappNumber}
                            hint={formData.whatsappNumber.length > 0 ? `${formData.whatsappNumber.length}/10` : undefined}
                          />
                        </div>
                      </div>
                      <FieldError msg={errors.whatsappNumber} />
                    </div>

                    {submitError && <p className="text-center text-sm text-red-400">{submitError}</p>}
                    <div className="flex justify-center">
                      <button onClick={validateStep2} className={compactBtn}>Continue</button>
                    </div>
                  </StepWrapper>
                )}

                {/* ── STEP 3 — STATUS + SEMESTERS ── */}
                {step === 3 && (
                  <StepWrapper key="step3">
                    <div className="text-center">
                      <h2 className="text-xl text-white sm:text-2xl">
                        Where are you in your UTD journey?
                      </h2>
                      <p className="mt-1 text-sm text-white/40">Student or alumni — and when.</p>
                    </div>

                    {/* STATUS */}
                    <div className="flex flex-col gap-1 items-center">
                      <div className="flex gap-3">
                        {["Student", "Alumni"].map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              setFormData({ ...formData, status: s });
                              setErrors((p) => ({ ...p, status: "" }));
                            }}
                            className={`
                              rounded-full border px-6 py-2.5 text-sm transition-all duration-300
                              ${formData.status === s
                                ? "scale-[1.03] border-transparent bg-gradient-to-r from-[#FF9933] to-[#138808] text-white shadow-lg shadow-orange-500/20"
                                : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"}
                            `}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <FieldError msg={errors.status} />
                    </div>

                    {/* STARTING SEMESTER */}
                    <div className="flex flex-col gap-1">
                      <GlassInput
                        label={startingLabel}
                        value={formData.startingSemester}
                        onChange={(e) => {
                          setFormData({ ...formData, startingSemester: e.target.value });
                          setErrors((p) => ({ ...p, startingSemester: "" }));
                        }}
                        error={errors.startingSemester}
                      />
                      {!errors.startingSemester && <Hint text={startingHint} />}
                      <FieldError msg={errors.startingSemester} />
                    </div>

                    {/* GRADUATION / EXPECTED GRADUATION */}
                    <div className="flex flex-col gap-1">
                      <GlassInput
                        label={graduationLabel}
                        value={formData.graduationInfo}
                        onChange={(e) => {
                          setFormData({ ...formData, graduationInfo: e.target.value });
                          setErrors((p) => ({ ...p, graduationInfo: "" }));
                        }}
                        error={errors.graduationInfo}
                      />
                      {!errors.graduationInfo && <Hint text={graduationHint} />}
                      <FieldError msg={errors.graduationInfo} />
                    </div>

                    {/* Live preview of the combined range */}
                    {(formData.startingSemester || formData.graduationInfo) && (
                      <p className="text-center text-xs text-white/30">
                        {semesterRange}
                      </p>
                    )}

                    <div className="flex justify-center">
                      <button onClick={validateStep3} className={compactBtn}>Continue</button>
                    </div>
                  </StepWrapper>
                )}

                {/* ── STEP 4 — INTERESTS ── */}
                {step === 4 && (
                  <StepWrapper key="step4">
                    <div className="text-center">
                      <h2 className="text-xl text-white sm:text-2xl">
                        What gets you on stage?
                      </h2>
                      <p className="mt-1 text-sm text-white/40">Pick everything that applies.</p>
                    </div>

                    <div className="flex flex-col gap-1 items-center">
                      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                        {["Dance", "Music", "Drama", "Other"].map((i) => (
                          <button
                            key={i}
                            onClick={() => toggleInterest(i)}
                            className={`
                              whitespace-nowrap rounded-full border px-5 py-2.5 text-sm transition-all duration-300
                              ${formData.interests.includes(i)
                                ? "scale-[1.03] border-transparent bg-gradient-to-r from-[#FF9933] to-[#138808] text-white shadow-lg shadow-orange-500/20"
                                : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"}
                            `}
                          >
                            {i}
                          </button>
                        ))}
                      </div>
                      <FieldError msg={errors.interests} />
                    </div>

                    {formData.interests.includes("Other") && (
                      <div className="flex flex-col gap-1">
                        <GlassInput
                          label="Your interest"
                          value={formData.otherInterest}
                          onChange={(e) => {
                            setFormData({ ...formData, otherInterest: e.target.value });
                            setErrors((p) => ({ ...p, otherInterest: "" }));
                          }}
                          error={errors.otherInterest}
                        />
                        {!errors.otherInterest && <Hint text="e.g. Photography, Art, Comedy" />}
                        <FieldError msg={errors.otherInterest} />
                      </div>
                    )}

                    {submitError && <p className="text-center text-sm text-red-400">{submitError}</p>}
                    <div className="flex justify-center">
                      <button
                        onClick={submitMembership}
                        disabled={loading}
                        className={`${compactBtn} disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {loading ? "Submitting..." : "Finish"}
                      </button>
                    </div>
                  </StepWrapper>
                )}

                {/* ── STEP 5 — CONFIRMATION ── */}
                {step === 5 && (
                  <StepWrapper key="step5">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                    >
                      <div className="relative flex items-center justify-center">
                        <div className="absolute h-20 w-20 rounded-full bg-gradient-to-br from-[#FF9933] via-white to-[#138808] opacity-30 blur-xl" />
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20 bg-[#0f0f11]">
                          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none">
                            <motion.path
                              d="M5 13l4 4L19 7"
                              stroke="#138808"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.5, delay: 0.4 }}
                            />
                          </svg>
                        </div>
                      </div>
                    </motion.div>

                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.55 }}
                      className="text-center text-xl font-semibold text-white"
                    >
                      You&apos;re in! Welcome to ISA 🎉
                    </motion.p>

                    {/* MEMBER CARD */}
                    <motion.div
                      initial={{ opacity: 0, y: 32 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.65, type: "spring", stiffness: 180, damping: 22 }}
                      className="relative w-full"
                    >
                      <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-[#FF9933]/25 via-transparent to-[#138808]/25 blur-xl" />

                      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] backdrop-blur-2xl">

                        {/* Tricolor stripe */}
                        <div className="flex h-1">
                          <div className="flex-1 bg-[#FF9933]" />
                          <div className="flex-1 bg-white" />
                          <div className="flex-1 bg-[#138808]" />
                        </div>

                        {/* Shimmer sweep */}
                        <motion.div
                          initial={{ x: "-100%" }}
                          animate={{ x: "220%" }}
                          transition={{ delay: 1.0, duration: 1.1, ease: "easeInOut" }}
                          className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/8 to-transparent -skew-x-12 pointer-events-none"
                        />

                        <img
                          src="/chakra.svg"
                          className="absolute right-[-8px] top-[-8px] h-24 w-24 opacity-[0.06] pointer-events-none"
                        />

                        <div className="flex flex-col items-center gap-4 px-6 py-7">

                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.8 }}
                            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/40"
                          >
                            <img src="/isa-logo.png" className="h-9 w-9 object-contain" />
                          </motion.div>

                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.9 }}
                            className="text-[10px] font-medium uppercase tracking-[0.4em] text-white/40"
                          >
                            ISA · UTD · Member
                          </motion.p>

                          <div className="w-16 border-t border-white/10" />

                          {/* Name */}
                          <motion.h3
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.0 }}
                            className="text-2xl font-semibold tracking-tight text-white text-center"
                          >
                            {formData.firstName} {formData.lastName}
                          </motion.h3>

                          {/* Status */}
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.1 }}
                            className="text-sm text-white/60"
                          >
                            {formData.status}
                          </motion.p>

                          {/* Semester range — "Fall 2025 – Spring 2027" */}
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.2 }}
                            className="text-sm text-white/60"
                          >
                            {semesterRange}
                          </motion.p>

                          <div className="w-full border-t border-white/[0.07]" />

                          {/* NetID */}
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.3 }}
                            className="text-xs tracking-wide text-white/30"
                          >
                            {formData.netId}@utdallas.edu
                          </motion.p>

                        </div>
                      </div>
                    </motion.div>
                  </StepWrapper>
                )}

              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}