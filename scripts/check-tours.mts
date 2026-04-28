import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const tours = await prisma.tour.findMany({
  select: { slug: true, title: true, _count: { select: { applications: true } } },
  orderBy: { slug: "asc" },
});
for (const t of tours) {
  console.log(`${t.slug} => ${t._count.applications} заявок | ${t.title}`);
}
await prisma.$disconnect();
