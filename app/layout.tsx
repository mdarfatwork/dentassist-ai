import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DentAssist AI",
    template: "%s | DentAssist AI",
  },
  description:
    "AI receptionist for dental clinics. Answer patient questions, manage appointments, and provide 24/7 assistance.",
};

import { TRPCProvider } from "@/lib/trpc/Provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistMono.variable, "font-sans")}
      style={{
        ["--font-sans" as string]: "'Google Sans', sans-serif",
      }}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
