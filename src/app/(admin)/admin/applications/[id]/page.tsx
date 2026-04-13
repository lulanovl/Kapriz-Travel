import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ApplicationDetailClient from "@/components/admin/ApplicationDetailClient";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Новая",
  CONTACT: "Контакт",
  PROPOSAL: "КП",
  DEPOSIT: "Предоплата",
  IN_BUS: "В автобусе",
  NO_SHOW: "Не явился",
  ON_TOUR: "В туре",
  FEEDBACK: "Отзыв",
  ARCHIVE: "Архив",
};

export default async function ApplicationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      tour: { select: { id: true, title: true, basePrice: true, slug: true } },
      departure: { select: { id: true, departureDate: true } },
      group: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true, email: true } },
      booking: {
        include: {
          priceHistory: {
            orderBy: { changedAt: "desc" },
            include: {},
          },
        },
      },
      reminders: {
        orderBy: { dueAt: "asc" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  if (!application) notFound();

  if (
    session.user.role === "MANAGER" &&
    application.managerId !== session.user.id
  ) {
    redirect("/admin/applications");
  }

  // Get managers and departures for dropdowns
  const [managers, tourDepartures] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SENIOR_MANAGER", "MANAGER"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.departure.findMany({
      where: {
        tourId: application.tourId,
        OR: [
          { status: "OPEN" },
          // include current departure even if not OPEN
          ...(application.departureId ? [{ id: application.departureId }] : []),
        ],
      },
      orderBy: { departureDate: "asc" },
      select: { id: true, departureDate: true, status: true },
    }),
  ]);

  // Serialize
  const data = {
    id: application.id,
    status: application.status,
    persons: application.persons,
    comment: application.comment ?? null,
    utmSource: application.utmSource ?? null,
    utmMedium: application.utmMedium ?? null,
    utmCampaign: application.utmCampaign ?? null,
    isWaitlist: application.isWaitlist,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
    client: {
      id: application.client.id,
      name: application.client.name,
      whatsapp: application.client.whatsapp,
      country: application.client.country ?? null,
      city: application.client.city ?? null,
      tag: application.client.tag ?? null,
      notes: application.client.notes ?? null,
    },
    tour: application.tour,
    departure: application.departure
      ? {
          id: application.departure.id,
          departureDate: application.departure.departureDate.toISOString(),
        }
      : null,
    group: application.group
      ? { id: application.group.id, name: application.group.name }
      : null,
    manager: application.manager ?? null,
    booking: application.booking
      ? {
          id: application.booking.id,
          basePrice: application.booking.basePrice,
          finalPrice: application.booking.finalPrice,
          priceChangeReason: application.booking.priceChangeReason ?? null,
          depositPaid: application.booking.depositPaid,
          depositDate: application.booking.depositDate?.toISOString() ?? null,
          paymentStatus: application.booking.paymentStatus,
          currency: application.booking.currency,
          noShow: application.booking.noShow,
          priceHistory: application.booking.priceHistory.map((ph) => ({
            id: ph.id,
            changedBy: ph.changedBy,
            oldPrice: ph.oldPrice,
            newPrice: ph.newPrice,
            reason: ph.reason ?? null,
            changedAt: ph.changedAt.toISOString(),
          })),
        }
      : null,
    reminders: application.reminders.map((r) => ({
      id: r.id,
      note: r.note ?? null,
      dueAt: r.dueAt.toISOString(),
      isDone: r.isDone,
      user: r.user,
    })),
    managers,
    tourDepartures: tourDepartures.map((d) => ({
      id: d.id,
      departureDate: d.departureDate.toISOString(),
    })),
    currentUserId: session.user.id,
    currentUserRole: session.user.role,
  };

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/admin/applications" className="hover:text-blue-600">
          Заявки
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">
          {application.client.name} — {STATUS_LABELS[application.status]}
        </span>
      </div>

      <ApplicationDetailClient data={data} />
    </div>
  );
}
