// This route is deprecated. Use /api/admin/tours/[id]/departures instead.
import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ error: "Deprecated. Use /api/admin/tours/[id]/departures" }, { status: 410 });
}
export async function POST() {
  return NextResponse.json({ error: "Deprecated. Use /api/admin/tours/[id]/departures" }, { status: 410 });
}
