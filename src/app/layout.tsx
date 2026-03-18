import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/contexts/I18nContext";
import { SupabaseProvider } from "@/contexts/SupabaseContext";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RideSafe MY - Motorcycle Weather Safety",
  description:
    "Real-time weather safety scoring for motorcycle riders in Malaysia",
  manifest: "/manifest.json",
  icons: {
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} antialiased`}>
        <SupabaseProvider>
          <I18nProvider>{children}</I18nProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
