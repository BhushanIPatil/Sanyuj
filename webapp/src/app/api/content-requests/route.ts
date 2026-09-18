import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/auth/admin";
import { clientIp } from "@/lib/rate-limit";
import { corsPreflight, withCors } from "@/lib/api/cors";

export const runtime = "nodejs";
export const OPTIONS = corsPreflight;
const MAX_IMAGE = 3 * 1024 * 1024;
const MAX_BODY = MAX_IMAGE + 16 * 1024;

export async function POST(req: Request) {
  const reply = (body: object, status = 200) => withCors(req, NextResponse.json(body, { status }));
  if (!req.headers.get("content-type")?.startsWith("multipart/form-data")) return reply({ error: "Please submit the form with an image." }, 400);
  if (Number(req.headers.get("content-length")) > MAX_BODY) return reply({ error: "Choose an image smaller than 3 MB." }, 413);
  try {
    const admin = createAdminClient();
    const { data: limit, error: rateError } = await admin.rpc("check_and_consume_rate_limit", {
      p_action: "content_request", p_subject_type: "ip", p_subject_key: clientIp(req), p_limit: 5, p_window_seconds: 3600,
    });
    if (rateError || !limit) return reply({ error: "Requests are temporarily unavailable. Please try again shortly." }, 503);
    if (!limit.allowed) return reply({ error: "You have sent several requests. Please try again in an hour." }, 429);
    // Bound chunked bodies too; content-length is not supplied by every client.
    const reader = req.body?.getReader();
    if (!reader) return reply({ error: "The form is empty." }, 400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY) { await reader.cancel(); return reply({ error: "Choose an image smaller than 3 MB." }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const form = await new Request(req.url, { method: "POST", headers: { "content-type": req.headers.get("content-type")! }, body: bytes }).formData();
    const field = (key: string) => typeof form.get(key) === "string" ? (form.get(key) as string).trim() : "";
    const kind = field("kind"), name = field("name"), contact = field("contact"), details = field("details");
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phone = /^\+?[\d\s().-]+$/;
    const digits = contact.replace(/\D/g, "");
    if (!["offer", "notice"].includes(kind) || name.length < 2 || name.length > 100 || contact.length > 150 || details.length > 2000 || !(email.test(contact) || (phone.test(contact) && digits.length >= 8 && digits.length <= 15))) {
      return reply({ error: "Enter your name and a valid phone number or email address." }, 400);
    }
    const file = form.get("image");
    if (!file || typeof file === "string" || !file.size || file.size > MAX_IMAGE) return reply({ error: "Add a JPG, PNG or WebP image smaller than 3 MB." }, 400);
    const image = new Uint8Array(await file.arrayBuffer());
    const isJpg = image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
    const isPng = [137,80,78,71,13,10,26,10].every((v, i) => image[i] === v);
    const isWebp = String.fromCharCode(...image.slice(0,4)) === "RIFF" && String.fromCharCode(...image.slice(8,12)) === "WEBP";
    const extension = isJpg ? "jpg" : isPng ? "png" : isWebp ? "webp" : null;
    if (!extension) return reply({ error: "Choose a JPG, PNG or WebP image." }, 400);
    const id = randomUUID();
    const imagePath = `${id}.${extension}`;
    const storage = admin.storage.from("request-images");
    const { error: uploadError } = await storage.upload(imagePath, image, { contentType: `image/${extension === "jpg" ? "jpeg" : extension}`, upsert: false });
    if (uploadError) return reply({ error: "Could not upload the image. Please try again." }, 503);
    try {
      const { error } = await admin.from("content_requests").insert({ id, kind, name, contact, details, image_path: imagePath });
      if (error) throw error;
    } catch {
      await storage.remove([imagePath]);
      return reply({ error: "Could not save your request. Please try again." }, 503);
    }
    return reply({ ok: true, id }, 201);
  } catch {
    return reply({ error: "Could not submit your request. Please check the form and try again." }, 400);
  }
}
