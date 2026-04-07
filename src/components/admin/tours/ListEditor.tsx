"use client";

interface Props {
  value: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}

export default function ListEditor({ value, onChange, placeholder }: Props) {
  function addItem() {
    onChange([...value, ""]);
  }

  function removeItem(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function updateItem(index: number, val: string) {
    onChange(value.map((item, i) => (i === index ? val : item)));
  }

  return (
    <div className="space-y-2">
      {value.map((item, index) => (
        <div key={index} className="flex gap-2 items-center">
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(index, e.target.value)}
            placeholder={placeholder ?? "Введите пункт..."}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => removeItem(index)}
            className="text-red-400 hover:text-red-600 px-2 py-1 text-sm"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
      >
        + Добавить пункт
      </button>
    </div>
  );
}
