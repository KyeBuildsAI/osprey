export type ConnectorStatus = "LIVE" | "CACHED" | "DEGRADED" | "PENDING" | "STALE" | "UNAVAILABLE" | "DEMO";

export interface ConnectorHealth {
  id: string;
  name: string;
  role: string;
  status: ConnectorStatus;
  eventTime: string | null;
  receivedAt: string;
  ageMinutes: number | null;
  lastAttemptAt: string;
  lastSuccessAt: string | null;
  fallback: string | null;
  message: string;
  affects: string[];
}

export function minutesSince(timestamp: string | null, now = Date.now()) {
  if (!timestamp) return null;
  const value = Date.parse(timestamp);
  return Number.isFinite(value) ? Math.max(0, Math.round((now - value) / 60_000)) : null;
}

