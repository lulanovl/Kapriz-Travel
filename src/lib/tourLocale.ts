interface LocalizableTour {
  title: string;
  titleEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  itinerary?: unknown;
  itineraryEn?: unknown;
  included?: unknown;
  includedEn?: unknown;
  notIncluded?: unknown;
  notIncludedEn?: unknown;
  seoTitle?: string | null;
  seoTitleEn?: string | null;
  seoDescription?: string | null;
  seoDescriptionEn?: string | null;
}

export function getLocalizedTour<T extends LocalizableTour>(
  tour: T,
  locale: string
) {
  const isEn = locale === "en";
  return {
    title: isEn ? (tour.titleEn ?? tour.title) : tour.title,
    description: isEn
      ? (tour.descriptionEn ?? tour.description)
      : tour.description,
    itinerary: isEn ? (tour.itineraryEn ?? tour.itinerary) : tour.itinerary,
    included: isEn ? (tour.includedEn ?? tour.included) : tour.included,
    notIncluded: isEn
      ? (tour.notIncludedEn ?? tour.notIncluded)
      : tour.notIncluded,
    seoTitle: isEn ? (tour.seoTitleEn ?? tour.seoTitle) : tour.seoTitle,
    seoDescription: isEn
      ? (tour.seoDescriptionEn ?? tour.seoDescription)
      : tour.seoDescription,
  };
}
