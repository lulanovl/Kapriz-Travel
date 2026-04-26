import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const apps = await prisma.application.findMany({
  where: {
    OR: [
      { booking: { guidePaymentStatus: "NO_SHOW" } },
      { booking: { noShow: true } },
    ],
  },
  include: {
    client: { select: { name: true, whatsapp: true } },
    tour: { select: { title: true, slug: true } },
    departure: { select: { departureDate: true } },
    booking: true,
  },
});

console.log(`Найдено NO_SHOW заявок: ${apps.length}\n`);
let total = 0;
for (const a of apps) {
  const loss = Math.max(0, (a.booking?.finalPrice ?? 0) - (a.booking?.depositPaid ?? 0));
  total += loss;
  console.log(`👤 ${a.client.name} (${a.client.whatsapp})`);
  console.log(`   Тур: ${a.tour.title}`);
  console.log(`   Дата выезда: ${a.departure.departureDate.toISOString().slice(0,10)}`);
  console.log(`   finalPrice: ${a.booking?.finalPrice}  depositPaid: ${a.booking?.depositPaid}  потеря: ${loss}`);
  console.log(`   guidePaymentStatus: ${a.booking?.guidePaymentStatus}  noShow: ${a.booking?.noShow}`);
  console.log();
}
console.log(`Итого потери: ${total} сом`);

await prisma.$disconnect();
