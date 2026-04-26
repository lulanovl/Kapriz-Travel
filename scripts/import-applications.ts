/**
 * Import applications from Excel file into the database.
 *
 * Usage:
 *   npx tsx scripts/import-applications.ts \
 *     --file=./data.xlsx \
 *     --tour=almaty-2h \
 *     --date=2025-05-02 \
 *     --dry-run
 *
 * Excel column format (no header row):
 *   A: Name
 *   B: Persons count (usually 1)
 *   C: Deposit (предоплата) for this person
 *   D: Balance (остаток) for this person
 *   E: Phone number (empty = companion of previous row)
 *   F: Manager name
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

// ─── CLI args ────────────────────────────────────────────────────────────────

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

const FILE = getArg("file");
const TOUR_SLUG = getArg("tour");
const DATE_STR = getArg("date"); // YYYY-MM-DD
const DEPOSIT_DATE_STR = getArg("deposit-date"); // YYYY-MM-DD, default: today
const DRY_RUN = process.argv.includes("--dry-run");

if (!FILE || !TOUR_SLUG || !DATE_STR) {
  console.error(
    "Usage: npx tsx scripts/import-applications.ts --file=./data.xlsx --tour=<slug> --date=YYYY-MM-DD [--deposit-date=YYYY-MM-DD] [--dry-run]"
  );
  process.exit(1);
}

const depositDate = DEPOSIT_DATE_STR ? new Date(DEPOSIT_DATE_STR) : new Date();

// ─── Types ───────────────────────────────────────────────────────────────────

interface RawRow {
  name: string;
  persons: number;
  deposit: number;
  balance: number;
  phone: string;
  managerName: string;
}

interface AppGroup {
  client: { name: string; phone: string };
  managerName: string;
  persons: number;
  totalDeposit: number;
  finalPrice: number;
  companions: { name: string }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9) return `+996${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return `+996${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("996")) return `+${digits}`;
  return `+${digits}`;
}

function cell(row: unknown[], idx: number): string {
  const v = (row as unknown[])[idx];
  return v != null ? String(v).trim() : "";
}

function num(row: unknown[], idx: number): number {
  const v = (row as unknown[])[idx];
  return v != null ? Number(v) || 0 : 0;
}

// ─── Parse Excel ─────────────────────────────────────────────────────────────

function parseExcel(filePath: string): RawRow[] {
  const absPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }
  const workbook = XLSX.readFile(absPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  const result: RawRow[] = [];
  for (const row of rows) {
    const name = cell(row, 0);
    if (!name) continue; // skip empty rows
    result.push({
      name,
      persons: num(row, 1) || 1,
      deposit: num(row, 2),
      balance: num(row, 3),
      phone: cell(row, 4),
      managerName: cell(row, 5),
    });
  }
  return result;
}

// ─── Group rows into applications ────────────────────────────────────────────

function groupRows(rows: RawRow[]): AppGroup[] {
  const groups: AppGroup[] = [];
  let current: AppGroup | null = null;

  for (const row of rows) {
    if (row.phone) {
      // New main tourist — start a new group
      current = {
        client: { name: row.name, phone: normalizePhone(row.phone) },
        managerName: row.managerName,
        persons: row.persons,
        totalDeposit: row.deposit,
        finalPrice: row.deposit + row.balance,
        companions: [],
      };
      groups.push(current);
    } else {
      // No phone → companion of the current group
      if (!current) {
        console.warn(`  ⚠ Row "${row.name}" has no phone and no preceding tourist — skipping`);
        continue;
      }
      current.persons += row.persons;
      current.totalDeposit += row.deposit;
      current.finalPrice += row.deposit + row.balance;
      current.companions.push({ name: row.name });
    }
  }

  return groups;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📂 File:    ${FILE}`);
  console.log(`🗺  Tour:    ${TOUR_SLUG}`);
  console.log(`📅 Date:    ${DATE_STR}`);
  console.log(`🧪 Dry run: ${DRY_RUN ? "YES" : "NO"}\n`);

  // 1. Parse Excel
  const rows = parseExcel(FILE!);
  const groups = groupRows(rows);
  console.log(`Parsed ${rows.length} rows → ${groups.length} applications\n`);

  // 2. Find tour
  const tour = await prisma.tour.findUnique({ where: { slug: TOUR_SLUG } });
  if (!tour) {
    console.error(`Tour not found: slug="${TOUR_SLUG}"`);
    const all = await prisma.tour.findMany({ select: { slug: true, title: true } });
    console.log("Available tours:", all.map((t) => `  ${t.slug}  →  ${t.title}`).join("\n"));
    process.exit(1);
  }
  console.log(`✅ Tour: ${tour.title} (base price: ${tour.basePrice.toLocaleString()} KGS)\n`);

  // 3. Find departure
  const date = new Date(DATE_STR!);
  const dateEnd = new Date(date);
  dateEnd.setDate(dateEnd.getDate() + 1);

  const departure = await prisma.departure.findFirst({
    where: {
      tourId: tour.id,
      departureDate: { gte: date, lt: dateEnd },
    },
  });
  if (!departure) {
    console.error(`Departure not found for tour "${tour.title}" on ${DATE_STR}`);
    const upcoming = await prisma.departure.findMany({
      where: { tourId: tour.id },
      orderBy: { departureDate: "asc" },
      take: 5,
      select: { departureDate: true, status: true },
    });
    console.log(
      "Upcoming departures:",
      upcoming.map((d) => `  ${d.departureDate.toISOString().slice(0, 10)} (${d.status})`).join("\n")
    );
    process.exit(1);
  }
  console.log(`✅ Departure: ${departure.departureDate.toISOString().slice(0, 10)} (${departure.status})\n`);

  // 4. Cache managers
  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  function findManager(name: string): string | null {
    if (!name) return null;
    const inputWords = name.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const match = users.find((u) => {
      const uWords = u.name.toLowerCase().split(/\s+/);
      return inputWords.some((w) => uWords.some((uw) => uw.includes(w) || w.includes(uw)));
    });
    return match?.id ?? null;
  }

  // 5. Process each group
  let created = 0;
  let skipped = 0;

  for (const group of groups) {
    const { client, managerName, persons, totalDeposit, finalPrice, companions } = group;
    const managerId = findManager(managerName);

    console.log(`────────────────────────────`);
    console.log(`👤 ${client.name} (${client.phone})`);
    console.log(`   Туристов: ${persons}${companions.length ? ` (попутчики: ${companions.map((c) => c.name).join(", ")})` : ""}`);
    console.log(`   Предоплата: ${totalDeposit.toLocaleString()} | Финальная цена: ${finalPrice.toLocaleString()} | Остаток: ${(finalPrice - totalDeposit).toLocaleString()}`);
    console.log(`   Менеджер: ${managerId ? managerName : `❓ не найден ("${managerName}")`}`);

    if (DRY_RUN) {
      console.log(`   [dry-run] Пропускаем создание\n`);
      continue;
    }

    try {
      // Find or create client
      let dbClient = await prisma.client.findUnique({ where: { whatsapp: client.phone } });
      if (dbClient) {
        console.log(`   ♻️  Клиент уже существует: ${dbClient.name}`);
      } else {
        dbClient = await prisma.client.create({
          data: { name: client.name, whatsapp: client.phone },
        });
        console.log(`   ✅ Клиент создан`);
      }

      // Create application
      const app = await prisma.application.create({
        data: {
          clientId: dbClient.id,
          tourId: tour.id,
          departureId: departure.id,
          managerId: managerId ?? undefined,
          persons,
          status: totalDeposit > 0 ? "DEPOSIT" : "NEW",
        },
      });

      // Create booking
      await prisma.booking.create({
        data: {
          applicationId: app.id,
          basePrice: tour.basePrice,
          finalPrice,
          depositPaid: totalDeposit,
          depositDate: totalDeposit > 0 ? depositDate : null,
          paymentStatus:
            totalDeposit >= finalPrice ? "PAID" : totalDeposit > 0 ? "PARTIAL" : "PENDING",
          currency: "KGS",
        },
      });

      // Create companions
      for (const comp of companions) {
        await prisma.companion.create({
          data: { applicationId: app.id, name: comp.name },
        });
      }

      console.log(`   ✅ Заявка создана (id: ${app.id})\n`);
      created++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`   ❌ Ошибка: ${message}\n`);
      skipped++;
    }
  }

  console.log(`\n════════════════════════════`);
  if (DRY_RUN) {
    console.log(`✅ Dry-run завершён. Найдено ${groups.length} заявок — в базу ничего не записано.`);
    console.log(`   Запусти без --dry-run чтобы загрузить.`);
  } else {
    console.log(`✅ Готово: создано ${created}, ошибок ${skipped}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
