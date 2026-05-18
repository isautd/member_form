import { Suspense } from "react";
import MemberPage from "./MemberPage"; // move the current component to MemberPage.tsx

export default function Page() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-[#030303]">
        <p className="text-sm text-white/40">Loading...</p>
      </main>
    }>
      <MemberPage />
    </Suspense>
  );
}