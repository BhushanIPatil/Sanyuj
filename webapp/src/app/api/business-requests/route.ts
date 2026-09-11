import { NextResponse } from "next/server";
import { corsPreflight, withCors } from "@/lib/api/cors";
export const OPTIONS = corsPreflight;
export async function POST(req: Request) { return withCors(req, NextResponse.json({ error: "Business requests are no longer available." }, { status: 410 })); }
