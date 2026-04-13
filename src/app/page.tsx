// Root / — public home page (manually wraps with Header/Footer)
// The (site)/layout.tsx handles Header/Footer for all sub-routes (/tours, /about, etc.)
export const dynamic = "force-dynamic";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import HeroSection from "@/components/site/HeroSection";
import PopularTours from "@/components/site/PopularTours";
import TrustCounters from "@/components/site/TrustCounters";
import WhyUs from "@/components/site/WhyUs";
import { prisma } from "@/lib/prisma";

async function getPopularTours() {
  return prisma.tour.findMany({
    where: { isActive: true },
    take: 6,
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

export default async function HomePage() {
  const tours = await getPopularTours();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 pt-16">
        <HeroSection />
        <TrustCounters />
        <PopularTours tours={tours} />
        <WhyUs />
      </main>
      <Footer />
    </div>
  );
}
