import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Header from "@/components/admin/Header";
import NewApplicationForm from "./NewApplicationForm";

export const dynamic = "force-dynamic";

export default async function NewApplicationPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [tours, managers] = await Promise.all([
    prisma.tour.findMany({
      where: { isActive: true },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        basePrice: true,
        tourDates: {
          where: { startDate: { gte: new Date() } },
          orderBy: { startDate: "asc" },
          select: {
            id: true,
            startDate: true,
            endDate: true,
            maxSeats: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SENIOR_MANAGER", "MANAGER"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Serialize dates
  const serializedTours = tours.map((t) => ({
    ...t,
    tourDates: t.tourDates.map((d) => ({
      ...d,
      startDate: d.startDate.toISOString(),
      endDate: d.endDate.toISOString(),
    })),
  }));

  return (
    <>
      <Header title="Новая заявка" />
      <div className="flex-1 p-6">
        <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
          <Link href="/admin/applications" className="hover:text-blue-600">
            Заявки
          </Link>
          <span>/</span>
          <span className="text-gray-800 font-medium">Новая заявка</span>
        </div>

        <NewApplicationForm
          tours={serializedTours}
          managers={managers}
          currentUserId={session.user.id}
        />
      </div>
    </>
  );
}
