import { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import ToursClient from "./ToursClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tours");
  return {
    title: t("metaTitle"),
    description: t("metaDesc"),
  };
}

async function getTours() {
  return prisma.tour.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      departures: {
        where: { status: "OPEN", departureDate: { gte: new Date() } },
        orderBy: { departureDate: "asc" },
        take: 1,
        select: { id: true, departureDate: true },
      },
    },
  });
}

export default async function ToursPage() {
  const [tours, t, locale] = await Promise.all([
    getTours(),
    getTranslations("tours"),
    getLocale(),
  ]);

  // Apply EN title fallback for display
  const localizedTours = tours.map((tour) => ({
    ...tour,
    title:
      locale === "en" ? (tour.titleEn ?? tour.title) : tour.title,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-gradient py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-brand-lime font-heading font-700 text-sm uppercase tracking-widest">
            {t("allLabel")}
          </span>
          <h1 className="font-heading font-black text-white uppercase text-4xl sm:text-5xl mt-2">
            {t("heading")}
          </h1>
          <p className="text-white/60 mt-3 text-base max-w-xl">
            {t("subtitle", { count: tours.length })}
          </p>
        </div>
      </div>

      <ToursClient tours={localizedTours} />
    </div>
  );
}
