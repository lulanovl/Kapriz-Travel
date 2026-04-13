// This route is deprecated. Use /api/admin/departures/[id] instead.
import { NextResponse } from "next/server";
export async function PUT() {
  return NextResponse.json({ error: "Deprecated. Use /api/admin/departures/[id]" }, { status: 410 });
}
export async function DELETE() {
  return NextResponse.json({ error: "Deprecated. Use /api/admin/departures/[id]" }, { status: 410 });
}
