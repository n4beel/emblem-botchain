import type { Metadata, Viewport } from "next";
import { Playfair_Display, Lato, Cousine } from "next/font/google";
import { EvmProvider } from "@/components/providers/EvmProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { app } from "@/lib/app-config";
import "./globals.css";

const cert = Playfair_Display({ variable: "--font-cert", subsets: ["latin"], display: "swap" });
const text = Lato({ variable: "--font-text", subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const id = Cousine({ variable: "--font-id", subsets: ["latin"], weight: ["400", "700"], display: "swap" });

export const metadata: Metadata = {
  title: `${app.name} — ${app.tagline}`,
  description: app.tagline,
  openGraph: { title: app.name, description: app.tagline, type: "website", url: app.url },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F5F3EF" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cert.variable} ${text.variable} ${id.variable} h-full`}>
      <body className="min-h-full antialiased">
        <EvmProvider>
          <ToastProvider>{children}</ToastProvider>
        </EvmProvider>
      </body>
    </html>
  );
}
