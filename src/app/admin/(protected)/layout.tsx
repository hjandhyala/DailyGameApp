import Link from "next/link";
import { Logo } from "@/components/Nav";
import { requireAdmin } from "@/lib/server/admin";
import { signOutAdmin } from "../actions";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/admin" className="flex items-center gap-2 font-black">
            <Logo size={28} /> <span className="hidden sm:inline">Admin</span>
          </Link>
          <AdminNav />
          <div className="ml-auto flex items-center gap-2 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {admin.image && <img src={admin.image} alt="" className="size-7 rounded-full" />}
            <span className="hidden font-bold sm:inline">@{admin.login}</span>
            <form action={signOutAdmin}>
              <button className="btn btn-ghost !px-3 !py-1.5 text-xs">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-5">{children}</main>
    </>
  );
}
