import DigitalPass from "@/components/DigitalPass";

export default function HomePage() {
  return (
    <main
      className="
        relative
        isolate
        flex
        min-h-screen
        items-center
        justify-center
        px-4
        sm:px-6
        pt-20
        pb-10
        sm:py-10
        [overflow-x:clip]
      "
      style={{
        // Matches the website's body gradient: #fffdf9 → #f9f1e8
        background: "linear-gradient(180deg, #fffdf9 0%, #f9f1e8 100%)",
      }}
    >
      {/* Tricolor top band — same treatment as the website header */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[20] h-2"
        style={{
          background:
            "linear-gradient(90deg, #FF9933 33%, #fff 33% 66%, #138808 66%)",
          boxShadow: "0 6px 18px rgba(0,0,0,.08)",
        }}
      />

      {/* Ambient glow — Saffron/accent, matches website's --accent-2 */}
      <div
        className="absolute left-[-10%] top-[-10%] z-[1] h-[32rem] w-[32rem] rounded-full opacity-[0.16] blur-3xl"
        style={{ background: "#f4a261" }}
      />

      {/* Ambient glow — Green (national tricolor, kept from before) */}
      <div className="absolute bottom-[-10%] right-[-10%] z-[1] h-[32rem] w-[32rem] rounded-full bg-[#138808] opacity-[0.10] blur-3xl" />

      {/* Ashoka Chakra — kept, opacity tuned down slightly for the lighter background */}
      <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center">
        <div className="chakra-spin relative flex items-center justify-center">
          <div
            className="absolute h-[700px] w-[700px] rounded-full blur-3xl"
            style={{ background: "rgba(92,26,0,0.06)" }}
          />
          <img
            src="/chakra.svg"
            alt="Ashoka Chakra"
            className="relative w-[650px] md:w-[850px] object-contain opacity-[0.10]"
          />
        </div>
      </div>

      {/* Soft vignette — warm tone instead of black, matches website's paper feel */}
      <div
        className="pointer-events-none absolute inset-0 z-[3]"
        style={{
          background:
            "radial-gradient(circle at center, transparent 25%, rgba(92,26,0,0.06) 100%)",
        }}
      />

      {/* Perspective Layer — unchanged, wraps the untouched card */}
      <div
        className="relative z-10 flex w-full items-center justify-center overflow-visible"
        style={{ perspective: "2000px" }}
      >
        <DigitalPass />
      </div>
    </main>
  );
}