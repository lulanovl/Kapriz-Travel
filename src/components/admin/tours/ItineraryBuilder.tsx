"use client";

interface ItineraryDay {
  day: number;
  title: string;
  description: string;
}

interface Props {
  value: ItineraryDay[];
  onChange: (days: ItineraryDay[]) => void;
}

export default function ItineraryBuilder({ value, onChange }: Props) {
  function addDay() {
    onChange([
      ...value,
      { day: value.length + 1, title: "", description: "" },
    ]);
  }

  function removeDay(index: number) {
    const updated = value
      .filter((_, i) => i !== index)
      .map((d, i) => ({ ...d, day: i + 1 }));
    onChange(updated);
  }

  function updateDay(index: number, field: "title" | "description", val: string) {
    const updated = value.map((d, i) =>
      i === index ? { ...d, [field]: val } : d
    );
    onChange(updated);
  }

  function moveDay(index: number, direction: "up" | "down") {
    const newArr = [...value];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newArr.length) return;
    [newArr[index], newArr[swapIdx]] = [newArr[swapIdx], newArr[index]];
    onChange(newArr.map((d, i) => ({ ...d, day: i + 1 })));
  }

  return (
    <div className="space-y-3">
      {value.map((day, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              День {day.day}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => moveDay(index, "up")}
                disabled={index === 0}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveDay(index, "down")}
                disabled={index === value.length - 1}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeDay(index)}
                className="px-2 py-1 text-xs text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          </div>
          <input
            type="text"
            value={day.title}
            onChange={(e) => updateDay(index, "title", e.target.value)}
            placeholder="Название дня (напр. Бишкек — Каракол)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={day.description}
            onChange={(e) => updateDay(index, "description", e.target.value)}
            placeholder="Описание программы дня..."
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={addDay}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
      >
        + Добавить день
      </button>
    </div>
  );
}
