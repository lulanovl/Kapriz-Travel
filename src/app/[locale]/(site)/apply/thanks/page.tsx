import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function ThanksPage() {
  const t = await getTranslations("apply");

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-blue-gradient rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-brand-lime"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="font-heading font-black text-gray-900 uppercase text-3xl">
          {t("thanksHeading")}
        </h1>
        <p className="text-gray-500 mt-4 leading-relaxed">
          {t("thanksText")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link
            href="/tours"
            className="bg-brand-blue text-white font-heading font-800 uppercase tracking-wider text-sm px-6 py-3 rounded-full hover:bg-brand-blue-dark transition-colors duration-200 cursor-pointer"
          >
            {t("viewTours")}
          </Link>
          <Link
            href="/"
            className="border border-gray-200 text-gray-700 font-heading font-700 uppercase tracking-wider text-sm px-6 py-3 rounded-full hover:border-brand-blue hover:text-brand-blue transition-colors duration-200 cursor-pointer"
          >
            {t("backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
