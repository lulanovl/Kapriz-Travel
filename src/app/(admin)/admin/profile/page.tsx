import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Администратор",
  SENIOR_MANAGER: "Старший менеджер",
  MANAGER: "Менеджер",
  FINANCE: "Финансист",
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, telegramChatId: true, createdAt: true },
  });

  if (!user) redirect("/login");

  const isAdmin = user.role === "ADMIN";
  const botName = process.env.TELEGRAM_BOT_NAME ?? "KaprizTravelBot";

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Профиль</h1>

      {/* User info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Учётная запись
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Имя</span>
            <span className="text-sm font-medium text-gray-900">{user.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium text-gray-900">{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Роль</span>
            <span className="text-sm font-medium text-gray-900">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">В системе с</span>
            <span className="text-sm text-gray-600">
              {new Date(user.createdAt).toLocaleDateString("ru", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Telegram section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Telegram уведомления
        </h2>

        {user.telegramChatId ? (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Telegram подключён</p>
              <p className="text-xs text-gray-400 mt-0.5">Chat ID: {user.telegramChatId}</p>
              <p className="text-sm text-gray-600 mt-2">
                Вы получаете уведомления о новых заявках с сайта.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Telegram не подключён</p>
                <p className="text-sm text-gray-500 mt-1">
                  Подключите Telegram, чтобы мгновенно получать уведомления о новых заявках.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Как подключить:</p>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                <li>
                  Откройте Telegram и найдите бота{" "}
                  <a
                    href={`https://t.me/${botName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 font-medium hover:underline"
                  >
                    @{botName}
                  </a>
                </li>
                <li>Нажмите <strong>Start</strong></li>
                <li>
                  Отправьте команду:
                  <code className="block mt-1 bg-white border border-gray-200 rounded px-3 py-1.5 text-xs font-mono text-gray-800">
                    /link {user.email}
                  </code>
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Admin: Webhook setup */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Настройка бота (Admin)
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            Чтобы активировать бота на production, зарегистрируйте webhook одной командой:
          </p>
          <code className="block bg-gray-900 text-green-400 rounded-lg px-4 py-3 text-xs font-mono whitespace-pre-wrap">
            {`curl "https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/setWebhook?url=https://YOUR_DOMAIN/api/telegram/webhook"`}
          </code>
          <p className="text-xs text-gray-400 mt-3">
            Замените <strong>YOUR_DOMAIN</strong> на реальный домен (Vercel URL).
            Для локальной разработки используйте ngrok.
          </p>
        </div>
      )}
    </div>
  );
}
