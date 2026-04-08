import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST — create or refresh guide token for a tour date
// Returns existing token if still valid, otherwise creates a new one
export async function POST(
  req: NextRequest,
  { params }: { params: { dateId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only Admin / Senior can generate guide tokens
  if (session.user.role === "FINANCE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tourDate = await prisma.tourDate.findUnique({
    where: { id: params.dateId },
    select: { id: true },
  });
  if (!tourDate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  // Default: token valid for 30 days from now; caller can pass custom days
  const days: number = typeof body.days === "number" ? body.days : 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  // Always create a fresh token (invalidates old link)
  const token = await prisma.guideToken.create({
    data: {
      tourDateId: params.dateId,
      expiresAt,
    },
  });

  return NextResponse.json({ token: token.token, expiresAt: token.expiresAt });
}

// GET — list existing tokens for a tour date
export async function GET(
  _req: NextRequest,
  { params }: { params: { dateId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tokens = await prisma.guideToken.findMany({
    where: { tourDateId: params.dateId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return NextResponse.json(tokens);
}
