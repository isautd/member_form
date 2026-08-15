"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SearchResult = {
  memberId: string;
  name: string;
  netId: string;
  alreadyCheckedIn: boolean;
};

type RecentEntry = { name: string; timestamp: string };
type EventStat = { event: string; count: number };

export default function AdminPage() {
  const router = useRouter();

  const [events, setEvents] = useState<string[]>([]);
  const [activeEvent, setActiveEvent] = useState("");
  const [scanningEnabled, setScanningEnabled] = useState(false);
  const [count, setCount] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Manual check-in
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  // Recent scans
  const [recent, setRecent] = useState<RecentEntry[]>([]);

  // Create/rename event
  const [newEventName, setNewEventName] = useState("");
  const [renameFrom, setRenameFrom] = useState("");
  const [renameTo, setRenameTo] = useState("");
  const [eventMsg, setEventMsg] = useState("");

  // Event stats
  const [stats, setStats] = useState<EventStat[]>([]);
  const [showStats, setShowStats] = useState(false);

  // Officer count
  const [officerCount, setOfficerCount] = useState(0);

  // Password reset
  const [newOfficerPassword, setNewOfficerPassword] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetting, setResetting] = useState(false);

  const loadEventsAndSettings = () => {
    Promise.all([
      fetch("/api/events").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([eventsData, settingsData]) => {
      if (eventsData.success) setEvents(eventsData.events);
      if (settingsData.success) {
        setActiveEvent(settingsData.activeEvent);
        setScanningEnabled(settingsData.scanningEnabled);
        setCount(settingsData.checkinCount);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadEventsAndSettings();
  }, []);

  // Live count + recent scans + officer heartbeat count — all poll together
  useEffect(() => {
    if (!activeEvent) return;

    const poll = () => {
      fetch(`/api/checkin-count?event=${encodeURIComponent(activeEvent)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setCount(data.count);
            setTotalMembers(data.totalMembers);
          }
        });

      fetch("/api/recent-checkins")
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setRecent(data.recent);
        });

      fetch("/api/officer-count")
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setOfficerCount(data.count);
        });
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [activeEvent]);

  const saveSettings = async (newEvent: string, newEnabled: boolean) => {
    setSaving(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeEvent: newEvent, scanningEnabled: newEnabled }),
    });
    setSaving(false);
  };

  const handleEventChange = (event: string) => {
    setActiveEvent(event);
    setScanningEnabled(false);
    saveSettings(event, false);
  };

  const handleToggle = () => {
    const next = !scanningEnabled;
    setScanningEnabled(next);
    saveSettings(activeEvent, next);
  };

  const handleLogout = async () => {
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
    }, 300);
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
      setActionMsg(data.alreadyCheckedIn ? `${data.memberName} already checked in` : `${data.memberName} checked in`);
      setSearchResults((prev) => prev.map((r) => (r.memberId === memberId ? { ...r, alreadyCheckedIn: true } : r)));
      setTimeout(() => setActionMsg(""), 2500);
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
      setActionMsg(`${name} — check-in undone`);
      setSearchResults((prev) => prev.map((r) => (r.memberId === memberId ? { ...r, alreadyCheckedIn: false } : r)));
      setTimeout(() => setActionMsg(""), 2500);
    }
  };

  // ── CREATE / RENAME EVENT ────────────────────────────────────
  const createEvent = async () => {
    const name = newEventName.trim();
    if (!name) return;
    const res = await fetch("/api/manage-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name }),
    });
    const data = await res.json();
    if (data.success) {
      setEventMsg(`"${name}" created`);
      setNewEventName("");
      loadEventsAndSettings();
    } else {
      setEventMsg(data.message || "Failed to create event");
    }
    setTimeout(() => setEventMsg(""), 3000);
  };

  const renameEvent = async () => {
    if (!renameFrom || !renameTo.trim()) return;
    const res = await fetch("/api/manage-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rename", oldName: renameFrom, newName: renameTo.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      setEventMsg(`Renamed to "${renameTo.trim()}"`);
      setRenameFrom("");
      setRenameTo("");
      loadEventsAndSettings();
    } else {
      setEventMsg(data.message || "Failed to rename event");
    }
    setTimeout(() => setEventMsg(""), 3000);
  };

  // ── EVENT STATS ───────────────────────────────────────────────
  const loadStats = () => {
    fetch("/api/event-stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setStats(data.stats);
      });
  };

  const toggleStats = () => {
    if (!showStats) loadStats();
    setShowStats((s) => !s);
  };

  // ── PASSWORD RESET ───────────────────────────────────────────
  const resetOfficerPassword = async () => {
    if (newOfficerPassword.trim().length < 4) {
      setResetMsg("Password must be at least 4 characters");
      return;
    }
    setResetting(true);
    const res = await fetch("/api/admin/reset-officer-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: newOfficerPassword.trim() }),
    });
    const data = await res.json();
    setResetting(false);
    if (data.success) {
      setResetMsg("Officer password reset — all officer devices will be logged out shortly");
      setNewOfficerPassword("");
    } else {
      setResetMsg(data.message || "Failed to reset password");
    }
    setTimeout(() => setResetMsg(""), 5000);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#030303]">
        <p className="text-sm text-white/40">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#030303] px-4 py-10">
      <div className="mx-auto flex max-w-md flex-col gap-6">

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Admin Dashboard</h1>
          <button onClick={handleLogout} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10">
            Log out
          </button>
        </div>

        {/* EVENT SELECTOR */}
        <div className="rounded-2xl border border-white/10 bg-[#0f0f11]/80 p-5 backdrop-blur-xl">
          <label className="text-xs uppercase tracking-wider text-white/40">Active Event</label>
          <select
            value={activeEvent}
            onChange={(e) => handleEventChange(e.target.value)}
            className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#1c1c1e] px-4 text-sm text-white outline-none"
          >
            <option value="">— Select an event —</option>
            {events.map((ev) => (
              <option key={ev} value={ev}>{ev}</option>
            ))}
          </select>
          {events.length === 0 && (
            <p className="mt-2 text-xs text-white/30">No events yet — create one below.</p>
          )}
        </div>

        {/* SCANNING TOGGLE */}
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0f0f11]/80 p-5 backdrop-blur-xl">
          <div>
            <p className="text-sm font-medium text-white">Scanning</p>
            <p className="text-xs text-white/40">
              {scanningEnabled ? "Live — officers can scan now" : "Paused — officers see a waiting screen"}
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={!activeEvent || saving}
            className={`h-9 w-16 rounded-full transition-colors duration-300 disabled:opacity-40 ${scanningEnabled ? "bg-[#138808]" : "bg-white/10"}`}
          >
            <div className={`h-7 w-7 rounded-full bg-white transition-transform duration-300 ml-1 ${scanningEnabled ? "translate-x-7" : "translate-x-0"}`} />
          </button>
        </div>

        {/* LIVE COUNT + OFFICER COUNT */}
        {activeEvent && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-[#0f0f11]/80 p-5 text-center backdrop-blur-xl">
              <p className="text-3xl font-semibold text-white">{count}</p>
              <p className="mt-1 text-[11px] text-white/40">checked in · {totalMembers} total</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0f0f11]/80 p-5 text-center backdrop-blur-xl">
              <p className="text-3xl font-semibold text-white">{officerCount}</p>
              <p className="mt-1 text-[11px] text-white/40">devices scanning now</p>
            </div>
          </div>
        )}

        {/* GO TO SCANNER */}
        <button
          onClick={() => router.push("/scan")}
          disabled={!activeEvent}
          className="h-12 rounded-xl bg-white text-sm font-medium text-black transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
        >
          Open Scanner
        </button>

        {/* MANUAL CHECK-IN */}
        <div className="rounded-2xl border border-white/10 bg-[#0f0f11]/80 p-5 backdrop-blur-xl flex flex-col gap-3">
          <p className="text-sm font-medium text-white">Manual Check-in</p>
          <input
            type="text"
            placeholder="Search name, NetID, or member ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 rounded-xl border border-white/10 bg-[#1c1c1e] px-3 text-sm text-white outline-none focus:border-white/20"
          />
          {searching && <p className="text-xs text-white/30">Searching...</p>}
          {actionMsg && <p className="text-xs text-[#f4a261]">{actionMsg}</p>}
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

        {/* RECENT SCANS */}
        {recent.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#0f0f11]/80 p-5 backdrop-blur-xl">
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

        {/* CREATE / RENAME EVENT */}
        <div className="rounded-2xl border border-white/10 bg-[#0f0f11]/80 p-5 backdrop-blur-xl flex flex-col gap-4">
          <p className="text-sm font-medium text-white">Manage Events</p>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-wider text-white/40">Create New Event</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Holi 2026"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                className="h-11 flex-1 rounded-xl border border-white/10 bg-[#1c1c1e] px-3 text-sm text-white outline-none"
              />
              <button onClick={createEvent} className="rounded-xl bg-white px-4 text-sm font-medium text-black">
                Add
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-wider text-white/40">Rename Event</label>
            <select
              value={renameFrom}
              onChange={(e) => setRenameFrom(e.target.value)}
              className="h-11 rounded-xl border border-white/10 bg-[#1c1c1e] px-3 text-sm text-white outline-none"
            >
              <option value="">— Select event to rename —</option>
              {events.map((ev) => (
                <option key={ev} value={ev}>{ev}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New name"
                value={renameTo}
                onChange={(e) => setRenameTo(e.target.value)}
                className="h-11 flex-1 rounded-xl border border-white/10 bg-[#1c1c1e] px-3 text-sm text-white outline-none"
              />
              <button onClick={renameEvent} className="rounded-xl bg-white px-4 text-sm font-medium text-black">
                Rename
              </button>
            </div>
          </div>

          {eventMsg && <p className="text-xs text-[#f4a261]">{eventMsg}</p>}
        </div>

        {/* EVENT COMPARISON STATS */}
        <div className="rounded-2xl border border-white/10 bg-[#0f0f11]/80 p-5 backdrop-blur-xl">
          <button onClick={toggleStats} className="flex w-full items-center justify-between text-sm font-medium text-white">
            Event Comparison
            <span className="text-white/40">{showStats ? "−" : "+"}</span>
          </button>
          {showStats && (
            <div className="mt-4 flex flex-col gap-2">
              {stats.length === 0 && <p className="text-xs text-white/30">No event data yet.</p>}
              {stats.map((s) => {
                const max = stats[0]?.count || 1;
                const pct = Math.max(4, (s.count / max) * 100);
                return (
                  <div key={s.event}>
                    <div className="flex justify-between text-xs text-white/60">
                      <span>{s.event}</span>
                      <span>{s.count}</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#FF9933] to-[#138808]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PASSWORD RESET */}
        <div className="rounded-2xl border border-white/10 bg-[#0f0f11]/80 p-5 backdrop-blur-xl flex flex-col gap-3">
          <p className="text-sm font-medium text-white">Reset Officer Password</p>
          <p className="text-xs text-white/40">
            Instantly logs out every device signed in with the officer account — use this if the password leaks mid-event.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New officer password"
              value={newOfficerPassword}
              onChange={(e) => setNewOfficerPassword(e.target.value)}
              className="h-11 flex-1 rounded-xl border border-white/10 bg-[#1c1c1e] px-3 text-sm text-white outline-none"
            />
            <button
              onClick={resetOfficerPassword}
              disabled={resetting}
              className="rounded-xl bg-red-500/90 px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {resetting ? "..." : "Reset"}
            </button>
          </div>
          {resetMsg && <p className="text-xs text-[#f4a261]">{resetMsg}</p>}
        </div>

      </div>
    </main>
  );
}