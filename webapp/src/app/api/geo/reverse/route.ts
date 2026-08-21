import { NextResponse } from "next/server";
import { extractIndianPincode } from "@/lib/geo/location";

export const runtime = "nodejs";

type NominatimAddress = {
  postcode?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  town?: string;
  city?: string;
  state_district?: string;
  state?: string;
  country?: string;
};

type NominatimResponse = {
  display_name?: string;
  address?: NominatimAddress;
  error?: string;
};

function buildAddress(data: NominatimResponse): string {
  const a = data.address;
  if (!a) return data.display_name?.trim() || "";

  const parts = [
    a.road,
    a.neighbourhood || a.suburb || a.village,
    a.town || a.city,
    a.state_district,
    a.state,
    a.postcode,
  ].filter(Boolean);

  if (parts.length) return parts.join(", ");
  return data.display_name?.trim() || "";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: "Coordinates out of range" }, { status: 400 });
    }

    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("zoom", "18");

    const geoRes = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Sanyuj/1.0 (local neighbourhood app; contact@sanyuj.app)",
      },
      next: { revalidate: 0 },
    });

    if (!geoRes.ok) {
      return NextResponse.json({ error: "Reverse geocode failed" }, { status: 502 });
    }

    const data = (await geoRes.json()) as NominatimResponse;
    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 404 });
    }

    const address = buildAddress(data);
    const pincode = extractIndianPincode(data.address?.postcode, address, data.display_name);

    return NextResponse.json({
      ok: true,
      address,
      pincode,
      lat,
      lng,
      raw_postcode: data.address?.postcode ?? null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
