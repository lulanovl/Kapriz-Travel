// This route is deprecated. Use /api/admin/groups/[id]/expenses instead.
import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ error: "Deprecated. Use /api/admin/groups/[id]/expenses" }, { status: 410 });
}
export async function POST() {
  return NextResponse.json({ error: "Deprecated. Use /api/admin/groups/[id]/expenses" }, { status: 410 });
}
