import { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import ApplyForm from "./ApplyForm";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("apply");
  return { title: t("metaTitle"), description: t("metaDesc") };
}

async function getActiveTours() {
  return prisma.tour.findMany({
    where: { isActive: true },
    select: { id: true, title: true, titleEn: true, slug: true, basePrice: true },
    orderBy: { title: "asc" },
  });
}

export default async function ApplyPage() {
  const [tours, t, locale] = await Promise.all([
    getActiveTours(),
    getTranslations("apply"),
    getLocale(),
  ]);

  const localizedTours = tours.map((tour) => ({
    ...tour,
    title: locale === "en" ? (tour.titleEn ?? tour.title) : tour.title,
  }));

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-blue-gradient py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-brand-lime font-heading font-700 text-sm uppercase tracking-widest">
            {t("label")}
          </span>
          <h1 className="font-heading font-black text-white uppercase text-4xl sm:text-5xl mt-2">
            {t("heading")}
          </h1>
          <p className="text-white/60 mt-3 text-base">{t("sub")}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <ApplyForm tours={localizedTours} />
      </div>
    </div>
  );
}
