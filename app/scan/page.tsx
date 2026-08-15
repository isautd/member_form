"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ScanResult = {
  status: "success" | "already" | "error";
  message: string;
};

type SearchResult = {
  memberId: string;
  name: string;
  netId: string;
  alreadyCheckedIn: boolean;
};

type RecentEntry = { name: string; timestamp: string };

function getDeviceId(): string {
  const key = "isa_device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function ScanPage() {
  const router = useRouter();

  const [scanningEnabled, setScanningEnabled] = useState(false);
  const [activeEvent, setActiveEvent] = useState("");
  const [checkingSettings, setCheckingSettings] = useState(true);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scannerReady, setScannerReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  // Manual check-in
  const [showManual, setShowManual] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Recent scans (global feed)
  const [recent, setRecent] = useState<RecentEntry[]>([]);

  const scannerRef = useRef<any>(null);
  const isRunningRef = useRef(false);
  const processingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const knownVersionRef = useRef<number | null>(null);

  // Settings poll — also drives the password-version force-logout check
  useEffect(() => {
    const fetchSettings = () => {
      fetch("/api/settings")
        .then((r) => r.json())
        .then((data) => {
          if (!data.success) return;

          setScanningEnabled(data.scanningEnabled);
          setActiveEvent(data.activeEvent);

          // First time we see a version, just remember it.
          // After that, any change means the officer password was reset —
          // force a logout so a leaked password stops working immediately.
          if (knownVersionRef.current === null) {
            knownVersionRef.current = data.officerPasswordVersion;
          } else if (knownVersionRef.current !== data.officerPasswordVersion) {
            fetch("/api/auth/logout", { method: "POST" }).then(() => {
              router.push("/login?reason=password_reset");
            });
          }

          setCheckingSettings(false);
        });
    };

    fetchSettings();
    const interval = setInterval(fetchSettings, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Heartbeat — lets admin see how many devices are actively scanning
  useEffect(() => {
    const deviceId = getDeviceId();
    const ping = () => {
      fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      }).catch(() => {});
    };
    ping();
    const interval = setInterval(ping, 10000);
    return () => clearInterval(interval);
  }, []);

  // Recent scans feed — global, polls regardless of who made the scan
  useEffect(() => {
    if (!scanningEnabled) return;
    const fetchRecent = () => {
      fetch("/api/recent-checkins")
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setRecent(data.recent);
        });
    };
    fetchRecent();
    const interval = setInterval(fetchRecent, 4000);
    return () => clearInterval(interval);
  }, [scanningEnabled]);

  const stopScanner = () => {
    const scanner = scannerRef.current;
    if (scanner && isRunningRef.current) {
      isRunningRef.current = false;
      try {
        scanner.stop().catch(() => {});
      } catch {
        // safe to ignore during teardown
      }
    }
    scannerRef.current = null;
    setScannerReady(false);
  };

  useEffect(() => {
    if (!scanningEnabled || !containerRef.current) {
      stopScanner();
      return;
    }

    let cancelled = false;
    setCameraError(false);

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled || !containerRef.current) return;

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText: string) => handleScan(decodedText),
          () => {}
        )
        .then(() => {
          if (cancelled) {
            isRunningRef.current = true;
            stopScanner();
            return;
          }
          isRunningRef.current = true;
          setScannerReady(true);
        })
        .catch((err: unknown) => {
          console.error("Camera start failed:", err);
          scannerRef.current = null;
          setCameraError(true);
        });
    });

    return () => {
      cancelled = true;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanningEnabled]);

  const handleScan = async (decodedText: string) => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const url = new URL(decodedText);
      const parts = url.pathname.split("/");
      const memberId = parts[2];
      const token = url.searchParams.get("token");

      if (!memberId || !token) {
        setResult({ status: "error", message: "Not a valid ISA pass QR code" });
        resetAfterDelay();
        return;
      }

      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, token }),
      });

      const data = await res.json();

      if (!data.success) {
        const messages: Record<string, string> = {
          scanning_disabled: "Scanning is currently paused",
          no_active_event: "No event is selected",
          invalid_pass: "This pass is invalid",
          event_column_missing: "Event column not found in sheet",
        };
        setResult({ status: "error", message: messages[data.message] || "Something went wrong" });
      } else if (data.alreadyCheckedIn) {
        setResult({ status: "already", message: `${data.memberName} — already checked in` });
      } else {
        setResult({ status: "success", message: `${data.memberName} — checked in!` });
      }
    } catch {
      setResult({ status: "error", message: "Invalid QR code" });
    }

    resetAfterDelay();
  };

  const resetAfterDelay = () => {
    setTimeout(() => {
      setResult(null);
      processingRef.current = false;
    }, 2200);
  };

  const retryCamera = () => {
    setCameraError(false);
    setScanningEnabled(false);
    setTimeout(() => setScanningEnabled(true), 50);
  };

  const handleLogout = async () => {
    stopScanner();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  // ── MANUAL CHECK-IN ──────────────────────────────────────────
  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      fetch(`/api/manual-checkin?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setSearchResults(data.results);
        })
        .finally(() => setSearching(false));
    }, 300); // debounce
    return () => clearTimeout(timeout);
  }, [query]);

  const doManualCheckin = async (memberId: string) => {
    const res = await fetch("/api/manual-checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    const data = await res.json();
    if (data.success) {
      setResult({
        status: data.alreadyCheckedIn ? "already" : "success",
        message: data.alreadyCheckedIn
          ? `${data.memberName} — already checked in`
          : `${data.memberName} — checked in!`,
      });
      setQuery("");
      setSearchResults([]);
      setShowManual(false);
      resetAfterDelay();
    }
  };

  const doUndo = async (memberId: string, name: string) => {
    const res = await fetch("/api/undo-checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    const data = await res.json();
    if (data.success) {
      setResult({ status: "error", message: `${name} — check-in undone` });
      resetAfterDelay();
      setSearchResults((prev) =>
        prev.map((r) => (r.memberId === memberId ? { ...r, alreadyCheckedIn: false } : r))
      );
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#030303] px-4 py-8">
      <div className="flex w-full max-w-sm items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Scan Pass</h1>
        <button onClick={handleLogout} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10">
          Log out
        </button>
      </div>

      <div className="mt-8 w-full max-w-sm flex flex-col gap-5">
        {checkingSettings && <p className="text-center text-sm text-white/40">Checking status...</p>}

        {!checkingSettings && !scanningEnabled && (
          <div className="rounded-2xl border border-white/10 bg-[#0f0f11]/80 p-8 text-center backdrop-blur-xl">
            <p className="text-white/70">Scanning is currently paused.</p>
            <p className="mt-1 text-sm text-white/40">Check with an organizer.</p>
          </div>
        )}

        {!checkingSettings && scanningEnabled && (
          <>
            <p className="text-center text-sm text-white/50">
              Scanning for <span className="text-white/80">{activeEvent}</span>
            </p>

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black min-h-[280px]">
              <div id="qr-reader" ref={containerRef} className="w-full" />

              {!scannerReady && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <p className="text-sm text-white/40">Starting camera...</p>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 px-6 text-center">
                  <p className="text-sm text-white/70">Camera access was blocked or dismissed.</p>
                  <p className="text-xs text-white/40">Allow camera permission in your browser's site settings, then try again.</p>
                  <button onClick={retryCamera} className="mt-2 rounded-full bg-white px-4 py-2 text-xs font-medium text-black">
                    Try Again
                  </button>
                </div>
              )}

              {result && (
                <div className={`
                  absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-6 text-center backdrop-blur-sm
                  ${result.status === "success" ? "bg-[#138808]/90" : ""}
                  ${result.status === "already" ? "bg-[#b96022]/90" : ""}
                  ${result.status === "error" ? "bg-red-600/90" : ""}
                `}>
                  <p className="text-lg font-semibold text-white">{result.message}</p>
                </div>
              )}
            </div>

            {/* MANUAL CHECK-IN TOGGLE */}
            <button
              onClick={() => setShowManual((s) => !s)}
              className="text-center text-xs text-white/40 underline underline-offset-2 hover:text-white/60"
            >
              {showManual ? "Hide manual check-in" : "Can't scan? Check in manually"}
            </button>

            {showManual && (
              <div className="rounded-2xl border border-white/10 bg-[#0f0f11]/80 p-4 backdrop-blur-xl flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Search name, NetID, or member ID"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-11 rounded-xl border border-white/10 bg-[#1c1c1e] px-3 text-sm text-white outline-none focus:border-white/20"
                />
                {searching && <p className="text-xs text-white/30">Searching...</p>}
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                  {searchResults.map((r) => (
                    <div key={r.memberId} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <div>
                        <p className="text-sm text-white">{r.name}</p>
                        <p className="text-[11px] text-white/40">{r.netId}@utdallas.edu</p>
                      </div>
                      {r.alreadyCheckedIn ? (
                        <button onClick={() => doUndo(r.memberId, r.name)} className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/20">
                          Undo
                        </button>
                      ) : (
                        <button onClick={() => doManualCheckin(r.memberId)} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black">
                          Check In
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RECENT SCANS FEED */}
            {recent.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#0f0f11]/80 p-4 backdrop-blur-xl">
                <p className="mb-2 text-xs uppercase tracking-wider text-white/40">Recent Check-ins</p>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {recent.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-white/80">{entry.name}</span>
                      <span className="text-[11px] text-white/30">{entry.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}