/**
 * Universal import: all sheets from tours.xlsx → DB.
 * Skips records that already exist (client × departure).
 *
 * Usage:
 *   npx tsx scripts/import-all-sheets.mts --dry-run   # preview only
 *   npx tsx scripts/import-all-sheets.mts             # apply
 */
import * as dotenv from "dotenv";
import * as path from "path";
import { createRequire } from "module";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");
const YEAR = 2026;
const FILE = path.resolve(process.cwd(), "tours.xlsx");

// Excel sheet name → tour slug  (handles 31-char truncation)
const SHEET_SLUG: Record<string, string> = {
  "odnodnevnyy-tur-v-almaty":         "odnodnevnyy-tur-v-almaty",
  "dvukhdnevnyy-tur-v-almaty":        "dvukhdnevnyy-tur-v-almaty",
  "tashkent-samarkand-3-dnya":        "tashkent-samarkand-3-dnya",
  "konnyy-tur-v-cho-kemin":           "konnyy-tur-v-cho-kemin",
  "tur-v-turkestan-2-dnya":           "tur-v-turkestan-2-dnya",
  "dvukhdnevnyy-siti-tur-v-tashken":  "dvukhdnevnyy-siti-tur-v-tashkent",  // truncated
  "tashkent-samarkand-bukhara-4-dn":  "tashkent-samarkand-bukhara-4-dnya", // truncated
  "nebesnyy-most-ziplayn":            "nebesnyy-most-ziplayn",
  "sary-chelek-3-dnya":               "sary-chelek-3-dnya",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9) return `+996${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return `+996${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  if (digits.length === 12 && digits.startsWith("996")) return `+${digits}`;
  return `+${digits}`;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    [i, ...new Array(n).fill(0)]
  );
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function cell(row: unknown[], idx: number) {
  return row[idx] != null ? String(row[idx]).trim() : "";
}
function num(row: unknown[], idx: number) {
  const v = row[idx];
  if (v == null || v === "") return 0;
  return Number(v) || 0;
}
function isDateCell(v: string) { return /^\d{1,2}\.\d{1,2}$/.test(v); }
function parseDate(v: string) {
  const [d, m] = v.split(".").map(Number);
  return new Date(Date.UTC(YEAR, m - 1, d));
}

// ── Load DB lookups ───────────────────────────────────────────────────────────

const wb = XLSX.readFile(FILE);
const users = await prisma.user.findMany({ select: { id: true, name: true } });
const tours = await prisma.tour.findMany({
  select: { id: true, slug: true, title: true, basePrice: true },
});

function findManager(name: string) {
  if (!name) return null;
  const words = name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  return users.find(u => {
    const uw = u.name.toLowerCase().split(/\s+/);
    return words.some(w =>
      uw.some(x => x.includes(w) || w.includes(x) ||
        (w.length >= 4 && x.length >= 4 && levenshtein(w, x) <= 2))
    );
  })?.id ?? null;
}

const depCache = new Map<string, { id: string } | null>();
async function getDep(tourId: string, date: Date) {
  const key = `${tourId}|${date.toISOString().slice(0, 10)}`;
  if (depCache.has(key)) return depCache.get(key)!;
  const end = new Date(date); end.setDate(end.getDate() + 1);
  let dep = await prisma.departure.findFirst({
    where: { tourId, departureDate: { gte: date, lt: end } },
  });
  if (!dep && !DRY_RUN) {
    dep = await prisma.departure.create({
      data: { tourId, departureDate: date, status: "OPEN" },
    });
    console.log(`      ✅ Выезд создан: ${date.toISOString().slice(0, 10)}`);
  }
  depCache.set(key, dep);
  return dep;
}

// ── Per-sheet totals ──────────────────────────────────────────────────────────

let totalCreated = 0, totalSkipped = 0, totalErrors = 0;

interface Group {
  date: Date;
  client: { name: string; phone: string };
  managerName: string;
  company: string;
  persons: number;
  deposit: number;
  finalPrice: number;
  companions: string[];
}

for (const [sheetName, slug] of Object.entries(SHEET_SLUG)) {
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.log(`\n⚠ Лист не найден: ${sheetName}`);
    continue;
  }
  const tour = tours.find(t => t.slug === slug);
  if (!tour) {
    console.log(`\n⚠ Тур не найден в БД: ${slug}`);
    continue;
  }

  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  console.log(`\n${"─".repeat(60)}`);
  console.log(`📋 [${sheetName}] → ${tour.title}`);

  let currentDate: Date | null = null;
  const groups: Group[] = [];
  let currentGroup: Group | null = null;

  for (const row of rows) {
    const colA = cell(row, 0);
    const name = cell(row, 1);
    const persons = num(row, 2) || 1;
    const deposit = num(row, 3);
    const balance = num(row, 4);
    const phone = cell(row, 5);
    const managerName = cell(row, 6);
    const company = cell(row, 7);

    if (colA && isDateCell(colA)) currentDate = parseDate(colA);
    if (!name || !currentDate) continue;

    if (phone) {
      currentGroup = {
        date: currentDate,
        client: { name, phone: normalizePhone(phone) },
        managerName, company, persons, deposit,
        finalPrice: deposit + balance,
        companions: [],
      };
      if (deposit === 0 && balance === 0) {
        console.warn(`  ⏭ "${name}" — нет оплаты, пропускаем`);
        currentGroup = null;
        continue;
      }
      groups.push(currentGroup);
    } else {
      if (!currentGroup || currentGroup.date.getTime() !== currentDate.getTime()) {
        console.warn(`  ⚠ "${name}" — нет телефона и нет предыдущей заявки, пропускаем`);
        continue;
      }
      currentGroup.persons += persons;
      currentGroup.deposit += deposit;
      currentGroup.finalPrice += deposit + balance;
      currentGroup.companions.push(name);
    }
  }

  let sheetCreated = 0, sheetSkipped = 0, sheetErrors = 0;

  for (const g of groups) {
    const dep = await getDep(tour.id, g.date);
    const managerId = findManager(g.managerName);
    const compStr = g.companions.length ? ` (${g.companions.join(", ")})` : "";
    const dateStr = g.date.toISOString().slice(0, 10);

    if (DRY_RUN || !dep) {
      console.log(`  👤 ${g.client.name}${compStr}  ${dateStr}  ${g.persons}чел  д:${g.deposit} ф:${g.finalPrice}`);
      sheetSkipped++;
      continue;
    }

    try {
      let client = await prisma.client.findUnique({ where: { whatsapp: g.client.phone } });

      if (!client) {
        client = await prisma.client.create({
          data: { name: g.client.name, whatsapp: g.client.phone },
        });
        console.log(`  ✅ Клиент создан: ${client.name}`);
      } else {
        // Duplicate check: same client + same departure
        const dup = await prisma.application.findFirst({
          where: { clientId: client.id, departureId: dep.id },
        });
        if (dup) {
          console.log(`  ⏭ Дубликат: ${client.name} / ${dateStr}`);
          sheetSkipped++;
          continue;
        }
        console.log(`  ♻  Клиент уже есть: ${client.name}`);
      }

      const app = await prisma.application.create({
        data: {
          clientId: client.id,
          tourId: tour.id,
          departureId: dep.id,
          managerId: managerId ?? undefined,
          persons: g.persons,
          status: g.deposit > 0 ? "DEPOSIT" : "NEW",
          comment: g.company || undefined,
        },
      });

      await prisma.booking.create({
        data: {
          applicationId: app.id,
          basePrice: tour.basePrice,
          finalPrice: g.finalPrice,
          depositPaid: g.deposit,
          depositDate: g.deposit > 0 ? new Date() : null,
          paymentStatus:
            g.deposit >= g.finalPrice ? "PAID" :
            g.deposit > 0 ? "PARTIAL" : "PENDING",
          currency: "KGS",
        },
      });

      for (const name of g.companions) {
        await prisma.companion.create({ data: { applicationId: app.id, name } });
      }

      console.log(`  ✅ Заявка: ${g.client.name}${compStr}  ${dateStr}`);
      sheetCreated++;
    } catch (e: unknown) {
      console.error(`  ❌ ${e instanceof Error ? e.message : String(e)}`);
      sheetErrors++;
    }
  }

  console.log(`  → Создано: ${sheetCreated} | Пропущено: ${sheetSkipped} | Ошибок: ${sheetErrors}`);
  totalCreated += sheetCreated;
  totalSkipped += sheetSkipped;
  totalErrors += sheetErrors;
}

console.log(`\n${"═".repeat(60)}`);
if (DRY_RUN) {
  console.log(`Dry-run завершён.`);
} else {
  console.log(`✅ ИТОГО  Создано: ${totalCreated} | Пропущено: ${totalSkipped} | Ошибок: ${totalErrors}`);
}
await prisma.$disconnect();
