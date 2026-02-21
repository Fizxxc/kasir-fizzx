import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { makeDynamicQris } from "@/lib/qris";

export async function POST(req: Request) {
  const { baseQris, amount } = await req.json();

  if (!baseQris || typeof baseQris !== "string") {
    return NextResponse.json({ error: "baseQris required" }, { status: 400 });
  }
  const num = Number(amount);
  if (!Number.isFinite(num) || num <= 0) {
    return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
  }

  const payload = makeDynamicQris(baseQris, num);

  // Generate QR image as data URL for display
  const qrDataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 360 });

  return NextResponse.json({ payload, qrDataUrl });
}