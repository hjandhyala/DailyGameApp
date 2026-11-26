import { redirect } from "next/navigation";
import { authConfigured } from "@/auth";
import { Logo } from "@/components/Nav";
import { getAdmin } from "@/lib/server/admin";
import { signInWithGitHub } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminLogin({ searchParams }: PageProps<"/admin/login">) {
  if (await getAdmin()) redirect("/admin");
  const { error } = await searchParams;
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="card w-full max-w-sm space-y-4 p-6 text-center">
        <div className="flex justify-center">
          <Logo size={44} />
        </div>
        <div>
          <h1 className="text-2xl font-black">Admin</h1>
          <p className="text-sm text-ink-2">Moderation & usage dashboard</p>
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-bold text-danger">
            {error === "AccessDenied" ? "That GitHub account isn't on the admin list." : "Sign-in failed. Please try again."}
          </p>
        )}
        {authConfigured ? (
          <form action={signInWithGitHub}>
            <button className="btn w-full bg-[#24292f] text-white hover:bg-[#32383f]">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              Sign in with GitHub
            </button>
          </form>
        ) : (
          <div className="rounded-xl bg-surface-2 p-3 text-left text-sm text-ink-2">
            <p className="font-bold text-ink">GitHub sign-in isn’t configured yet.</p>
            <p className="mt-1">
              Set <code>AUTH_SECRET</code>, <code>AUTH_GITHUB_ID</code>, <code>AUTH_GITHUB_SECRET</code> and <code>ADMIN_GITHUB_LOGINS</code>. See the README.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
