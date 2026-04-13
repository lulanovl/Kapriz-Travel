import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/groups/[id]/assign
// Body: { applicationIds: string[], unassign?: boolean }
// Assigns (or unassigns) applications to a group
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { applicationIds, unassign } = await req.json();

  if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
    return NextResponse.json({ error: "applicationIds обязателен" }, { status: 400 });
  }

  if (unassign) {
    // Remove from group, revert IN_BUS → DEPOSIT
    await prisma.application.updateMany({
      where: { id: { in: applicationIds }, status: "IN_BUS" },
      data: { groupId: null, status: "DEPOSIT" },
    });
    // Also clear groupId for non-IN_BUS applications (edge case)
    await prisma.application.updateMany({
      where: { id: { in: applicationIds }, status: { not: "DEPOSIT" } },
      data: { groupId: null },
    });
    return NextResponse.json({ ok: true, unassigned: applicationIds.length });
  }

  // Verify the group exists
  const group = await prisma.group.findUnique({ where: { id: params.id } });
  if (!group) return NextResponse.json({ error: "Группа не найдена" }, { status: 404 });

  // Assign applications to group and set IN_BUS status
  await prisma.application.updateMany({
    where: { id: { in: applicationIds } },
    data: { groupId: params.id, status: "IN_BUS" },
  });

  return NextResponse.json({ ok: true, assigned: applicationIds.length });
}
