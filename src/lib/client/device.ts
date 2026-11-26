"use client";

const KEY = "dgh.deviceId";

function safeGet(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function safeSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {}
}
export const storage = { get: safeGet, set: safeSet, remove: (k: string) => { try { localStorage.removeItem(k); } catch {} } };

export function deviceId() {
  let id = safeGet(KEY);
  if (!id) {
    id = crypto.randomUUID();
    safeSet(KEY, id);
  }
  return id;
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    method: rest.method ?? (json !== undefined ? "POST" : "GET"),
    headers: {
      "x-device-id": deviceId(),
      ...(json !== undefined ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
