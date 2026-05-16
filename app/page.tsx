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
        bg-[#030303]
        px-4
        sm:px-6
        pt-20
        pb-10
        sm:py-10
        [overflow-x:clip]
      "
    >
      {/* Animated Background Gradient */}
      <div className="absolute inset-0">
        <div className="gradient-wave absolute inset-0" />
      </div>

      {/* Ambient Glow - Saffron */}
      <div className="absolute left-[-10%] top-[-10%] z-[1] h-[32rem] w-[32rem] rounded-full bg-[#FF9933] opacity-[0.12] blur-3xl" />

      {/* Ambient Glow - Green */}
      <div className="absolute bottom-[-10%] right-[-10%] z-[1] h-[32rem] w-[32rem] rounded-full bg-[#138808] opacity-[0.12] blur-3xl" />

      {/* Ashoka Chakra */}
      <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center">
        <div className="chakra-spin relative flex items-center justify-center">
          
          {/* Atmospheric Glow */}
          <div className="absolute h-[700px] w-[700px] rounded-full bg-blue-500/10 blur-3xl" />

          {/* Chakra */}
          <img
            src="/chakra.svg"
            alt="Ashoka Chakra"
            className="
              relative
              w-[650px]
              md:w-[850px]
              object-contain
              opacity-[0.22]
            "
          />
        </div>
      </div>

      {/* Cinematic Vignette */}
      <div className="pointer-events-none absolute inset-0 z-[3] bg-[radial-gradient(circle_at_center,transparent_15%,rgba(0,0,0,0.72)_100%)]" />

      {/* Noise Texture */}
      <div className="noise-overlay z-[4]" />

      {/* Perspective Layer — overflow-visible so the floating logo isn't clipped */}
      <div
        className="relative z-10 flex w-full items-center justify-center overflow-visible"
        style={{
          perspective: "2000px",
        }}
      >
        <DigitalPass />
      </div>

      {/* Custom Animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .gradient-wave {
              background: linear-gradient(
                105deg,
                #FF9933 0%,
                #d9d9d9 48%,
                #138808 100%
              );
              background-size: 200% 200%;
              animation: gradientWave 10s ease infinite;
              filter: saturate(120%);
            }

            @keyframes gradientWave {
              0% {
                background-position: 0% 50%;
              }

              50% {
                background-position: 100% 50%;
              }

              100% {
                background-position: 0% 50%;
              }
            }

            .chakra-spin {
              animation: chakraRotate 60s linear infinite;
            }

            @keyframes chakraRotate {
              from {
                transform: rotate(0deg);
              }

              to {
                transform: rotate(360deg);
              }
            }
          `,
        }}
      />
    </main>
  );
}