import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const apps = await prisma.application.findMany({
  include: {
    client: { select: { name: true, whatsapp: true } },
    tour: { select: { title: true } },
    departure: { select: { departureDate: true } },
    booking: { select: { finalPrice: true, depositPaid: true } },
  },
  orderBy: [{ clientId: "asc" }, { departureId: "asc" }, { createdAt: "asc" }],
});

// Group by clientId + departureId
const groups = new Map<string, typeof apps>();
for (const app of apps) {
  const key = `${app.clientId}|${app.departureId}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key)!.push(app);
}

const duplicates = [...groups.values()].filter((g) => g.length > 1);

if (duplicates.length === 0) {
  console.log("✅ Дубликатов не найдено");
} else {
  console.log(`⚠  Найдено ${duplicates.length} групп с дубликатами:\n`);
  for (const group of duplicates) {
    const first = group[0];
    console.log(`👤 ${first.client.name} (${first.client.whatsapp})`);
    console.log(`   Тур: ${first.tour.title}  |  Дата: ${first.departure.departureDate.toISOString().slice(0, 10)}`);
    for (const app of group) {
      console.log(`   [${app.id}]  статус: ${app.status}  persons: ${app.persons}  депозит: ${app.booking?.depositPaid ?? "-"}  финал: ${app.booking?.finalPrice ?? "-"}  создан: ${app.createdAt.toISOString().slice(0, 16)}`);
    }
    console.log();
  }
}

await prisma.$disconnect();
