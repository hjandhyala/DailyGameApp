import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { ClientInit } from "@/components/ClientInit";
import "./globals.css";

const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], weight: ["400", "600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: { default: "DailyGames Hub", template: "%s · DailyGames Hub" },
  description: "Track your daily games — Krillion, Daily Tens, Wordle, Connections and more. No login needed.",
  applicationName: "DailyGames Hub",
  appleWebApp: { capable: true, title: "DailyGames", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5fb" },
    { media: "(prefers-color-scheme: dark)", color: "#110f1a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeScript = `try{var t=localStorage.getItem("dgh.theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <ClientInit />
        {children}
      </body>
    </html>
  );
}
