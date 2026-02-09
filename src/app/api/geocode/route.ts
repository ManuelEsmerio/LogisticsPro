import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const FALLBACK_COORDINATES = { latitude: 20.8833, longitude: -103.8360 };

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json().catch(() => ({ address: "" }));
    if (!address || typeof address !== "string") {
      return NextResponse.json(FALLBACK_COORDINATES, { status: 200 });
    }

    const apiKey = process.env.OPENROUTE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(FALLBACK_COORDINATES, { status: 200 });
    }

    const url = new URL("https://api.openrouteservice.org/geocode/search");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("text", address);
    url.searchParams.set("boundary.country", "MEX");
    url.searchParams.set("size", "1");

    const response = await fetch(url.toString());

    if (!response.ok) {
      return NextResponse.json(FALLBACK_COORDINATES, { status: 200 });
    }

    const data = await response.json();
    const coords = data?.features?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) {
      return NextResponse.json(FALLBACK_COORDINATES, { status: 200 });
    }

    const [longitude, latitude] = coords;
    return NextResponse.json({ latitude, longitude }, { status: 200 });
  } catch (error) {
    return NextResponse.json(FALLBACK_COORDINATES, { status: 200 });
  }
}
