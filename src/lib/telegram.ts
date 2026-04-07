const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function sendTelegramMessage(
  chatId: string | number,
  text: string
): Promise<void> {
  if (!BOT_TOKEN) return;

  try {
    const res = await fetch(`${API_BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Telegram API error:", err);
    }
  } catch (error) {
    console.error("Telegram sendMessage error:", error);
  }
}

export function formatApplicationNotification(data: {
  clientName: string;
  whatsapp: string;
  country: string;
  tourTitle: string;
  persons: number;
  preferredDate?: string | null;
  comment?: string | null;
  utmSource?: string | null;
}): string {
  const phone = data.whatsapp.replace("+", "");

  const lines = [
    `🔔 <b>Новая заявка с сайта!</b>`,
    ``,
    `👤 <b>${data.clientName}</b> (${data.country})`,
    `📱 <a href="https://wa.me/${phone}">${data.whatsapp}</a>`,
    ``,
    `🏔 <b>${data.tourTitle}</b>`,
    `👥 ${data.persons} чел.`,
  ];

  if (data.preferredDate) {
    lines.push(`📅 Желаемая дата: ${data.preferredDate}`);
  }

  if (data.comment) {
    lines.push(`💬 ${data.comment}`);
  }

  if (data.utmSource) {
    lines.push(`📊 Источник: ${data.utmSource}`);
  }

  return lines.join("\n");
}
