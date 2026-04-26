import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const phones = ["+996220112037", "+996707741989"];

for (const phone of phones) {
  const client = await prisma.client.findUnique({ where: { whatsapp: phone } });
  if (!client) { console.log(`Клиент ${phone} не найден`); continue; }

  const apps = await prisma.application.findMany({
    where: { clientId: client.id },
    include: {
      departure: { select: { departureDate: true } },
      booking: true,
      companions: true,
      tour: { select: { slug: true } },
    },
  });

  for (const app of apps) {
    console.log(`\n${client.name} (${phone})`);
    console.log(`  Тур: ${app.tour.slug}  Дата: ${app.departure.departureDate.toISOString().slice(0,10)}`);
    console.log(`  Персон: ${app.persons}  Статус: ${app.status}`);
    if (app.booking) {
      console.log(`  Депозит: ${app.booking.depositPaid}  Финал: ${app.booking.finalPrice}  Оплата: ${app.booking.paymentStatus}`);
    }
    if (app.companions.length) {
      console.log(`  Попутчики: ${app.companions.map(c => c.name).join(", ")}`);
    } else {
      console.log(`  Попутчики: нет`);
    }
  }
}

await prisma.$disconnect();
