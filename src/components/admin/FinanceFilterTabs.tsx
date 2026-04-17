"use client";

import { useRouter, usePathname } from "next/navigation";

const PERIODS = [
  { value: "week",  label: "Эта неделя" },
  { value: "month", label: "Этот месяц" },
  { value: "all",   label: "Всё время" },
];

export default function FinanceFilterTabs({ current }: { current: string }) {
  const router   = useRouter();
  const pathname = usePathname();

  return (
    <div className="inline-flex gap-1 bg-gray-100 rounded-lg p-1">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => router.push(`${pathname}?period=${p.value}`)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            current === p.value
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
