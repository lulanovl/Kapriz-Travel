import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage, formatApplicationNotification } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      whatsapp,
      country,
      tourId,
      departureId,
      persons,
      comment,
      utmSource,
      utmMedium,
      utmCampaign,
    } = body;

    if (!name?.trim() || !whatsapp?.trim() || !country?.trim() || !tourId) {
      return NextResponse.json(
        { error: "Заполните обязательные поля" },
        { status: 400 }
      );
    }

    const cleanPhone = whatsapp.replace(/\s+/g, "").replace(/[^+\d]/g, "");

    const tour = await prisma.tour.findUnique({ where: { id: tourId } });
    if (!tour) {
      return NextResponse.json({ error: "Тур не найден" }, { status: 404 });
    }

    // Verify departure belongs to this tour (if provided)
    if (departureId) {
      const departure = await prisma.departure.findUnique({ where: { id: departureId } });
      if (!departure || departure.tourId !== tourId) {
        return NextResponse.json({ error: "Дата выезда не найдена" }, { status: 404 });
      }
    }

    // Deduplicate client by WhatsApp
    let client = await prisma.client.findUnique({ where: { whatsapp: cleanPhone } });
    if (!client) {
      client = await prisma.client.create({
        data: {
          name: name.trim(),
          whatsapp: cleanPhone,
          country: country.trim(),
          source: utmSource || "website",
        },
      });
    }

    const application = await prisma.application.create({
      data: {
        clientId: client.id,
        tourId,
        departureId: departureId || null,
        persons: Number(persons) || 1,
        comment: comment?.trim() || null,
        status: "NEW",
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
      },
    });

    // Send Telegram notifications
    try {
      const notifText = formatApplicationNotification({
        clientName: client.name,
        whatsapp: client.whatsapp,
        country: country.trim(),
        tourTitle: tour.title,
        persons: Number(persons) || 1,
        preferredDate: null,
        comment: comment?.trim() || null,
        utmSource: utmSource || null,
      });

      const managers = await prisma.user.findMany({
        where: {
          telegramChatId: { not: null },
          role: { in: ["ADMIN", "SENIOR_MANAGER", "MANAGER"] },
        },
        select: { telegramChatId: true },
      });

      await Promise.all(
        managers
          .filter((u) => u.telegramChatId)
          .map((u) => sendTelegramMessage(u.telegramChatId!, notifText))
      );
    } catch (err) {
      console.error("Telegram notify error:", err);
    }

    return NextResponse.json({ success: true, applicationId: application.id });
  } catch (error) {
    console.error("Apply API error:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
