import type { Metadata } from "next";
import { DM_Sans, Great_Vibes } from "next/font/google";
import Script from "next/script";
import { getMetadataBaseUrl } from "@/lib/site-url";
import "./globals.css";

const display = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const sans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  applicationName: "L'Artiste by Ali Chakroun",
  metadataBase: getMetadataBaseUrl(),
  title: {
    default: "L'Artiste by Ali Chakroun — Salon hommes",
    template: "%s | L'Artiste",
  },
  description:
    "Salon barbier & coiffure pour hommes à Kairouan : coupes, barbe, forfait mariage. Réservation en ligne.",
  openGraph: {
    title: "L'Artiste by Ali Chakroun",
    description: "Salon hommes — réservation et suivi en direct.",
    type: "website",
    locale: "fr_FR",
    siteName: "L'Artiste by Ali Chakroun",
  },
  alternates: {
    canonical: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "L'Artiste by Ali Chakroun",
    description: "Salon hommes — réservation et suivi en direct.",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      data-theme="dark"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} h-full`}
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(() => {
            try {
              const stored = localStorage.getItem("theme");
              const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
              const theme = stored === "light" || stored === "dark" ? stored : (prefersLight ? "light" : "dark");
              document.documentElement.setAttribute("data-theme", theme);
            } catch {
              document.documentElement.setAttribute("data-theme", "dark");
            }
          })();`}
        </Script>
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
