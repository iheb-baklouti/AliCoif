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
    default: "L'Artiste by Ali Chakroun | Excellence & Haute Coiffure pour Hommes",
    template: "%s | L'Artiste Kairouan",
  },
  description:
    "L'excellence de la coiffure masculine à Kairouan. Découvrez L'Artiste by Ali Chakroun : coupes de précision, rituels de barbe traditionnels et soins premium dans un cadre exclusif.",
  keywords: [
    "coiffeur kairouan",
    "barbier kairouan",
    "salon coiffure tunisie",
    "coupe hommes kairouan",
    "barbe kairouan",
    "ali chakroun coiffeur",
    "salon homme tunisie",
    "réservation coiffeur kairouan",
    "forfait mariage kairouan",
  ],
  openGraph: {
    title: "L'Artiste by Ali Chakroun — Coiffeur & Barbier à Kairouan",
    description:
      "Le salon de coiffure pour hommes à Kairouan, Tunisie. Coupes nettes, barbe, forfaits premium. Réservez en ligne.",
    type: "website",
    locale: "fr_FR",
    siteName: "L'Artiste by Ali Chakroun",
  },
  alternates: {
    canonical: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "L'Artiste by Ali Chakroun — Kairouan",
    description:
      "Salon de coiffure & barbier hommes à Kairouan, Tunisie. Réservation en ligne.",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: "/favicon.ico",
  },
  other: {
    "geo.region": "TN-41",
    "geo.placename": "Kairouan",
    "geo.position": "35.671728;10.096740",
    ICBM: "35.671728, 10.096740",
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  name: "L'Artiste by Ali Chakroun",
  description:
    "L'excellence de la coiffure masculine à Kairouan. Coupes de précision, rituels de barbe traditionnels et soins premium dans un cadre exclusif.",
  url: "https://ali-chakroun-coif.vercel.app",
  telephone: "+21620392769",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Kairouan",
    addressCountry: "TN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 35.671728,
    longitude: 10.096740,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:00",
      closes: "19:00",
    },
  ],
  currenciesAccepted: "TND",
  priceRange: "$$",
  servesCuisine: undefined,
  image: "https://ali-chakroun-coif.vercel.app/salon-facade.png",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
