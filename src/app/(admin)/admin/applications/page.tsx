import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import KanbanBoard from "@/components/admin/kanban/KanbanBoard";
import type { KanbanApplication } from "@/components/admin/kanban/KanbanCard";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isManager = session.user.role === "MANAGER";

  const applications = await prisma.application.findMany({
    where: isManager ? { managerId: session.user.id } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true, whatsapp: true, country: true } },
      tour: { select: { id: true, title: true } },
      manager: { select: { id: true, name: true } },
      booking: {
        select: {
          finalPrice: true,
          depositPaid: true,
          paymentStatus: true,
          currency: true,
        },
      },
    },
    take: 500,
  });

  // Serialize dates for client component
  const serialized: KanbanApplication[] = applications.map((a) => ({
    id: a.id,
    status: a.status,
    persons: a.persons,
    preferredDate: a.preferredDate ?? null,
    utmSource: a.utmSource ?? null,
    createdAt: a.createdAt.toISOString(),
    client: a.client,
    tour: a.tour,
    manager: a.manager,
    booking: a.booking
      ? {
          finalPrice: a.booking.finalPrice,
          depositPaid: a.booking.depositPaid,
          paymentStatus: a.booking.paymentStatus,
          currency: a.booking.currency,
        }
      : null,
  }));

  const newCount = serialized.filter((a) => a.status === "NEW").length;
  const total = serialized.length;

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Заявки</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {total} всего
            {newCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {newCount} новых
              </span>
            )}
          </p>
        </div>
        <Link
          href="/admin/applications/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
        >
          + Новая заявка
        </Link>
      </div>

      <div className="flex-1 overflow-x-auto">
        <KanbanBoard initialApplications={serialized} />
      </div>
    </div>
  );
}
