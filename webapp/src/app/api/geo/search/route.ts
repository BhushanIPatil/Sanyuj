import { NextResponse } from "next/server";

export const runtime = "nodejs";

type NominatimSearchResult = {
  lat: string;
  lon: string;
  display_name?: string;
  importance?: number;
};

/**
 * Proxy for Nominatim forward geocode (search).
 * Client must not call nominatim.openstreetmap.org directly (User-Agent / rate limits).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();

    if (q.length < 3) {
      return NextResponse.json({ error: "Query too short" }, { status: 400 });
    }
    if (q.length > 300) {
      return NextResponse.json({ error: "Query too long" }, { status: 400 });
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("q", q);
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "0");

    const geoRes = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Sanyuj/1.0 (local neighbourhood app; contact@sanyuj.app)",
      },
      next: { revalidate: 0 },
    });

    if (!geoRes.ok) {
      return NextResponse.json({ error: "Geocode search failed" }, { status: 502 });
    }

    const rows = (await geoRes.json()) as NominatimSearchResult[];
    const hit = rows[0];
    if (!hit) {
      return NextResponse.json({ ok: true, found: false, lat: null, lng: null });
    }

    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ ok: true, found: false, lat: null, lng: null });
    }

    return NextResponse.json({
      ok: true,
      found: true,
      lat,
      lng,
      display_name: hit.display_name ?? null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
