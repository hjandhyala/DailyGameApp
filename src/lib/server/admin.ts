import "server-only";
import { redirect } from "next/navigation";
import { auth, isAllowedLogin } from "@/auth";

export interface AdminUser {
  login: string;
  name: string | null;
  image: string | null;
}

/** Local-only escape hatch so the dashboard can be previewed without OAuth credentials. Never active in production. */
function devBypass(): AdminUser | null {
  if (process.env.NODE_ENV !== "production" && process.env.ADMIN_DEV_BYPASS === "1") {
    return { login: "dev", name: "Local dev", image: null };
  }
  return null;
}

/** Returns the signed-in admin, or null. Re-checks the allow-list on every request. */
export async function getAdmin(): Promise<AdminUser | null> {
  const bypass = devBypass();
  if (bypass) return bypass;
  const session = await auth().catch(() => null);
  const login = (session?.user as { login?: string } | undefined)?.login;
  if (!session?.user || !isAllowedLogin(login)) return null;
  return { login: login!, name: session.user.name ?? null, image: session.user.image ?? null };
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
