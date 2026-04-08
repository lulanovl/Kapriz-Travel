import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NEW: { label: "Новая", color: "bg-blue-100 text-blue-700" },
  CONTACT: { label: "Контакт", color: "bg-yellow-100 text-yellow-700" },
  PROPOSAL: { label: "КП", color: "bg-purple-100 text-purple-700" },
  DEPOSIT: { label: "Предоплата", color: "bg-orange-100 text-orange-700" },
  NO_SHOW: { label: "Не явился", color: "bg-red-100 text-red-700" },
  ON_TOUR: { label: "В туре", color: "bg-green-100 text-green-700" },
  FEEDBACK: { label: "Отзыв", color: "bg-teal-100 text-teal-700" },
  ARCHIVE: { label: "Архив", color: "bg-gray-100 text-gray-500" },
};

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      applications: {
        orderBy: { createdAt: "desc" },
        include: {
          tour: { select: { id: true, title: true } },
          manager: { select: { name: true } },
          booking: {
            select: {
              finalPrice: true,
              depositPaid: true,
              paymentStatus: true,
              currency: true,
            },
          },
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: {
          tourDate: {
            include: { tour: { select: { title: true } } },
          },
        },
      },
    },
  });

  if (!client) notFound();

  const totalApplications = client.applications.length;
  const totalSpend = client.applications.reduce(
    (sum, a) => sum + (a.booking?.depositPaid ?? 0),
    0
  );
  const phone = client.whatsapp.replace(/\D/g, "");
  const isRepeat = totalApplications > 1;

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/admin/clients" className="hover:text-blue-600">
          Клиенты
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{client.name}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left — client profile */}
        <div className="space-y-5">
          {/* Profile card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {client.name}
                </h1>
                {isRepeat && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                    Повторный клиент
                  </span>
                )}
                {client.noShow && (
                  <span className="ml-1 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                    Не явился
                  </span>
                )}
              </div>
            </div>

            {/* WhatsApp */}
            <a
              href={`https://wa.me/${phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg px-3 py-2 mb-4 transition-colors"
            >
              <span className="text-xl">💬</span>
              <div>
                <p className="text-xs text-green-700 font-medium">WhatsApp</p>
                <p className="text-sm text-green-900">{client.whatsapp}</p>
              </div>
            </a>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {client.country && (
                <div>
                  <p className="text-xs text-gray-400">Страна</p>
                  <p className="font-medium text-gray-800">{client.country}</p>
                </div>
              )}
              {client.city && (
                <div>
                  <p className="text-xs text-gray-400">Город</p>
                  <p className="font-medium text-gray-800">{client.city}</p>
                </div>
              )}
              {client.source && (
                <div>
                  <p className="text-xs text-gray-400">Источник</p>
                  <p className="font-medium text-gray-800">{client.source}</p>
                </div>
              )}
              {client.tag && (
                <div>
                  <p className="text-xs text-gray-400">Тег</p>
                  <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                    {client.tag}
                  </span>
                </div>
              )}
            </div>

            {client.notes && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-1">Заметки</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                  {client.notes}
                </p>
              </div>
            )}

            <p className="text-xs text-gray-400 mt-3">
              Зарегистрирован:{" "}
              {new Date(client.createdAt).toLocaleDateString("ru", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Статистика
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Всего заявок</span>
                <span className="text-lg font-bold text-gray-900">
                  {totalApplications}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Оплачено</span>
                <span className="text-lg font-bold text-green-600">
                  {totalSpend > 0
                    ? `${totalSpend.toLocaleString()} сом`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Отзывов</span>
                <span className="text-lg font-bold text-gray-900">
                  {client.reviews.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right — applications history */}
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">
                История туров ({totalApplications})
              </h2>
            </div>

            {client.applications.length === 0 ? (
              <div className="px-5 py-10 text-center text-gray-400 text-sm">
                Заявок пока нет
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {client.applications.map((app) => {
                  const s = STATUS_LABELS[app.status] ?? {
                    label: app.status,
                    color: "bg-gray-100 text-gray-500",
                  };
                  const balance = app.booking
                    ? app.booking.finalPrice - app.booking.depositPaid
                    : null;

                  return (
                    <div
                      key={app.id}
                      className="px-5 py-4 hover:bg-gray-50 flex items-start justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Link
                            href={`/admin/applications/${app.id}`}
                            className="font-medium text-gray-900 hover:text-blue-600 text-sm"
                          >
                            {app.tour.title}
                          </Link>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full ${s.color}`}
                          >
                            {s.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>{app.persons} чел.</span>
                          {app.preferredDate && (
                            <span>{app.preferredDate}</span>
                          )}
                          {app.manager && <span>{app.manager.name}</span>}
                          <span>
                            {new Date(app.createdAt).toLocaleDateString("ru", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {app.booking ? (
                          <>
                            <p className="text-sm font-medium text-gray-800">
                              {app.booking.finalPrice.toLocaleString()}{" "}
                              {app.booking.currency}
                            </p>
                            {balance !== null && balance > 0 && (
                              <p className="text-xs text-orange-500">
                                остаток {balance.toLocaleString()}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-300">
                            Нет брони
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reviews */}
          {client.reviews.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-800">
                  Отзывы ({client.reviews.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-50">
                {client.reviews.map((review) => (
                  <div key={review.id} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-yellow-400">
                        {"★".repeat(review.rating)}
                        {"☆".repeat(5 - review.rating)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {review.tourDate.tour.title}
                      </span>
                      {review.isPublished && (
                        <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                          Опубликован
                        </span>
                      )}
                    </div>
                    {review.text && (
                      <p className="text-sm text-gray-700">{review.text}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
