import { Nav } from "@/components/Nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 sm:pb-12">{children}</main>
    </>
  );
}
