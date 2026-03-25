/**
 * URL publique du site (SEO, metadata, sitemap).
 * Accepte `https://domaine.tn` ou `domaine.tn` (on préfixe https://).
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return "http://localhost:3000";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw.replace(/\/$/, "");
  return `https://${raw.replace(/\/$/, "")}`;
}

export function getMetadataBaseUrl(): URL {
  try {
    return new URL(`${getSiteUrl()}/`);
  } catch {
    return new URL("http://localhost:3000/");
  }
}
