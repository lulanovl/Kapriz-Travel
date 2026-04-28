/**
 * Converts companions who have a whatsapp number into full Client records.
 * For each such companion:
 *   1. Creates a Client (or finds existing by whatsapp)
 *   2. Creates an Application linked to the same tour/departure (tour history)
 *   3. Reduces parent application.persons by 1 (avoids double-counting in departure)
 *
 * Safe to re-run — idempotent (duplicate checks before any mutation).
 *
 * Usage:
 *   npx tsx scripts/companions-to-clients.mts --dry-run   # preview
 *   npx tsx scripts/companions-to-clients.mts             # apply
 */
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9) return `+996${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return `+996${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  if (digits.length === 12 && digits.startsWith("996")) return `+${digits}`;
  return `+${digits}`;
}

const companions = await prisma.companion.findMany({
  where: { whatsapp: { not: null } },
  include: {
    application: {
      select: {
        id: true,
        tourId: true,
        departureId: true,
        groupId: true,
        managerId: true,
        persons: true,
        status: true,
      },
    },
  },
});

console.log(`Попутчики с телефоном: ${companions.length}`);
if (companions.length === 0) { await prisma.$disconnect(); process.exit(0); }

let created = 0, alreadyExists = 0, skipped = 0, errors = 0;

for (const companion of companions) {
  const phone = normalizePhone(companion.whatsapp!);
  const parent = companion.application;

  console.log(`\n👤 ${companion.name}  |  ${phone}`);
  console.log(`   Родительская заявка: ${parent.id}  |  статус: ${parent.status}  |  persons: ${parent.persons}`);

  try {
    // ── 1. Найти или создать Client ──────────────────────────────────────────
    let client = await prisma.client.findUnique({ where: { whatsapp: phone } });

    if (client) {
      console.log(`   ♻  Клиент уже есть: ${client.name} (${client.id})`);
      alreadyExists++;
    } else {
      if (!DRY_RUN) {
        client = await prisma.client.create({
          data: { name: companion.name, whatsapp: phone },
        });
        console.log(`   ✅ Клиент создан: ${client.id}`);
      } else {
        console.log(`   [dry] Клиент будет создан: ${companion.name}`);
      }
      created++;
    }

    if (DRY_RUN) { skipped++; continue; }
    if (!client) { skipped++; continue; }

    // ── 2. Проверить — нет ли уже заявки этого клиента на тот же выезд ──────
    const existingApp = parent.departureId
      ? await prisma.application.findFirst({
          where: { clientId: client.id, departureId: parent.departureId },
        })
      : await prisma.application.findFirst({
          where: { clientId: client.id, tourId: parent.tourId },
        });

    if (existingApp) {
      console.log(`   ⏭  Заявка уже есть (${existingApp.id}), пропускаем`);
      skipped++;
      continue;
    }

    // ── 3. Атомарно: создать заявку + уменьшить persons у родителя ──────────
    await prisma.$transaction(async (tx) => {
      // Создать заявку попутчика (без букинга — финансы на родительской)
      const newApp = await tx.application.create({
        data: {
          clientId: client!.id,
          tourId: parent.tourId,
          departureId: parent.departureId ?? undefined,
          groupId: parent.groupId ?? undefined,
          managerId: parent.managerId ?? undefined,
          persons: 1,
          status: parent.status,
        },
      });
      console.log(`   ✅ Заявка создана: ${newApp.id}`);

      // Уменьшить persons у родителя, чтобы итог по выезду не задвоился
      if (parent.persons > 1) {
        await tx.application.update({
          where: { id: parent.id },
          data: { persons: parent.persons - 1 },
        });
        console.log(`   📉 Родительская заявка: persons ${parent.persons} → ${parent.persons - 1}`);
      }
    });

  } catch (e: unknown) {
    console.error(`   ❌ ${e instanceof Error ? e.message : String(e)}`);
    errors++;
  }
}

console.log(`\n${"═".repeat(50)}`);
if (DRY_RUN) {
  console.log(`Dry-run завершён. Новых клиентов: ${created}`);
} else {
  console.log(`✅ Создано клиентов: ${created} | Уже было: ${alreadyExists} | Пропущено: ${skipped} | Ошибок: ${errors}`);
}

await prisma.$disconnect();
