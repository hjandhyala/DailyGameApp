"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { requireAdmin } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { games, reports } from "@/lib/server/schema";
import { CATEGORY_IDS } from "@/lib/shared/categories";

export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/admin" });
}

export async function signOutAdmin() {
  await signOut({ redirectTo: "/admin/login" });
}

const Moderate = z.object({
  id: z.string().min(1),
  action: z.enum(["hide", "restore", "remove", "clear_reports"]),
});

export async function moderateGame(formData: FormData) {
  await requireAdmin();
  const { id, action } = Moderate.parse(Object.fromEntries(formData));
  const now = Date.now();
  if (action === "hide") await db.update(games).set({ status: "hidden", updatedAt: now }).where(eq(games.id, id));
  if (action === "remove") await db.update(games).set({ status: "removed", updatedAt: now }).where(eq(games.id, id));
  if (action === "restore" || action === "clear_reports") {
    // Reviewed: earlier reports no longer count toward auto-hide.
    await db.update(games).set({ status: "active", reviewedAt: now, reportCount: 0, updatedAt: now }).where(eq(games.id, id));
  }
  if (action === "clear_reports") await db.delete(reports).where(eq(reports.gameId, id));
  revalidatePath("/admin/games");
  revalidatePath("/explore");
}

const Edit = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  url: z.string().trim().url().max(500),
  description: z.string().trim().max(280),
  category: z.enum(CATEGORY_IDS),
});

export async function editGame(formData: FormData) {
  await requireAdmin();
  const d = Edit.parse(Object.fromEntries(formData));
  await db
    .update(games)
    .set({ name: d.name, url: d.url, description: d.description, category: d.category, updatedAt: Date.now() })
    .where(eq(games.id, d.id));
  revalidatePath("/admin/games");
}
