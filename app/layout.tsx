import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "断舍离整理教练",
  description: "拿起一件东西，回答几个自然的问题，得到一个清楚的决定。",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "整理教练" },
  icons: { icon: "/app-icon.svg", apple: "/app-icon.svg" },
};
export const viewport: Viewport = { themeColor: "#f3efe6", width: "device-width", initialScale: 1, viewportFit: "cover" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN"><body>{children}</body></html>; }
