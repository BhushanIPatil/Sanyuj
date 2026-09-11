
export type GeoPosition = {
  lat: number;
  lng: number;
};

export type ResolvedLocation = {
  address: string;
  pincode: string | null;
  lat: number;
  lng: number;
};

/** Indian PIN: first digit 1–9, then 5 digits. */
export function extractIndianPincode(...sources: Array<string | null | undefined>): string | null {
  for (const source of sources) {
    if (!source) continue;
    const match = source.match(/\b([1-9]\d{5})\b/);
    if (match) return match[1];
  }
  return null;
}

export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("Location permission denied. Allow location or enter details manually."));
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new Error("Location unavailable. Enter your address and pincode manually."));
        } else if (err.code === err.TIMEOUT) {
          reject(new Error("Location timed out. Try again or enter details manually."));
        } else {
          reject(new Error("Could not get your location"));
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<ResolvedLocation> {
  const res = await fetch(`/api/geo/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not resolve address");
  return {
    address: data.address as string,
    pincode: (data.pincode as string | null) ?? null,
    lat,
    lng,
  };
}

export async function detectLocation(): Promise<ResolvedLocation> {
  const { lat, lng } = await getCurrentPosition();
  return reverseGeocode(lat, lng);
}
