import { NextResponse } from "next/server";
import { encode } from "pluscodes";
import { extractIndianPincode } from "@/lib/geo/location";

export const runtime = "nodejs";

type NominatimAddress = {
  postcode?: string;
  house_number?: string;
  road?: string;
  residential?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  hamlet?: string;
  village?: string;
  town?: string;
  city_district?: string;
  city?: string;
  county?: string;
  state_district?: string;
  state?: string;
  country?: string;
  amenity?: string;
  building?: string;
  [key: string]: string | undefined;
};

type NominatimResponse = {
  display_name?: string;
  address?: NominatimAddress;
  error?: string;
};

type PhotonProps = {
  name?: string;
  street?: string;
  housenumber?: string;
  district?: string;
  city?: string;
  locality?: string;
  county?: string;
  state?: string;
  country?: string;
  postcode?: string;
  type?: string;
  osm_key?: string;
  osm_value?: string;
};

type AddressParts = {
  place?: string;
  road?: string;
  neighbourhood?: string;
  locality?: string;
  city?: string;
  district?: string;
  state?: string;
  postcode?: string;
  country?: string;
};

function uniqParts(parts: Array<string | undefined | null>): string[] {
  const out: string[] = [];
  for (const raw of parts) {
    const part = raw?.trim();
    if (!part) continue;
    if (out.some((p) => p.toLowerCase() === part.toLowerCase())) continue;
    out.push(part);
  }
  return out;
}

function plusCodeFor(lat: number, lng: number): string {
  // ~3m precision (11 chars). Short form drops the area prefix, Google Maps style.
  const full = encode({ latitude: lat, longitude: lng }, 11);
  if (!full || full.length < 9) {
    return encode({ latitude: lat, longitude: lng }, 10) ?? full ?? "";
  }
  // e.g. 7JHQ2GHC+4V8 → 2GHC+4V8 (safe with city/locality in the address line)
  return full.slice(4);
}

function fromNominatim(data: NominatimResponse | null): AddressParts {
  const a = data?.address;
  if (!a) return {};
  return {
    place: a.amenity || a.building,
    road: [a.house_number, a.road].filter(Boolean).join(" ") || undefined,
    neighbourhood: a.residential || a.neighbourhood || a.suburb || a.quarter || a.hamlet,
    locality: a.village || a.town || a.city_district,
    city: a.city || a.town || a.village,
    district: a.state_district || a.county,
    state: a.state,
    postcode: a.postcode,
    country: a.country,
  };
}

function fromPhoton(props: PhotonProps | null): AddressParts {
  if (!props) return {};
  const street =
    props.street ||
    (props.type === "street" || props.osm_key === "highway" ? props.name : undefined);
  const neighbourhood =
    props.district ||
    (props.type === "district" || props.type === "locality" ? props.name : undefined) ||
    props.locality;
  return {
    place: props.type === "house" || props.osm_key === "amenity" ? props.name : undefined,
    road: [props.housenumber, street].filter(Boolean).join(" ") || undefined,
    neighbourhood,
    locality: props.locality,
    city: props.city,
    district: props.county,
    state: props.state,
    postcode: props.postcode,
    country: props.country,
  };
}

function mergeParts(primary: AddressParts, secondary: AddressParts): AddressParts {
  return {
    place: primary.place || secondary.place,
    road: primary.road || secondary.road,
    neighbourhood: primary.neighbourhood || secondary.neighbourhood,
    locality: primary.locality || secondary.locality,
    city: primary.city || secondary.city,
    district: primary.district || secondary.district,
    state: primary.state || secondary.state,
    postcode: primary.postcode || secondary.postcode,
    country: primary.country || secondary.country,
  };
}

/** Google Maps–style line: short Plus Code + finest available place names. */
function formatAddress(lat: number, lng: number, parts: AddressParts): string {
  const code = plusCodeFor(lat, lng);
  const area = uniqParts([
    parts.place,
    parts.road,
    parts.neighbourhood,
    parts.locality,
    parts.city,
  ]);
  // Prefer neighbourhood/street over repeating city-only strings.
  const statePin = [parts.state, parts.postcode].filter(Boolean).join(" ");
  const tail = uniqParts([statePin || undefined, parts.country || "India"]);
  return [code, ...area, ...tail].join(", ");
}

async function fetchNominatim(lat: number, lng: number): Promise<NominatimResponse | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("accept-language", "en");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "Sanyuj/1.0 (local neighbourhood app; contact@sanyuj.app)",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as NominatimResponse;
  if (data.error) return null;
  return data;
}

async function fetchPhoton(lat: number, lng: number): Promise<PhotonProps | null> {
  const url = new URL("https://photon.komoot.io/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("lang", "en");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { features?: Array<{ properties?: PhotonProps }> };
  return data.features?.[0]?.properties ?? null;
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

    const [nominatim, photon] = await Promise.all([
      fetchNominatim(lat, lng),
      fetchPhoton(lat, lng),
    ]);

    // Photon often has street/area names where Nominatim only returns the city.
    const parts = mergeParts(fromPhoton(photon), fromNominatim(nominatim));
    const address = formatAddress(lat, lng, parts);
    const pincode = extractIndianPincode(parts.postcode, address, nominatim?.display_name);

    return NextResponse.json({
      ok: true,
      address,
      pincode,
      lat,
      lng,
      raw_postcode: parts.postcode ?? null,
      plus_code: plusCodeFor(lat, lng),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
