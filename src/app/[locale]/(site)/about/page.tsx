import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");
  return { title: t("metaTitle"), description: t("metaDesc") };
}

export default async function AboutPage() {
  const t = await getTranslations("about");

  const team = [
    { name: "Азиз Мамытбеков", role: t("team_founder_role"), years: t("team_years_6") },
    { name: "Айгерим Токоева", role: t("team_guide_role"), years: t("team_years_5") },
    { name: "Бакыт Джумалиев", role: t("team_logistics_role"), years: t("team_years_4") },
  ];

  const stats = [
    { num: "2500+", label: t("stat_tourists") },
    { num: "6", label: t("stat_years") },
    { num: "13+", label: t("stat_routes") },
    { num: "5", label: t("stat_countries") },
  ];

  return (
    <div className="bg-white">
      {/* Hero */}
      <div className="bg-blue-gradient py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-brand-lime font-heading font-700 text-sm uppercase tracking-widest">
            {t("label")}
          </span>
          <h1 className="font-heading font-black text-white uppercase text-4xl sm:text-5xl mt-2">
            {t("heading")}
          </h1>
          <p className="text-white/60 mt-4 text-base max-w-2xl leading-relaxed">
            {t("subheading")}
          </p>
        </div>
      </div>

      {/* Story */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-brand-blue font-heading font-700 text-sm uppercase tracking-widest">
              {t("storyLabel")}
            </span>
            <h2 className="font-heading font-black text-gray-900 uppercase text-3xl mt-2 mb-6">
              {t("storyHeading")}
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>{t("p1")}</p>
              <p>{t("p2")}</p>
              <p>{t("p3")}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-2xl p-6 text-center">
                <div className="font-heading font-900 text-4xl text-brand-blue">{s.num}</div>
                <div className="font-heading font-600 text-gray-500 text-sm uppercase tracking-wider mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-brand-blue font-heading font-700 text-sm uppercase tracking-widest">
              {t("teamLabel")}
            </span>
            <h2 className="font-heading font-black text-gray-900 uppercase text-3xl mt-2">
              {t("teamHeading")}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {team.map((member) => (
              <div
                key={member.name}
                className="bg-white rounded-2xl p-6 text-center shadow-sm"
              >
                <div className="w-16 h-16 bg-blue-gradient rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="font-heading font-900 text-brand-lime text-xl">
                    {member.name[0]}
                  </span>
                </div>
                <h3 className="font-heading font-800 text-gray-900 text-base">
                  {member.name}
                </h3>
                <p className="text-brand-blue font-heading font-600 text-sm uppercase tracking-wide mt-1">
                  {member.role}
                </p>
                <p className="text-gray-400 text-xs mt-1">{member.years}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-blue-gradient py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading font-black text-white uppercase text-3xl">
            {t("ctaHeading")}
          </h2>
          <p className="text-white/60 mt-3 mb-8">{t("ctaSub")}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/tours"
              className="bg-brand-lime text-brand-blue-deeper font-heading font-800 uppercase tracking-wider px-8 py-4 rounded-full hover:bg-brand-lime-dark transition-colors duration-200 cursor-pointer"
            >
              {t("viewTours")}
            </Link>
            <Link
              href="/contact"
              className="border-2 border-white/30 text-white font-heading font-700 uppercase tracking-wider px-8 py-4 rounded-full hover:border-brand-lime hover:text-brand-lime transition-colors duration-200 cursor-pointer"
            >
              {t("writeUs")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
