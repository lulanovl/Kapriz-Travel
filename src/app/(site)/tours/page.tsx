import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ToursClient from "./ToursClient";

export const metadata: Metadata = {
  title: "Все туры — Kapriz Travel",
  description: "Однодневные и многодневные туры по Кыргызстану, Казахстану и Узбекистану. Выберите свой маршрут.",
};

async function getTours() {
  return prisma.tour.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      tourDates: {
        where: { startDate: { gte: new Date() } },
        orderBy: { startDate: "asc" },
        take: 1,
        include: { _count: { select: { applications: true } } },
      },
    },
  });
}

export default async function ToursPage() {
  const tours = await getTours();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero bar */}
      <div className="bg-blue-gradient py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-brand-lime font-heading font-700 text-sm uppercase tracking-widest">
            Все направления
          </span>
          <h1 className="font-heading font-black text-white uppercase text-4xl sm:text-5xl mt-2">
            Наши туры
          </h1>
          <p className="text-white/60 mt-3 text-base max-w-xl">
            {tours.length} маршрутов по Кыргызстану и Центральной Азии
          </p>
        </div>
      </div>

      <ToursClient tours={tours} />
    </div>
  );
}
