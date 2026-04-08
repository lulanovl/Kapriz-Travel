import Header from "@/components/admin/Header";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Администратор",
  SENIOR_MANAGER: "Старший менеджер",
  MANAGER: "Менеджер",
  FINANCE: "Финансист",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700",
  SENIOR_MANAGER: "bg-purple-100 text-purple-700",
  MANAGER: "bg-blue-100 text-blue-700",
  FINANCE: "bg-green-100 text-green-700",
};

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/admin");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      telegramChatId: true,
      createdAt: true,
      _count: { select: { applications: true } },
    },
  });

  return (
    <>
      <Header title="Пользователи" />
      <div className="p-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">
              Сотрудники ({users.length})
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Имя</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Роль</th>
                <th className="px-5 py-3 text-center">Telegram</th>
                <th className="px-5 py-3 text-right">Заявок</th>
                <th className="px-5 py-3 text-right">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-5 py-3 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-500"}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    {u.telegramChatId ? (
                      <span className="text-green-600 text-xs">✓ Привязан</span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600">{u._count.applications}</td>
                  <td className="px-5 py-3 text-right text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString("ru", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
