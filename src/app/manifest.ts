import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DailyGames Hub",
    short_name: "DailyGames",
    description: "Track your daily games — no login needed.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f5fb",
    theme_color: "#6a4ce2",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    share_target: {
      action: "/add",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  } as MetadataRoute.Manifest;
}
