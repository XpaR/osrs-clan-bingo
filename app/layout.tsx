import type { Metadata, Viewport } from "next";
import { Cinzel, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-cinzel",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "OSRS Clan Bingo",
    template: "%s · OSRS Clan Bingo",
  },
  description:
    "Live board for an Old School RuneScape clan bingo. Team marks, proofs, and scores update for every visitor.",
};

export const viewport: Viewport = {
  themeColor: "#140f0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${cinzel.variable} ${sourceSans.variable} site-bg font-sans antialiased`}>{children}</body>
    </html>
  );
}
