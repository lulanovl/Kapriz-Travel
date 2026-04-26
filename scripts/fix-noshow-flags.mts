/**
 * One-off fix: reset noShow/guidePaymentStatus for ARCHIVE applications.
 * The cancel route incorrectly set guidePaymentStatus=NO_SHOW for advance cancellations.
 */
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const badApps = await prisma.application.findMany({
  where: {
    status: "ARCHIVE",
    booking: { guidePaymentStatus: "NO_SHOW" },
  },
  include: {
    client: { select: { name: true } },
    tour: { select: { title: true } },
    departure: { select: { departureDate: true } },
    booking: { select: { id: true, guidePaymentStatus: true, noShow: true } },
  },
});

console.log(`Найдено ARCHIVE заявок с guidePaymentStatus=NO_SHOW: ${badApps.length}`);

for (const app of badApps) {
  console.log(`  Сбрасываем: ${app.client.name} — ${app.tour.title} ${app.departure.departureDate.toISOString().slice(0, 10)}`);
  await prisma.booking.update({
    where: { id: app.booking!.id },
    data: { noShow: false, guidePaymentStatus: "PENDING" },
  });
}

console.log("✅ Готово");
await prisma.$disconnect();
