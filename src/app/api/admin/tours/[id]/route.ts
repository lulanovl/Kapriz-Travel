import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tour = await prisma.tour.findUnique({
    where: { id: params.id },
  });

  if (!tour) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tour);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, tourType, duration, basePrice, minGroupSize,
    maxGroupSize, itinerary, included, notIncluded, mapEmbed,
    seoTitle, seoDescription, slug, isActive, images,
    titleEn, descriptionEn, itineraryEn, includedEn, notIncludedEn,
    seoTitleEn, seoDescriptionEn } = body;

  const tour = await prisma.tour.update({
    where: { id: params.id },
    data: {
      title,
      slug,
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
      isActive: Boolean(isActive),
      images: images ?? [],
      titleEn: titleEn || null,
      descriptionEn: descriptionEn || null,
      itineraryEn: itineraryEn ?? [],
      includedEn: includedEn ?? [],
      notIncludedEn: notIncludedEn ?? [],
      seoTitleEn: seoTitleEn || null,
      seoDescriptionEn: seoDescriptionEn || null,
    },
  });

  return NextResponse.json(tour);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.tour.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
