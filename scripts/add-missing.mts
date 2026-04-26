import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const TOUR_SLUG = "tur-v-turkestan-2-dnya";
const DATE = new Date("2026-05-01");
const DATE_END = new Date("2026-05-02");

const tour = await prisma.tour.findUnique({ where: { slug: TOUR_SLUG } });
if (!tour) throw new Error("Тур не найден: " + TOUR_SLUG);

const departure = await prisma.departure.findFirst({
  where: { tourId: tour.id, departureDate: { gte: DATE, lt: DATE_END } },
});
if (!departure) throw new Error("Выезд не найден для " + TOUR_SLUG + " 2026-05-01");

const users = await prisma.user.findMany({ select: { id: true, name: true } });
const manager = users.find((u) => u.name.toLowerCase().includes("айсезим"));
console.log("Менеджер:", manager?.name ?? "не найден");

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9) return `+996${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return `+996${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  if (digits.length === 12 && digits.startsWith("996")) return `+${digits}`;
  return `+${digits}`;
}

async function addGroup(opts: {
  clientName: string;
  phone: string;
  persons: number;
  deposit: number;
  finalPrice: number;
  company?: string;
  companions: string[];
}) {
  const phone = normalizePhone(opts.phone);

  let client = await prisma.client.findUnique({ where: { whatsapp: phone } });
  if (!client) {
    client = await prisma.client.create({ data: { name: opts.clientName, whatsapp: phone } });
    console.log(`  ✅ Клиент создан: ${opts.clientName} (${phone})`);
  } else {
    console.log(`  ♻  Клиент уже есть: ${client.name} (${phone})`);
    const dup = await prisma.application.findFirst({
      where: { clientId: client.id, departureId: departure!.id },
    });
    if (dup) {
      console.log(`  ⏭ Дубликат — заявка уже есть, пропускаем`);
      return;
    }
  }

  const app = await prisma.application.create({
    data: {
      clientId: client.id,
      tourId: tour!.id,
      departureId: departure!.id,
      managerId: manager?.id,
      persons: opts.persons,
      status: opts.deposit > 0 ? "DEPOSIT" : "NEW",
      comment: opts.company ?? undefined,
    },
  });

  await prisma.booking.create({
    data: {
      applicationId: app.id,
      basePrice: tour!.basePrice,
      finalPrice: opts.finalPrice,
      depositPaid: opts.deposit,
      depositDate: opts.deposit > 0 ? new Date() : null,
      paymentStatus:
        opts.deposit >= opts.finalPrice ? "PAID" : opts.deposit > 0 ? "PARTIAL" : "PENDING",
      currency: "KGS",
    },
  });

  for (const name of opts.companions) {
    await prisma.companion.create({ data: { applicationId: app.id, name } });
  }

  console.log(
    `  ✅ Заявка создана: ${opts.clientName} — ${opts.persons} чел, депозит ${opts.deposit}, финал ${opts.finalPrice}, попутчики: [${opts.companions.join(", ")}]`
  );
}

console.log("\n=== Группа 1: Ирина + Ксения (1 мая, Туркестан) ===");
await addGroup({
  clientName: "Ирина",
  phone: "220112037",
  persons: 2,
  deposit: 15000,   // 7500 * 2
  finalPrice: 15000, // 7500 * 2, balance=0 → оплачено
  companions: ["Ксения"],
});

console.log("\n=== Группа 2: Мээрим + Саадат + Жаркынай + Аида (1 мая, Туркестан) ===");
await addGroup({
  clientName: "Мээрим",
  phone: "707741989",
  persons: 4,
  deposit: 9400,
  finalPrice: 30400,  // 9400 + 21000
  company: "Айлин тревел",
  companions: ["Саадат", "Жаркынай", "Аида"],
});

await prisma.$disconnect();
