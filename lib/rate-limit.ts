const ipRequests = new Map<
  string,
  { count: number; timestamp: number }
>();

const WINDOW_SIZE = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;

export function rateLimit(ip: string) {
  const now = Date.now();

  const existing = ipRequests.get(ip);

  if (!existing) {
    ipRequests.set(ip, {
      count: 1,
      timestamp: now,
    });

    return true;
  }

  // RESET WINDOW
  if (now - existing.timestamp > WINDOW_SIZE) {
    ipRequests.set(ip, {
      count: 1,
      timestamp: now,
    });

    return true;
  }

  // LIMIT EXCEEDED
  if (existing.count >= MAX_REQUESTS) {
    return false;
  }

  existing.count += 1;

  return true;
}