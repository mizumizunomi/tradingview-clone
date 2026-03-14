import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradingView Clone",
  description: "Local trading platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="h-screen overflow-hidden bg-[#131722] text-[#d1d4dc]">
        {children}
      </body>
    </html>
  );
}
