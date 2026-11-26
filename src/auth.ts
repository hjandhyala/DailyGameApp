import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export function adminLogins() {
  return (process.env.ADMIN_GITHUB_LOGINS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedLogin(login: string | null | undefined) {
  return !!login && adminLogins().includes(login.toLowerCase());
}

export const authConfigured = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET && process.env.AUTH_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  trustHost: true,
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/admin/login", error: "/admin/login" },
  callbacks: {
    // Only allow-listed GitHub usernames can sign in at all.
    signIn({ profile }) {
      return isAllowedLogin((profile as { login?: string } | undefined)?.login);
    },
    jwt({ token, profile }) {
      if (profile) token.login = (profile as { login?: string }).login;
      return token;
    },
    session({ session, token }) {
      (session.user as { login?: string }).login = token.login as string | undefined;
      return session;
    },
  },
});
