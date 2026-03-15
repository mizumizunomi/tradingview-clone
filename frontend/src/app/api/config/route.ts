import { NextResponse } from "next/server";

export async function GET() {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
  return NextResponse.json({ wsUrl: backendUrl });
}
