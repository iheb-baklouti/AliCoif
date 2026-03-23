/** Salon — [The Barber Chez Ali Chakroun sur Yandex Maps](https://yandex.com/maps/org/the_barber_chez_ali_chakroun/42006553481/) */
export const SALON = {
  name: "L'Artiste by Ali Chakroun",
  city: "Kairouan",
  country: "Tunisie",
  phoneDisplay: "+216 20 392 769",
  phoneTel: "+21620392769",
  /** Centre carte Yandex (ll=lon,lat dans l’URL Yandex — ici lat/lon WGS84) */
  lat: 35.671728,
  lon: 10.09674,
  yandexOrgUrl:
    "https://yandex.com/maps/org/the_barber_chez_ali_chakroun/42006553481/?ll=10.096740%2C35.671728&z=16",
} as const;

/** Iframe OpenStreetMap (bbox autour du marqueur) */
export function osmEmbedSrc() {
  const { lat, lon } = SALON;
  const d = 0.012;
  const minLon = lon - d;
  const maxLon = lon + d;
  const minLat = lat - d;
  const maxLat = lat + d;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${lat}%2C${lon}`;
}
