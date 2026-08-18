import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AgentationProvider } from "@/components/AgentationProvider";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RepoGuide — Understand any codebase in minutes",
    template: "%s · RepoGuide",
  },
  description:
    "Connect your GitHub repository and get an AI-powered map of its architecture, important files, documentation, and codebase Q&A.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body className="font-[family-name:var(--font-body)] antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <AgentationProvider />
      </body>
    </html>
  );
}
