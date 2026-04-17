import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/admin/Header";
import DepartureDetailClient from "./DepartureDetailClient";

export const dynamic = "force-dynamic";

export default async function DeparturePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const departure = await prisma.departure.findUnique({
    where: { id: params.id },
    include: {
      tour: { select: { id: true, title: true, slug: true, basePrice: true, duration: true } },
      groups: {
        include: {
          guide: { select: { id: true, name: true, phone: true } },
          driver: { select: { id: true, name: true, phone: true } },
          applications: {
            include: {
              client: { select: { id: true, name: true, whatsapp: true, country: true } },
              booking: {
                select: { id: true, finalPrice: true, depositPaid: true, paymentStatus: true, currency: true, guidePaymentStatus: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          _count: { select: { applications: true } },
          expenses: {
            select: { id: true, category: true, amount: true, currency: true, note: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      // unassigned applications
      applications: {
        where: { groupId: null },
        include: {
          client: { select: { id: true, name: true, whatsapp: true, country: true } },
          booking: {
            select: { id: true, finalPrice: true, depositPaid: true, paymentStatus: true, currency: true, guidePaymentStatus: true },
          },
          manager: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!departure) notFound();

  const staff = await prisma.staff.findMany({ orderBy: { name: "asc" } });

  const canEdit = ["ADMIN", "SENIOR_MANAGER", "MANAGER"].includes(session.user.role);

  return (
    <>
      <Header title={`Выезд: ${departure.tour.title}`} />
      <div className="flex-1 p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/admin/tours" className="hover:text-blue-600">Туры</Link>
          <span>/</span>
          <Link href={`/admin/tours/${departure.tour.id}`} className="hover:text-blue-600">
            {departure.tour.title}
          </Link>
          <span>/</span>
          <span className="text-gray-800">
            {new Date(departure.departureDate).toLocaleDateString("ru-RU", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </span>
        </div>

        <DepartureDetailClient
          departure={{
            ...departure,
            departureDate: departure.departureDate.toISOString(),
          }}
          staff={staff}
          canEdit={canEdit}
        />
      </div>
    </>
  );
}
