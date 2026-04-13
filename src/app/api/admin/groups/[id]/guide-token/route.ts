import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST — create guide token for a group
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "FINANCE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const group = await prisma.group.findUnique({ where: { id: params.id } });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const days: number = typeof body.days === "number" ? body.days : 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  const token = await prisma.guideToken.create({
    data: { groupId: params.id, expiresAt },
  });

  return NextResponse.json({ token: token.token, expiresAt: token.expiresAt });
}

// GET — list existing tokens for a group
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tokens = await prisma.guideToken.findMany({
    where: { groupId: params.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return NextResponse.json(tokens);
}
