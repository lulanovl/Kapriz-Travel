import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[а-яёА-ЯЁ]/g, (char) => {
      const map: Record<string, string> = {
        а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
        ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
        н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
        ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
        ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
      };
      return map[char] ?? char;
    })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tours = await prisma.tour.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { departures: true, applications: true } },
    },
  });

  return NextResponse.json(tours);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, tourType, duration, basePrice, minGroupSize,
    maxGroupSize, itinerary, included, notIncluded, mapEmbed,
    seoTitle, seoDescription, slug: customSlug, images } = body;

  if (!title || !basePrice) {
    return NextResponse.json({ error: "title и basePrice обязательны" }, { status: 400 });
  }

  const slug = customSlug?.trim() || generateSlug(title);

  // Ensure slug uniqueness
  const existing = await prisma.tour.findUnique({ where: { slug } });
  const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

  const tour = await prisma.tour.create({
    data: {
      title,
      slug: finalSlug,
      description,
      tourType,
      duration: duration ? parseInt(duration) : null,
      basePrice: parseInt(basePrice),
      minGroupSize: minGroupSize ? parseInt(minGroupSize) : 1,
      maxGroupSize: maxGroupSize ? parseInt(maxGroupSize) : 20,
      itinerary: itinerary ?? [],
      included: included ?? [],
      notIncluded: notIncluded ?? [],
      mapEmbed,
      seoTitle,
      seoDescription,
      images: images ?? [],
    },
  });

  return NextResponse.json(tour, { status: 201 });
}
