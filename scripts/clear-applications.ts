import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Delete in FK-safe order (children first)
  const ph  = await prisma.priceHistory.deleteMany();
  const bk  = await prisma.booking.deleteMany();
  const rm  = await prisma.reminder.deleteMany();
  const cp  = await prisma.companion.deleteMany();
  const app = await prisma.application.deleteMany();
  const gt  = await prisma.guideToken.deleteMany();
  const ex  = await prisma.expense.deleteMany();
  const xe  = await prisma.extraExpense.deleteMany();
  const rv  = await prisma.review.deleteMany();
  const gr  = await prisma.group.deleteMany();
  const dep = await prisma.departure.deleteMany();
  const cl  = await prisma.client.deleteMany();

  console.log(`✓ price_history:   ${ph.count}`);
  console.log(`✓ bookings:        ${bk.count}`);
  console.log(`✓ reminders:       ${rm.count}`);
  console.log(`✓ companions:      ${cp.count}`);
  console.log(`✓ applications:    ${app.count}`);
  console.log(`✓ guide_tokens:    ${gt.count}`);
  console.log(`✓ expenses:        ${ex.count}`);
  console.log(`✓ extra_expenses:  ${xe.count}`);
  console.log(`✓ reviews:         ${rv.count}`);
  console.log(`✓ groups:          ${gr.count}`);
  console.log(`✓ departures:      ${dep.count}`);
  console.log(`✓ clients:         ${cl.count}`);
  console.log("\nБаза очищена. Сотрудники, туры и фото — сохранены.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
