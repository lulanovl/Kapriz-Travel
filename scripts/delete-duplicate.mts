import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const ID = "cmofnz1p5001iihfip3hyole9";

const app = await prisma.application.findUnique({
  where: { id: ID },
  include: { client: { select: { name: true } }, tour: { select: { title: true } }, departure: { select: { departureDate: true } }, booking: true },
});

if (!app) { console.log("Не найдена"); process.exit(1); }

console.log(`Удаляем: ${app.client.name} — ${app.tour.title} ${app.departure.departureDate.toISOString().slice(0, 10)}`);
console.log(`  persons: ${app.persons}  депозит: ${app.booking?.depositPaid}  финал: ${app.booking?.finalPrice}`);

await prisma.$transaction(async (tx) => {
  await tx.companion.deleteMany({ where: { applicationId: ID } });
  if (app.booking) await tx.booking.delete({ where: { applicationId: ID } });
  await tx.application.delete({ where: { id: ID } });
});

console.log("✅ Удалено");
await prisma.$disconnect();
