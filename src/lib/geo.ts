/**
 * Locations for open games: distance maths, the browser's position and
 * place search through OpenStreetMap's Nominatim (free, no key; their usage
 * policy asks for at most ~1 request per second, so callers debounce).
 */

export interface Place {
  /** Short label for the UI ("Alcorcón, Madrid"). */
  label: string;
  city: string;
  lat: number;
  lng: number;
}

/** Great-circle distance in km. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number | null | undefined): string | null {
  if (km == null) return null;
  if (km < 1) return "a menos de 1 km";
  return `a ${km < 10 ? km.toFixed(1).replace(".", ",") : Math.round(km)} km`;
}

const NOMINATIM = "https://nominatim.openstreetmap.org";

type NominatimAddress = Record<string, string | undefined>;

function cityOf(address: NominatimAddress | undefined): string {
  if (!address) return "";
  return address.city || address.town || address.village || address.municipality || address.county || address.state || "";
}

function labelOf(address: NominatimAddress | undefined, fallback: string): string {
  const city = cityOf(address);
  const region = address?.province || address?.state;
  return [city, region && region !== city ? region : null].filter(Boolean).join(", ") || fallback.split(",").slice(0, 2).join(",");
}

/** Places matching free text in Spain (city, street, shop…). */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=es&accept-language=es&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const rows = (await res.json()) as { lat: string; lon: string; display_name: string; address?: NominatimAddress }[];
  return rows.map((r) => ({
    label: r.display_name.split(",").slice(0, 3).join(",").trim(),
    city: cityOf(r.address),
    lat: Number(r.lat),
    lng: Number(r.lon),
  }));
}

/** Town or city at a point, for "use my location". */
export async function reversePlace(lat: number, lng: number): Promise<Place> {
  try {
    const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&zoom=10&addressdetails=1&accept-language=es&lat=${lat}&lon=${lng}`, {
      headers: { Accept: "application/json" },
    });
    const r = (await res.json()) as { display_name?: string; address?: NominatimAddress };
    return { label: labelOf(r.address, r.display_name ?? "Mi ubicación"), city: cityOf(r.address), lat, lng };
  } catch {
    return { label: "Mi ubicación", city: "", lat, lng };
  }
}

/** The browser's position (asks for permission). */
export function currentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Tu navegador no permite obtener la ubicación."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Has denegado el acceso a tu ubicación. Busca tu ciudad a mano."
              : "No se pudo obtener tu ubicación.",
          ),
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

const SAVED_KEY = "administratum:search-place";

/** Where the user last searched for games (this browser only). */
export function savedPlace(): Place | null {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? (JSON.parse(raw) as Place) : null;
  } catch {
    return null;
  }
}

export function savePlace(place: Place | null): void {
  try {
    if (place) localStorage.setItem(SAVED_KEY, JSON.stringify(place));
    else localStorage.removeItem(SAVED_KEY);
  } catch {
    // Private mode: the search just isn't remembered.
  }
}
