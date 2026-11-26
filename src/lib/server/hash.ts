import "server-only";
import { createHash } from "node:crypto";

function salt() {
  const s = process.env.HASH_SALT;
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error("HASH_SALT must be set in production");
  }
  return s ?? "dev-salt";
}

export function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

/** Salted hash for anonymous identifiers (device ids, IPs). */
export function anonHash(kind: string, value: string) {
  return sha256(`${salt()}:${kind}:${value}`).slice(0, 32);
}

export function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}

const DEVICE_RE = /^[a-zA-Z0-9-]{16,64}$/;

/** Hash the X-Device-Id header; returns null if missing/invalid. */
export function deviceHashFrom(req: Request) {
  const id = req.headers.get("x-device-id");
  if (!id || !DEVICE_RE.test(id)) return null;
  return anonHash("device", id);
}

export function ipHashFrom(req: Request) {
  return anonHash("ip", clientIp(req));
}
