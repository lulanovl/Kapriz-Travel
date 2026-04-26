import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const tour = await prisma.tour.findUnique({ where: { slug: 'dvukhdnevnyy-tur-v-almaty' } });
if (!tour) { process.stdout.write('❌ Тур не найден\n'); }
else {
  process.stdout.write(`✅ Тур: ${tour.title} (basePrice: ${tour.basePrice})\n`);
  const deps = await prisma.departure.findMany({
    where: { tourId: tour.id },
    orderBy: { departureDate: 'asc' },
    select: { id: true, departureDate: true, status: true },
  });
  process.stdout.write(`Выезды (${deps.length}):\n`);
  for (const d of deps) {
    process.stdout.write(`  ${d.departureDate.toISOString().slice(0,10)}  ${d.status}  id:${d.id}\n`);
  }
}

const users = await prisma.user.findMany({ select: { name: true, email: true, role: true } });
process.stdout.write(`\nПользователи:\n`);
for (const u of users) process.stdout.write(`  ${u.name}  (${u.role})  ${u.email}\n`);

await prisma.$disconnect();
