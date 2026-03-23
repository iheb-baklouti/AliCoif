import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "L'Artiste by Ali Chakroun",
    short_name: "L'Artiste",
    description: "Salon hommes a Kairouan: reservation, suivi des sieges et services premium.",
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#c9a227",
    lang: "fr",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}
