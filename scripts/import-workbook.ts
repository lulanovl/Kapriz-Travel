/**
 * Import applications from a multi-sheet Excel workbook.
 *
 * Format:
 *   - Sheet name  = tour slug
 *   - Column A    = departure date (DD.MM), carries down until next date
 *   - Column B    = tourist name
 *   - Column C    = persons count
 *   - Column D    = deposit (предоплата)
 *   - Column E    = balance (остаток)
 *   - Column F    = phone (empty = companion of previous row with phone)
 *   - Column G    = manager name
 *   - Column H    = company name (saved in application comment)
 *
 * Usage:
 *   npx tsx scripts/import-workbook.ts --file=./Almaty.xlsx [--year=2026] [--dry-run]
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { createRequire } from "module";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const prisma = new PrismaClient();

// ─── CLI args ────────────────────────────────────────────────────────────────

function getArg(name: string) {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(`--${name}=`.length) : undefined;
}

const FILE = getArg("file");
const YEAR = parseInt(getArg("year") ?? String(new Date().getFullYear()));
const DRY_RUN = process.argv.includes("--dry-run");

if (!FILE) {
  console.error("Usage: npx tsx scripts/import-workbook.ts --file=./Almaty.xlsx [--year=2026] [--dry-run]");
  process.exit(1);
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface AppGroup {
  tourSlug: string;
  departureDate: Date;
  client: { name: string; phone: string };
  managerName: string;
  company: string;
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
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;   // RU
  if (digits.length === 12 && digits.startsWith("996")) return `+${digits}`;
  return `+${digits}`;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function isDateCell(value: string): boolean {
  return /^\d{1,2}\.\d{1,2}$/.test(value.trim());
}

function parseDate(value: string): Date {
  const [day, month] = value.trim().split(".").map(Number);
  return new Date(Date.UTC(YEAR, month - 1, day));
}

function cell(row: unknown[], idx: number): string {
  const v = (row as unknown[])[idx];
  return v != null ? String(v).trim() : "";
}

function num(row: unknown[], idx: number): number {
  const v = (row as unknown[])[idx];
  if (v == null || v === "") return 0;
  return Number(v) || 0;
}

// ─── Parse workbook ──────────────────────────────────────────────────────────

function parseWorkbook(filePath: string): AppGroup[] {
  const absPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`Файл не найден: ${absPath}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(absPath);
  const allGroups: AppGroup[] = [];

  for (const sheetName of wb.SheetNames) {
    const tourSlug = sheetName.trim();
    const ws = wb.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    console.log(`\n📋 Лист: "${tourSlug}"`);

    let currentDate: Date | null = null;
    let currentGroup: AppGroup | null = null;

    for (const row of rows) {
      const colA = cell(row, 0);
      const name = cell(row, 1);
      const persons = num(row, 2) || 1;
      const deposit = num(row, 3);
      const balance = num(row, 4);
      const phone = cell(row, 5);
      const managerName = cell(row, 6);
      const company = cell(row, 7);

      // Update date if column A has a date
      if (colA && isDateCell(colA)) {
        currentDate = parseDate(colA);
      }

      // Skip rows without a name
      if (!name) continue;
      // Skip rows without a current date
      if (!currentDate) continue;

      if (phone) {
        // New main tourist
        currentGroup = {
          tourSlug,
          departureDate: currentDate,
          client: { name, phone: normalizePhone(phone) },
          managerName,
          company,
          persons,
          totalDeposit: deposit,
          finalPrice: deposit + balance,
          companions: [],
        };
        // Skip groups with zero deposit AND zero final price (not paid yet)
        if (deposit === 0 && balance === 0) {
          console.warn(`  ⏭ "${name}" — нет оплаты, пропускаем`);
          currentGroup = null;
          continue;
        }
        allGroups.push(currentGroup);
      } else {
        // Companion of current group
        if (!currentGroup || currentGroup.departureDate.getTime() !== currentDate.getTime()) {
          console.warn(`  ⚠ "${name}" — нет телефона и нет предыдущей заявки на эту дату, пропускаем`);
          continue;
        }
        currentGroup.persons += persons;
        currentGroup.totalDeposit += deposit;
        currentGroup.finalPrice += deposit + balance;
        currentGroup.companions.push({ name });
      }
    }
  }

  return allGroups;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📂 Файл:    ${FILE}`);
  console.log(`📅 Год:     ${YEAR}`);
  console.log(`🧪 Dry run: ${DRY_RUN ? "YES" : "NO"}`);

  const groups = parseWorkbook(FILE!);

  // Group by tour+date for summary
  const byTourDate = new Map<string, AppGroup[]>();
  for (const g of groups) {
    const key = `${g.tourSlug}|${g.departureDate.toISOString().slice(0, 10)}`;
    if (!byTourDate.has(key)) byTourDate.set(key, []);
    byTourDate.get(key)!.push(g);
  }

  console.log(`\nИтого: ${groups.length} заявок по ${byTourDate.size} выездам\n`);

  // Cache tours, departures, users
  const tours = await prisma.tour.findMany({ select: { id: true, slug: true, title: true, basePrice: true } });
  const users = await prisma.user.findMany({ select: { id: true, name: true } });

  function findTour(slug: string) {
    return tours.find((t) => t.slug === slug) ?? null;
  }

  const departureCache = new Map<string, { id: string; status: string } | null>();
  async function findDeparture(tourId: string, date: Date) {
    const key = `${tourId}|${date.toISOString().slice(0, 10)}`;
    if (departureCache.has(key)) return departureCache.get(key)!;
    const dateEnd = new Date(date);
    dateEnd.setDate(dateEnd.getDate() + 1);
    const dep = await prisma.departure.findFirst({
      where: { tourId, departureDate: { gte: date, lt: dateEnd } },
      select: { id: true, status: true },
    });
    departureCache.set(key, dep);
    return dep;
  }

  function findManager(name: string): string | null {
    if (!name) return null;
    const inputWords = name.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const match = users.find((u) => {
      const uWords = u.name.toLowerCase().split(/\s+/);
      return inputWords.some((w) =>
        uWords.some((uw) =>
          uw.includes(w) || w.includes(uw) ||
          (w.length >= 4 && uw.length >= 4 && levenshtein(w, uw) <= 2)
        )
      );
    });
    return match?.id ?? null;
  }

  let created = 0;
  let skipped = 0;
  let errorCount = 0;

  for (const [key, groupList] of byTourDate) {
    const [slug, dateStr] = key.split("|");
    const tour = findTour(slug);

    console.log(`\n${"═".repeat(50)}`);
    console.log(`📍 Тур: ${tour?.title ?? `❌ НЕ НАЙДЕН (${slug})`}  |  Дата: ${dateStr}  |  ${groupList.length} заявок`);

    if (!tour) {
      console.log(`   Пропускаем весь выезд`);
      skipped += groupList.length;
      continue;
    }

    const departure = await findDeparture(tour.id, new Date(dateStr));
    if (!departure) {
      console.log(`   ❌ Выезд не найден в базе — пропускаем`);
      skipped += groupList.length;
      continue;
    }
    console.log(`   Выезд: ${departure.status}`);

    for (const group of groupList) {
      const { client, managerName, company, persons, totalDeposit, finalPrice, companions } = group;
      const managerId = findManager(managerName);

      const companionStr = companions.length ? ` (попутчики: ${companions.map((c) => c.name).join(", ")})` : "";
      console.log(`\n  👤 ${client.name} (${client.phone})${companionStr}`);
      console.log(`     ${persons} чел. | Депозит: ${totalDeposit.toLocaleString()} | Финал: ${finalPrice.toLocaleString()} | Остаток: ${(finalPrice - totalDeposit).toLocaleString()}`);
      console.log(`     Менеджер: ${managerId ? managerName : `❓ не найден ("${managerName}")`}${company ? `  |  Компания: ${company}` : ""}`);

      if (DRY_RUN) {
        console.log(`     [dry-run] пропускаем`);
        continue;
      }

      try {
        let dbClient = await prisma.client.findUnique({ where: { whatsapp: client.phone } });
        if (!dbClient) {
          dbClient = await prisma.client.create({ data: { name: client.name, whatsapp: client.phone } });
          console.log(`     ✅ Клиент создан`);
        } else {
          console.log(`     ♻️  Клиент уже есть: ${dbClient.name}`);
          // Check for duplicate application on same departure
          const existing = await prisma.application.findFirst({
            where: { clientId: dbClient.id, departureId: departure.id },
          });
          if (existing) {
            console.log(`     ⏭ Дубликат — заявка уже существует, пропускаем`);
            skipped++;
            continue;
          }
        }

        const app = await prisma.application.create({
          data: {
            clientId: dbClient.id,
            tourId: tour.id,
            departureId: departure.id,
            managerId: managerId ?? undefined,
            persons,
            status: totalDeposit > 0 ? "DEPOSIT" : "NEW",
            comment: company || undefined,
          },
        });

        await prisma.booking.create({
          data: {
            applicationId: app.id,
            basePrice: tour.basePrice,
            finalPrice,
            depositPaid: totalDeposit,
            depositDate: totalDeposit > 0 ? new Date() : null,
            paymentStatus: totalDeposit >= finalPrice ? "PAID" : totalDeposit > 0 ? "PARTIAL" : "PENDING",
            currency: "KGS",
          },
        });

        for (const comp of companions) {
          await prisma.companion.create({ data: { applicationId: app.id, name: comp.name } });
        }

        console.log(`     ✅ Заявка создана (${app.id})`);
        created++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`     ❌ Ошибка: ${msg}`);
        errorCount++;
      }
    }
  }

  console.log(`\n${"═".repeat(50)}`);
  if (DRY_RUN) {
    console.log(`✅ Dry-run: найдено ${groups.length} заявок. Запусти без --dry-run чтобы загрузить.`);
  } else {
    console.log(`✅ Создано: ${created} | Пропущено: ${skipped} | Ошибок: ${errorCount}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
