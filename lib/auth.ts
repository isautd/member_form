// Uses the Web Crypto API (crypto.subtle) instead of Node's `crypto` module,
// since Node's crypto isn't supported in the Edge Runtime where proxy.ts runs.

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12 hours

export type Role = "admin" | "officer";
export type Session = { role: Role; version: number };

const encoder = new TextEncoder();

async function getKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// version is only meaningful for officer sessions — it's the
// officer_password_version at the moment they logged in. If an admin
// resets the officer password, the version in Settings bumps, and any
// officer session carrying an older version gets force-logged-out.
// Admin sessions always use version 0 and ignore this mechanism.
export async function signSession(role: Role, version: number = 0): Promise<string> {
  const payload = `${role}.${Date.now()}.${version}`;
  const key = await getKey(SECRET);
  const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${bufferToHex(sigBuf)}`;
}

export async function verifySession(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 4) return null;

  const [role, ts, version, sig] = parts;
  const payload = `${role}.${ts}.${version}`;

  const key = await getKey(SECRET);
  const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expected = bufferToHex(sigBuf);

  if (expected !== sig) return null;
  if (role !== "admin" && role !== "officer") return null;

  const age = Date.now() - Number(ts);
  if (Number.isNaN(age) || age > MAX_AGE_MS) return null;

  return { role: role as Role, version: Number(version) || 0 };
}