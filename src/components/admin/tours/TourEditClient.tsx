"use client";

import { useState } from "react";
import TourForm from "./TourForm";

interface TourData {
  id: string;
  title: string;
  slug: string;
  description?: string;
  tourType?: string;
  duration?: number;
  basePrice: number;
  minGroupSize: number;
  maxGroupSize: number;
  mapEmbed?: string;
  seoTitle?: string;
  seoDescription?: string;
  isActive: boolean;
  itinerary: { day: number; title: string; description: string }[];
  included: string[];
  notIncluded: string[];
}

export default function TourEditClient({ tour }: { tour: TourData }) {
  const [isEditing, setIsEditing] = useState(false);

  if (!isEditing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">Данные тура</h3>
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Редактировать
          </button>
        </div>

        <div className="space-y-3 text-sm">
          {tour.description && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Описание</p>
              <p className="text-gray-700">{tour.description}</p>
            </div>
          )}

          {tour.itinerary.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Программа</p>
              <div className="space-y-2">
                {tour.itinerary.map((day) => (
                  <div key={day.day} className="flex gap-3">
                    <span className="text-xs font-bold text-blue-600 w-12 shrink-0">
                      День {day.day}
                    </span>
                    <div>
                      <p className="font-medium text-gray-800">{day.title}</p>
                      {day.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{day.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tour.itinerary.length === 0 && !tour.description && (
            <p className="text-gray-400 text-sm italic">Нажмите «Редактировать» чтобы заполнить данные тура.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">Редактирование тура</h3>
        <button
          onClick={() => setIsEditing(false)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Отмена
        </button>
      </div>
      <TourForm
        tourId={tour.id}
        initialData={{
          title: tour.title,
          slug: tour.slug,
          description: tour.description ?? "",
          tourType: tour.tourType ?? "",
          duration: tour.duration ? String(tour.duration) : "",
          basePrice: String(tour.basePrice),
          minGroupSize: String(tour.minGroupSize),
          maxGroupSize: String(tour.maxGroupSize),
          mapEmbed: tour.mapEmbed ?? "",
          seoTitle: tour.seoTitle ?? "",
          seoDescription: tour.seoDescription ?? "",
          isActive: tour.isActive,
          itinerary: tour.itinerary,
          included: tour.included,
          notIncluded: tour.notIncluded,
        }}
      />
    </div>
  );
}
