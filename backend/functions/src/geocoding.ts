const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Best-effort geocoding via OpenStreetMap's free Nominatim API — no API key or billing account
 * required, unlike Google/Mapbox. Subject to a fair-use rate limit (max ~1 request/sec per their
 * usage policy), so this must never be called in a tight loop or batch. Never throws; returns
 * null on any failure (network error, rate limit, no match for the address) so a geocoding
 * hiccup never blocks a booking from being created.
 */
export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  try {
    const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BeautyBookingApp/1.0 (booking travel-buffer estimation)' },
    });
    if (!res.ok) return null;
    const results = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (results.length === 0) return null;
    const lat = Number(results[0].lat);
    const lng = Number(results[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch (err) {
    console.error('geocodeAddress failed:', err);
    return null;
  }
}
