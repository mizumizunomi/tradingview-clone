import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "NovaTrade — Professional Trading Terminal",
  description: "Trade crypto, forex, stocks and indices on a fast, professional terminal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="h-screen overflow-hidden" style={{ background: "var(--tv-bg)", color: "var(--tv-text-light)" }}>
        {children}
      </body>
    </html>
  );
}
