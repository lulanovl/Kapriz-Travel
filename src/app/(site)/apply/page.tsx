import { Metadata } from "next";
import ApplyForm from "./ApplyForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Оставить заявку — Kapriz Travel",
  description: "Заполните форму и мы свяжемся с вами в WhatsApp в течение часа.",
};

async function getActiveTours() {
  return prisma.tour.findMany({
    where: { isActive: true },
    select: { id: true, title: true, slug: true, basePrice: true },
    orderBy: { title: "asc" },
  });
}

export default async function ApplyPage() {
  const tours = await getActiveTours();

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-blue-gradient py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-brand-lime font-heading font-700 text-sm uppercase tracking-widest">
            Запись в тур
          </span>
          <h1 className="font-heading font-black text-white uppercase text-4xl sm:text-5xl mt-2">
            Оставить заявку
          </h1>
          <p className="text-white/60 mt-3 text-base">
            Свяжемся в WhatsApp в течение 1 часа
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <ApplyForm tours={tours} />
      </div>
    </div>
  );
}
