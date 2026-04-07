import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "О компании — Kapriz Travel",
  description: "Kapriz Travel — туристическая компания в Кыргызстане. Организуем туры по Центральной Азии с 2018 года.",
};

const team = [
  { name: "Азиз Мамытбеков", role: "Основатель и CEO", years: "6 лет в туризме" },
  { name: "Айгерим Токоева", role: "Старший гид", years: "5 лет опыта" },
  { name: "Бакыт Джумалиев", role: "Логистика и трансфер", years: "4 года опыта" },
];

export default function AboutPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <div className="bg-blue-gradient py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-brand-lime font-heading font-700 text-sm uppercase tracking-widest">
            Kapriz Travel
          </span>
          <h1 className="font-heading font-black text-white uppercase text-4xl sm:text-5xl mt-2">
            О компании
          </h1>
          <p className="text-white/60 mt-4 text-base max-w-2xl leading-relaxed">
            С 2018 года мы открываем туристам красоту Кыргызстана и Центральной Азии.
            Более 2500 туристов уже побывали в наших турах.
          </p>
        </div>
      </div>

      {/* Story */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-brand-blue font-heading font-700 text-sm uppercase tracking-widest">
              Наша история
            </span>
            <h2 className="font-heading font-black text-gray-900 uppercase text-3xl mt-2 mb-6">
              Больше, чем просто путешествие
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Kapriz Travel основана в 2018 году с простой идеей: показать туристам
                настоящий Кыргызстан — не из окна автобуса, а через живой контакт
                с природой, культурой и людьми.
              </p>
              <p>
                Мы специализируемся на однодневных и многодневных турах по
                Кыргызстану, а также организуем поездки в Казахстан и Узбекистан.
                В нашем каталоге — от горных треккингов до культурных экспедиций
                по Шёлковому пути.
              </p>
              <p>
                Каждый тур разработан так, чтобы оставить незабываемые впечатления.
                Опытные гиды, комфортабельный транспорт и прозрачное ценообразование —
                наши главные принципы.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { num: "2500+", label: "Туристов" },
              { num: "6", label: "Лет работы" },
              { num: "13+", label: "Маршрутов" },
              { num: "5", label: "Стран" },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-2xl p-6 text-center">
                <div className="font-heading font-900 text-4xl text-brand-blue">{s.num}</div>
                <div className="font-heading font-600 text-gray-500 text-sm uppercase tracking-wider mt-1">{s.label}</div>
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
              Наша команда
            </span>
            <h2 className="font-heading font-black text-gray-900 uppercase text-3xl mt-2">
              Люди за турами
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {team.map((member) => (
              <div key={member.name} className="bg-white rounded-2xl p-6 text-center shadow-sm">
                <div className="w-16 h-16 bg-blue-gradient rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="font-heading font-900 text-brand-lime text-xl">
                    {member.name[0]}
                  </span>
                </div>
                <h3 className="font-heading font-800 text-gray-900 text-base">{member.name}</h3>
                <p className="text-brand-blue font-heading font-600 text-sm uppercase tracking-wide mt-1">{member.role}</p>
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
            Готовы путешествовать?
          </h2>
          <p className="text-white/60 mt-3 mb-8">
            Выберите тур или оставьте заявку — мы подберём маршрут под вас
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/tours"
              className="bg-brand-lime text-brand-blue-deeper font-heading font-800 uppercase tracking-wider px-8 py-4 rounded-full hover:bg-brand-lime-dark transition-colors duration-200 cursor-pointer"
            >
              Смотреть туры
            </Link>
            <Link
              href="/contact"
              className="border-2 border-white/30 text-white font-heading font-700 uppercase tracking-wider px-8 py-4 rounded-full hover:border-brand-lime hover:text-brand-lime transition-colors duration-200 cursor-pointer"
            >
              Написать нам
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
