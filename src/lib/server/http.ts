import "server-only";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export function json<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

export function error(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function parseBody<T>(req: Request, schema: ZodType<T>, maxBytes = 256_000) {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) return { ok: false as const, res: error(413, "Body too large") };
  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > maxBytes) return { ok: false as const, res: error(413, "Body too large") };
    raw = text ? JSON.parse(text) : {};
  } catch {
    return { ok: false as const, res: error(400, "Invalid JSON") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, res: error(400, "Invalid input", { issues: parsed.error.issues }) };
  }
  return { ok: true as const, data: parsed.data };
}

export function utcDay(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
