import Header from "@/components/admin/Header";
import { prisma } from "@/lib/prisma";
import CalendarClient from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const from = new Date();
  from.setMonth(from.getMonth() - 1);
  from.setHours(0, 0, 0, 0);

  const to = new Date();
  to.setMonth(to.getMonth() + 12);

  const departures = await prisma.departure.findMany({
    where: { departureDate: { gte: from, lte: to } },
    orderBy: { departureDate: "asc" },
    include: {
      tour: { select: { id: true, title: true } },
      groups: {
        select: {
          id: true,
          name: true,
          maxSeats: true,
          guide: { select: { name: true } },
          driver: { select: { name: true } },
          _count: { select: { applications: true } },
        },
      },
      _count: { select: { applications: true } },
    },
  });

  const serialized = departures.map((dep) => ({
    id: dep.id,
    departureDate: dep.departureDate.toISOString(),
    tour: dep.tour,
    applicationsCount: dep._count.applications,
    maxSeats: dep.groups.reduce((s, g) => s + g.maxSeats, 0),
    guide: dep.groups[0]?.guide ?? null,
    driver: dep.groups[0]?.driver ?? null,
    groupCount: dep.groups.length,
  }));

  return (
    <>
      <Header title="Календарь" />
      <CalendarClient departures={serialized} />
    </>
  );
}
