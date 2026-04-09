"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const navItems = [
  { href: "/admin", label: "Дашборд", icon: "⬛" },
  { href: "/admin/applications", label: "Заявки", icon: "📋" },
  { href: "/admin/clients", label: "Клиенты", icon: "👥" },
  { href: "/admin/tours", label: "Туры", icon: "🗺️" },
  { href: "/admin/calendar", label: "Календарь", icon: "📅" },
  { href: "/admin/finance", label: "Финансы", icon: "💰" },
  { href: "/admin/reports", label: "Отчёты", icon: "📊" },
];

const adminOnlyItems = [
  { href: "/admin/staff", label: "Персонал", icon: "🧑‍💼" },
  { href: "/admin/users", label: "Пользователи", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin =
    session?.user.role === "ADMIN" ||
    session?.user.role === "SENIOR_MANAGER";

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">Tour CRM</h1>
        <p className="text-xs text-gray-400 mt-1">Управление турами</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider px-3">
                Администрирование
              </p>
            </div>
            {adminOnlyItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User info + profile + logout */}
      <div className="p-4 border-t border-gray-700">
        <div className="mb-3">
          <p className="text-sm font-medium text-white truncate">
            {session?.user.name}
          </p>
          <p className="text-xs text-gray-400 truncate">{session?.user.role}</p>
        </div>
        <Link
          href="/admin/profile"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
            pathname === "/admin/profile"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:bg-gray-800 hover:text-white"
          }`}
        >
          <span>👤</span>
          <span>Профиль</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left text-sm text-gray-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-800"
        >
          Выйти
        </button>
      </div>
    </aside>
  );
}
