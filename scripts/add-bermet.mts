import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const aigul = await prisma.client.findUnique({ where: { whatsapp: "+996559111073" } });
if (!aigul) { console.log("Айгуль не найдена"); process.exit(1); }

const app = await prisma.application.findFirst({
  where: { clientId: aigul.id },
  include: { booking: true, companions: true, departure: { select: { departureDate: true } } },
});
if (!app) { console.log("Заявка Айгуль не найдена"); process.exit(1); }

console.log(`Айгуль: persons=${app.persons}, попутчики: [${app.companions.map(c => c.name).join(", ")}]`);
console.log(`Дата выезда: ${app.departure.departureDate.toISOString().slice(0, 10)}`);

// Проверяем — бермет уже добавлена?
if (app.companions.some(c => c.name.toLowerCase() === "бермет")) {
  console.log("бермет уже есть в попутчиках");
  process.exit(0);
}

await prisma.$transaction(async (tx) => {
  // Добавить бермет как попутчика
  await tx.companion.create({ data: { applicationId: app.id, name: "бермет" } });

  // Обновить persons +1
  await tx.application.update({
    where: { id: app.id },
    data: { persons: app.persons + 1 },
  });

  // Обновить букинг: +2000 к депозиту, +6200 к финальной цене
  if (app.booking) {
    await tx.booking.update({
      where: { applicationId: app.id },
      data: {
        depositPaid: app.booking.depositPaid + 2000,
        finalPrice: app.booking.finalPrice + 6200,
        paymentStatus: app.booking.depositPaid + 2000 >= app.booking.finalPrice + 6200 ? "PAID" : "PARTIAL",
      },
    });
  }
});

console.log(`✅ бермет добавлена. persons: ${app.persons} → ${app.persons + 1}`);
await prisma.$disconnect();
