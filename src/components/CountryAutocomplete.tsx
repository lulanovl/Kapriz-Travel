"use client";

import { useState, useRef, useEffect } from "react";
import { filterCountries } from "@/lib/countries";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  inputClassName?: string;
}

export default function CountryAutocomplete({
  value,
  onChange,
  placeholder = "Кыргызстан",
  disabled = false,
  required = false,
  id,
  inputClassName = "",
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(val: string) {
    onChange(val);
    const filtered = filterCountries(val);
    setSuggestions(filtered);
    setOpen(filtered.length > 0);
    setActiveIndex(-1);
  }

  function handleSelect(country: string) {
    onChange(country);
    setSuggestions([]);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          const filtered = filterCountries(value);
          if (filtered.length > 0) {
            setSuggestions(filtered);
            setOpen(true);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete="off"
        className={inputClassName}
      />

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((country, i) => (
            <li
              key={country}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(country);
              }}
              className={`px-3 py-2 text-sm cursor-pointer ${
                i === activeIndex
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-800 hover:bg-gray-50"
              }`}
            >
              {country}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
