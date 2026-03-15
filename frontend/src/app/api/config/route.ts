import { NextResponse } from "next/server";

export async function GET() {
  const raw = process.env.BACKEND_URL || "http://localhost:3001";
  const wsUrl = raw.startsWith("http") ? raw : `https://${raw}`;
  return NextResponse.json({ wsUrl });
}
