import Header from "@/components/admin/Header";
import { prisma } from "@/lib/prisma";
import CalendarClient from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const from = new Date();
  from.setMonth(from.getMonth() - 3);
  from.setHours(0, 0, 0, 0);

  const to = new Date();
  to.setMonth(to.getMonth() + 12);

  const tourDates = await prisma.tourDate.findMany({
    where: { startDate: { gte: from, lte: to } },
    orderBy: { startDate: "asc" },
    include: {
      tour: { select: { title: true } },
      guide: { select: { name: true } },
      driver: { select: { name: true } },
      _count: { select: { applications: true } },
    },
  });

  const serialized = tourDates.map((td) => ({
    id: td.id,
    startDate: td.startDate.toISOString(),
    endDate: td.endDate.toISOString(),
    maxSeats: td.maxSeats,
    tour: td.tour,
    guide: td.guide,
    driver: td.driver,
    applicationsCount: td._count.applications,
  }));

  return (
    <>
      <Header title="Календарь" />
      <CalendarClient tourDates={serialized} />
    </>
  );
}
