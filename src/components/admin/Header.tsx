"use client";

import { useSession } from "next-auth/react";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { data: session } = useSession();

  const roleLabels: Record<string, string> = {
    ADMIN: "Администратор",
    SENIOR_MANAGER: "Старший менеджер",
    MANAGER: "Менеджер",
    FINANCE: "Финансист",
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-700">
            {session?.user.name}
          </p>
          <p className="text-xs text-gray-400">
            {roleLabels[session?.user.role ?? ""] ?? session?.user.role}
          </p>
        </div>
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
          {session?.user.name?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
