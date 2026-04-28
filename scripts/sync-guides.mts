/**
 * Syncs guide list with DB:
 * - Updates name/phone if guide already exists (matched by phone or first name)
 * - Creates new guide if not found
 *
 * Usage:
 *   npx tsx scripts/sync-guides.mts --dry-run
 *   npx tsx scripts/sync-guides.mts
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
  if (digits.length === 12 && digits.startsWith("996")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  return `+${digits}`;
}

// Incoming list
const INCOMING = [
  { name: "Элдар Уланов",                phone: "+996558511125" },
  { name: "Нийматова Айгерим",           phone: "+996502202037" },
  { name: "Асема Замирбекова",           phone: "+996701335548" },
  { name: "Алибек Джээнбаев",            phone: "+996500262209" },
  { name: "Нурмат Ишимов",               phone: "+996704597942" },
  { name: "Дастан Тажибаев",             phone: "+996999080519" },
  { name: "Зарылбеков Эрбол",            phone: "+996990270709" },
  { name: "Жумагазиева Айдана",          phone: "+996556291206" },
  { name: "Жакыпбекова Нуриса",          phone: "0706311909" },
  { name: "Эбби Жумадилова",             phone: "+996704290506" },
  { name: "Буканова Нияра",              phone: "+996709156628" },
  { name: "Темирова Томирис",            phone: "+996995055721" },
  { name: "Эрнисова Жаркынай",           phone: "+996706662203" },
  { name: "Миргуль Чалданбаева",         phone: "+996755888327" },
  { name: "Аделя Тойгонбаева",           phone: "+996702556033" },
  { name: "Шахноза Хафизова",            phone: "+996990101278" },  // * → +
  { name: "Дженишбекова Бегимай",        phone: "+996995005272" },
  { name: "Абдижапарова Жанылай",        phone: "+996700178283" },
  { name: "Алия Дайырбекова",            phone: "+996999007718" },
  { name: "Шайбекова Асель",             phone: "+996774239915" },
  { name: "Байэл Турдубеков",            phone: "+996551102233" },
  { name: "Сания Баимбаева",             phone: "+996755599676" },
  { name: "Айсаева Раяна",               phone: "+996707999986" },
  { name: "Аскербекова Касиет",          phone: "+996552171106" },
  { name: "Элиза Алдеева",               phone: "+996705132898" },
  { name: "Нестана Оморкулова",          phone: "+996558800076" },
  { name: "Аделя Равшанбекова",          phone: "+996706025604" },
  { name: "Алишер уулу Алыбек",          phone: "+996700363654" },
  { name: "Алина Алдеева",               phone: "+996550880534" },
  { name: "Эсентур Шейшенов",            phone: "+996705051221" },
  { name: "Айназик Рахманбердиева",      phone: "+996500508250" },
  { name: "Эсенбай кызы Айтурган",       phone: "+996500109912" },
  { name: "Гульбагым Мураталиева",       phone: "+996999514431" },
  { name: "Атамкулова Нуркыз",           phone: "0557333531" },
  { name: "Ахматова Сумая",              phone: "+996998555860" },
  { name: "Асанжанова Айтолкун",         phone: "+996500546235" },
  { name: "Эльдар Эгембердиев",          phone: "+996504603300" },
  { name: "Ибраимов Темирлан",           phone: "+996774929895" },
  { name: "Сыдыкбеков Амантур",          phone: "+996705168648" },
].map(g => ({ ...g, phone: normalizePhone(g.phone) }));

// Load existing staff from DB
const existing = await prisma.staff.findMany({ select: { id: true, name: true, phone: true, role: true } });

console.log(`В базе гидов/водителей: ${existing.length}`);
console.log(`В списке: ${INCOMING.length}\n`);

function firstName(name: string) {
  return name.trim().split(/\s+/)[0].toLowerCase();
}

// Track which DB records are already claimed (avoid double-matching)
const usedIds = new Set<string>();

let created = 0, updated = 0, skipped = 0;

// Pass 1: match by phone (authoritative)
const phoneMatched = new Map<number, typeof existing[0]>(); // INCOMING index → DB record
for (let i = 0; i < INCOMING.length; i++) {
  const g = INCOMING[i];
  const match = existing.find(e => e.phone && normalizePhone(e.phone) === g.phone);
  if (match) {
    phoneMatched.set(i, match);
    usedIds.add(match.id);
  }
}

// Pass 2: for unmatched entries, try first-name match on unused DB records
const nameMatched = new Map<number, typeof existing[0]>();
for (let i = 0; i < INCOMING.length; i++) {
  if (phoneMatched.has(i)) continue;
  const g = INCOMING[i];
  const inFirst = firstName(g.name);
  const candidates = existing.filter(e => !usedIds.has(e.id) && firstName(e.name) === inFirst);
  if (candidates.length === 1) {
    nameMatched.set(i, candidates[0]);
    usedIds.add(candidates[0].id);
  }
}

// Apply
for (let i = 0; i < INCOMING.length; i++) {
  const g = INCOMING[i];
  const match = phoneMatched.get(i) ?? nameMatched.get(i);

  if (match) {
    const needsUpdate = match.name !== g.name || (match.phone ?? "") !== g.phone;
    if (needsUpdate) {
      console.log(`📝 Обновить: "${match.name}" ${match.phone ?? "—"} → "${g.name}" ${g.phone}`);
      if (!DRY_RUN) {
        await prisma.staff.update({
          where: { id: match.id },
          data: { name: g.name, phone: g.phone },
        });
      }
      updated++;
    } else {
      console.log(`✓  Уже есть: ${g.name} ${g.phone}`);
      skipped++;
    }
  } else {
    console.log(`➕ Создать:  ${g.name} ${g.phone}`);
    if (!DRY_RUN) {
      await prisma.staff.create({
        data: { name: g.name, phone: g.phone, role: "guide" },
      });
    }
    created++;
  }
}

console.log(`\n${"═".repeat(55)}`);
if (DRY_RUN) {
  console.log(`Dry-run. Будет создано: ${created} | Обновлено: ${updated} | Уже есть: ${skipped}`);
} else {
  console.log(`✅ Создано: ${created} | Обновлено: ${updated} | Без изменений: ${skipped}`);
}

await prisma.$disconnect();
