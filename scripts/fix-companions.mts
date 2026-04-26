import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ── Ирина + Ксения ───────────────────────────────────────────────────────────
const irina = await prisma.client.findUnique({ where: { whatsapp: "+996220112037" } });
if (irina) {
  const app = await prisma.application.findFirst({ where: { clientId: irina.id } });
  if (app) {
    await prisma.application.update({ where: { id: app.id }, data: { persons: 2 } });
    await prisma.booking.update({
      where: { applicationId: app.id },
      data: { finalPrice: 15000, depositPaid: 15000, paymentStatus: "PAID" },
    });
    await prisma.companion.create({ data: { applicationId: app.id, name: "Ксения" } });
    console.log("✅ Ирина: persons=2, депозит=15000, добавлена Ксения");
  }
}

// ── Мээрим + Саадат + Жаркынай + Аида ────────────────────────────────────────
const meerim = await prisma.client.findUnique({ where: { whatsapp: "+996707741989" } });
if (meerim) {
  const app = await prisma.application.findFirst({ where: { clientId: meerim.id } });
  if (app) {
    await prisma.application.update({ where: { id: app.id }, data: { persons: 4 } });
    for (const name of ["Саадат", "Жаркынай", "Аида"]) {
      await prisma.companion.create({ data: { applicationId: app.id, name } });
    }
    console.log("✅ Мээрим: persons=4, добавлены Саадат, Жаркынай, Аида");
  }
}

await prisma.$disconnect();
