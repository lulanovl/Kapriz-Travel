import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const toCreate = [
  { slug: "tashkent-samarkand-3-dnya", dates: ["2026-05-01","2026-05-02","2026-05-03","2026-05-04","2026-05-05"] },
  { slug: "konnyy-tur-v-cho-kemin",    dates: ["2026-05-01","2026-05-02","2026-05-03","2026-05-04"] },
  { slug: "tur-v-turkestan-2-dnya",    dates: ["2026-05-01","2026-05-02","2026-05-03","2026-05-04","2026-05-07","2026-05-22"] },
  { slug: "nebesnyy-most-ziplayn",     dates: ["2026-05-02"] },
];

const tours = await prisma.tour.findMany({ select: { id: true, slug: true, title: true } });
console.log("Туры в БД:", tours.map((t) => t.slug).join(", "));

for (const { slug, dates } of toCreate) {
  const tour = tours.find((t) => t.slug === slug);
  if (!tour) { console.log(`❌ НЕ НАЙДЕН: ${slug}`); continue; }
  for (const d of dates) {
    const dateEnd = new Date(d);
    dateEnd.setDate(dateEnd.getDate() + 1);
    const exists = await prisma.departure.findFirst({
      where: { tourId: tour.id, departureDate: { gte: new Date(d), lt: dateEnd } },
    });
    if (exists) { console.log(`  ♻ уже есть: ${slug} ${d}`); continue; }
    const dep = await prisma.departure.create({
      data: { tourId: tour.id, departureDate: new Date(d), status: "ACTIVE" },
    });
    console.log(`  ✅ создан: ${tour.title} ${d} (${dep.id})`);
  }
}

await prisma.$disconnect();
