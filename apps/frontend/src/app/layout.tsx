import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth/auth-context";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import "./globals.css";

// Self-hosted variable fonts: no external requests at runtime, which also
// suits a NOC tool that may be deployed on a network without internet access.
const inter = localFont({
  src: "./fonts/Inter.ttf",
  variable: "--font-inter",
  weight: "100 900",
});

const spaceGrotesk = localFont({
  src: "./fonts/SpaceGrotesk.ttf",
  variable: "--font-space-grotesk",
  weight: "300 700",
});

const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMono.ttf",
  variable: "--font-jetbrains-mono",
  weight: "100 800",
});

export const metadata: Metadata = {
  title: "UP NMS — University of Phayao Network Monitoring",
  description:
    "Network monitoring and alerting system for the University of Phayao (ระบบติดตามและเฝ้าระวังอุปกรณ์เครือข่าย มหาวิทยาลัยพะเยา)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <LocaleProvider>
          <AuthProvider>{children}</AuthProvider>
        </LocaleProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
