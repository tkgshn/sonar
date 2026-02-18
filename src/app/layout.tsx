import type { Metadata } from "next";
import Script from "next/script";
import { Geist } from "next/font/google";
import { ThemeProvider } from "@/components/ui/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "https://baisoku-survey.plural-reality.com"
  ),
  title: "倍速アンケート - AIとの対話で深い意見を素早く集める",
  description:
    "AIとの対話を通じて、回答者の本音や考えを掘り下げるアンケートツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      {process.env.NEXT_PUBLIC_UMAMI_URL && process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
        <Script
          defer
          src={`${process.env.NEXT_PUBLIC_UMAMI_URL.replace(/\/$/, "")}/umami`}
          data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          strategy="afterInteractive"
        />
      )}
      <body className={`${geistSans.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
