/**
 * One-off import of "Лист7" from tours.xlsx as sary-chelek-3-dnya.
 * Usage: npx tsx scripts/import-sheet7.mts [--dry-run]
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
const TOUR_SLUG = "sary-chelek-3-dnya";
const SHEET_NAME = "Лист7";
const FILE = path.resolve(process.cwd(), "tours.xlsx");

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
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function cell(row: unknown[], idx: number): string {
  const v = row[idx];
  return v != null ? String(v).trim() : "";
}
function num(row: unknown[], idx: number): number {
  const v = row[idx];
  if (v == null || v === "") return 0;
  return Number(v) || 0;
}
function isDateCell(v: string) { return /^\d{1,2}\.\d{1,2}$/.test(v); }
function parseDate(v: string) {
  const [day, month] = v.split(".").map(Number);
  return new Date(Date.UTC(YEAR, month - 1, day));
}

// ── Read sheet ────────────────────────────────────────────────────────────────
const wb = XLSX.readFile(FILE);
const ws = wb.Sheets[SHEET_NAME];
if (!ws) { console.error(`Лист "${SHEET_NAME}" не найден`); process.exit(1); }
const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

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

const groups: Group[] = [];
let currentDate: Date | null = null;
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
      managerName, company, persons,
      deposit, finalPrice: deposit + balance,
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

console.log(`\n📋 Лист7 → ${TOUR_SLUG}`);
console.log(`🧪 Dry run: ${DRY_RUN ? "YES" : "NO"}`);
console.log(`Итого групп: ${groups.length}\n`);

const tour = await prisma.tour.findUnique({ where: { slug: TOUR_SLUG }, select: { id: true, title: true, basePrice: true } });
if (!tour) { console.error("Тур не найден: " + TOUR_SLUG); process.exit(1); }
console.log(`Тур: ${tour.title}`);

const users = await prisma.user.findMany({ select: { id: true, name: true } });
function findManager(name: string) {
  if (!name) return null;
  const words = name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  return users.find(u => {
    const uw = u.name.toLowerCase().split(/\s+/);
    return words.some(w => uw.some(x => x.includes(w) || w.includes(x) || (w.length >= 4 && x.length >= 4 && levenshtein(w, x) <= 2)));
  })?.id ?? null;
}

// Ensure departures exist
const depCache = new Map<string, { id: string; status: string } | null>();
async function getDep(date: Date) {
  const key = date.toISOString().slice(0, 10);
  if (depCache.has(key)) return depCache.get(key)!;
  const end = new Date(date); end.setDate(end.getDate() + 1);
  let dep = await prisma.departure.findFirst({ where: { tourId: tour!.id, departureDate: { gte: date, lt: end } } });
  if (!dep) {
    if (!DRY_RUN) {
      dep = await prisma.departure.create({ data: { tourId: tour!.id, departureDate: date, status: "ACTIVE" } });
      console.log(`  ✅ Выезд создан: ${key}`);
    } else {
      console.log(`  [dry] Выезд отсутствует, будет создан: ${key}`);
    }
  }
  depCache.set(key, dep);
  return dep;
}

let created = 0, skipped = 0, errors = 0;

for (const g of groups) {
  const dateStr = g.date.toISOString().slice(0, 10);
  const dep = await getDep(g.date);
  const managerId = findManager(g.managerName);
  const compStr = g.companions.length ? ` (${g.companions.join(", ")})` : "";
  console.log(`\n  👤 ${g.client.name}${compStr}  |  ${dateStr}  |  ${g.persons} чел  |  депозит ${g.deposit}  финал ${g.finalPrice}`);
  console.log(`     Менеджер: ${managerId ? g.managerName : `❓ "${g.managerName}"`}${g.company ? `  |  ${g.company}` : ""}`);

  if (DRY_RUN || !dep) { skipped++; continue; }

  try {
    let client = await prisma.client.findUnique({ where: { whatsapp: g.client.phone } });
    if (!client) {
      client = await prisma.client.create({ data: { name: g.client.name, whatsapp: g.client.phone } });
      console.log(`     ✅ Клиент создан`);
    } else {
      const dup = await prisma.application.findFirst({ where: { clientId: client.id, departureId: dep.id } });
      if (dup) { console.log(`     ⏭ Дубликат, пропускаем`); skipped++; continue; }
      console.log(`     ♻  Клиент уже есть: ${client.name}`);
    }

    const app = await prisma.application.create({
      data: {
        clientId: client.id, tourId: tour!.id, departureId: dep.id,
        managerId: managerId ?? undefined,
        persons: g.persons,
        status: g.deposit > 0 ? "DEPOSIT" : "NEW",
        comment: g.company || undefined,
      },
    });
    await prisma.booking.create({
      data: {
        applicationId: app.id, basePrice: tour!.basePrice,
        finalPrice: g.finalPrice, depositPaid: g.deposit,
        depositDate: g.deposit > 0 ? new Date() : null,
        paymentStatus: g.deposit >= g.finalPrice ? "PAID" : g.deposit > 0 ? "PARTIAL" : "PENDING",
        currency: "KGS",
      },
    });
    for (const name of g.companions) {
      await prisma.companion.create({ data: { applicationId: app.id, name } });
    }
    console.log(`     ✅ Заявка создана (${app.id})`);
    created++;
  } catch (e: unknown) {
    console.error(`     ❌ Ошибка: ${e instanceof Error ? e.message : String(e)}`);
    errors++;
  }
}

console.log(`\n${"═".repeat(50)}`);
if (DRY_RUN) {
  console.log(`✅ Dry-run: найдено ${groups.length} заявок.`);
} else {
  console.log(`✅ Создано: ${created} | Пропущено: ${skipped} | Ошибок: ${errors}`);
}
await prisma.$disconnect();
