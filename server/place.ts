import type { PlaceResponse } from "../shared/schema.js";

/**
 * Turns rounded coordinates into a coarse place name (neighborhood or city)
 * with OpenStreetMap's reverse geocoder. Coordinates are rounded again here,
 * used once, and never stored or logged.
 */

interface NominatimAddress {
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city_district?: string;
  village?: string;
  hamlet?: string;
  town?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state?: string;
}

export function coarseName(a: NominatimAddress): string | null {
  return a.neighbourhood ?? a.suburb ?? a.quarter ?? a.village ?? a.hamlet ?? a.town ?? a.city_district ?? a.city ?? a.municipality ?? a.county ?? a.state ?? null;
}

export async function placeName(lat: number, lon: number): Promise<PlaceResponse> {
  const r = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&addressdetails=1&lat=${r(lat)}&lon=${r(lon)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": `Leaves journal (${process.env.GEOCODER_CONTACT || "leaves-app"})`,
        "accept-language": "en",
      },
    });
    if (!res.ok) return { name: null };
    const json = (await res.json()) as { address?: NominatimAddress };
    return { name: json.address ? coarseName(json.address) : null };
  } catch {
    return { name: null };
  } finally {
    clearTimeout(timer);
  }
}
