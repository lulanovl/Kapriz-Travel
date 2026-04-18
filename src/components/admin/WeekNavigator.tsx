"use client";

import { useRouter, usePathname } from "next/navigation";

type Props = {
  weekOffset: number;
  label: string;
};

export default function WeekNavigator({ weekOffset, label }: Props) {
  const router   = useRouter();
  const pathname = usePathname();

  const go = (offset: number) =>
    router.push(`${pathname}?period=week&weekOffset=${offset}`);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => go(weekOffset - 1)}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
        title="Предыдущая неделя"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="flex items-center gap-2 px-3 h-8 rounded-lg border border-gray-200 bg-white">
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{label}</span>
        {weekOffset !== 0 && (
          <span className="text-xs text-gray-400">
            ({weekOffset > 0 ? `+${weekOffset}` : weekOffset} нед.)
          </span>
        )}
      </div>

      <button
        onClick={() => go(weekOffset + 1)}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
        title="Следующая неделя"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {weekOffset !== 0 && (
        <button
          onClick={() => go(0)}
          className="px-3 h-8 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors cursor-pointer whitespace-nowrap"
        >
          Эта неделя
        </button>
      )}
    </div>
  );
}
