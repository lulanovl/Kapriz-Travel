import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const message = update.message;
    if (!message?.text) return NextResponse.json({ ok: true });

    const chatId: number = message.chat.id;
    const text = (message.text as string).trim();

    // /start [payload] — welcome message
    if (text === "/start" || text.startsWith("/start ")) {
      await sendTelegramMessage(
        chatId,
        "👋 Привет! Это бот <b>Kapriz Travel CRM</b>.\n\n" +
          "Чтобы получать уведомления о новых заявках, отправьте:\n\n" +
          "<code>/link ваш_email</code>\n\n" +
          "Например:\n<code>/link manager@tourcrm.kg</code>"
      );
      return NextResponse.json({ ok: true });
    }

    // /link EMAIL — bind Telegram chatId to CRM account
    if (text.startsWith("/link ")) {
      const email = text.slice(6).trim().toLowerCase();

      if (!email.includes("@")) {
        await sendTelegramMessage(
          chatId,
          "❌ Укажите корректный email.\n\nПример: <code>/link manager@tourcrm.kg</code>"
        );
        return NextResponse.json({ ok: true });
      }

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        await sendTelegramMessage(
          chatId,
          "❌ Пользователь с таким email не найден в системе.\n\nПроверьте email и попробуйте снова."
        );
        return NextResponse.json({ ok: true });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { telegramChatId: String(chatId) },
      });

      await sendTelegramMessage(
        chatId,
        `✅ Готово, <b>${user.name}</b>!\n\nВы будете получать уведомления о новых заявках с сайта.`
      );
      return NextResponse.json({ ok: true });
    }

    // Unknown command — remind how to use
    await sendTelegramMessage(
      chatId,
      "Для привязки аккаунта отправьте:\n<code>/link ваш_email</code>"
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    // Always return 200 — Telegram will retry on non-2xx
    return NextResponse.json({ ok: true });
  }
}
