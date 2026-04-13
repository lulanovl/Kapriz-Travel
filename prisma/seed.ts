import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function addDays(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log("🌱 Seeding database...");

  // ── Users ─────────────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@tourcrm.kg" },
    update: {},
    create: { name: "Администратор", email: "admin@tourcrm.kg", password: hashedPassword, role: "ADMIN" },
  });
  const senior = await prisma.user.upsert({
    where: { email: "senior@tourcrm.kg" },
    update: {},
    create: { name: "Айгуль Токтосунова", email: "senior@tourcrm.kg", password: hashedPassword, role: "SENIOR_MANAGER" },
  });
  const manager = await prisma.user.upsert({
    where: { email: "manager@tourcrm.kg" },
    update: {},
    create: { name: "Бакыт Жолдошев", email: "manager@tourcrm.kg", password: hashedPassword, role: "MANAGER" },
  });
  await prisma.user.upsert({
    where: { email: "finance@tourcrm.kg" },
    update: {},
    create: { name: "Зарина Ибраева", email: "finance@tourcrm.kg", password: hashedPassword, role: "FINANCE" },
  });
  console.log("✅ Users created");

  // ── Staff ─────────────────────────────────────────────────────────────────
  const guide1 = await prisma.staff.upsert({
    where: { id: "guide-001" },
    update: {},
    create: { id: "guide-001", name: "Асылбек Мамытбеков", role: "guide", phone: "+996700111222" },
  });
  const guide2 = await prisma.staff.upsert({
    where: { id: "guide-002" },
    update: {},
    create: { id: "guide-002", name: "Нурзат Алиева", role: "guide", phone: "+996700222333" },
  });
  const driver1 = await prisma.staff.upsert({
    where: { id: "driver-001" },
    update: {},
    create: { id: "driver-001", name: "Нурлан Эсенов", role: "driver", phone: "+996700333444" },
  });
  const driver2 = await prisma.staff.upsert({
    where: { id: "driver-002" },
    update: {},
    create: { id: "driver-002", name: "Марат Дуйшенбеков", role: "driver", phone: "+996700444555" },
  });
  console.log("✅ Staff created");

  // ── Tours ─────────────────────────────────────────────────────────────────
  const toursData = [
    {
      slug: "almaty-1-day",
      title: "Однодневный тур в Алматы",
      description: "Насыщенная однодневная поездка в Алматы — метро, Медео, Шымбулак, зоопарк, Кок-Тобе и шопинг в ТЦ Мега. Выезд в 3:30, возвращение вечером.",
      tourType: "day_trip",
      duration: 1,
      basePrice: 2500,
      minGroupSize: 5,
      maxGroupSize: 18,
      itinerary: [
        { day: 1, title: "Алматы — полный день", description: "Завтрак в столовой «Каганат». Катание на метро. Медео и Шымбулак. Зоопарк. Обед. Кок-Тобе — панорамный вид, канатная дорога. «Нурлы Тау» (проезжаем). Шопинг в ТЦ Мега. Возвращение в Бишкек." },
      ],
      included: ["Трансфер (18-местный бус)", "Экскурсия по городу", "Сопровождающий гид", "Билет в метро"],
      notIncluded: ["Входные билеты на локации", "Питание (3000–4000 сом)", "Личные расходы"],
      seoTitle: "Однодневный тур в Алматы из Бишкека | Kapriz Travel",
      seoDescription: "Однодневная поездка в Алматы: Медео, Шымбулак, зоопарк, Кок-Тобе. Выезд 3:30. Цена 2500 сом.",
    },
    {
      slug: "almaty-2-days",
      title: "Двухдневный тур в Алматы",
      description: "Два дня в Алматы с проживанием в отеле. Зоопарк, парк Горького, динопарк, вечерний Кок-Тобе, Медео, Чимбулак, шопинг в Мега.",
      tourType: "cultural",
      duration: 2,
      basePrice: 6500,
      minGroupSize: 4,
      maxGroupSize: 18,
      itinerary: [
        { day: 1, title: "Алматы — день первый", description: "Завтрак. Катание на метро. Большой Алматинский зоопарк. Парк Горького. Динопарк. Обед. Музей Алматы. Заселение в отель. Вечер: Кок-Тобе, канатная дорога, ужин." },
        { day: 2, title: "Алматы — день второй", description: "Завтрак. Медео (панорамный вид). Горнолыжная база Чимбулак. «Нурлы Тау». Обед. Парк первого президента. Шопинг в ТЦ Мега. Ужин. Выезд в Бишкек." },
      ],
      included: ["Комфортабельный транспорт (туда-обратно)", "Услуги сопровождающего гида", "Проживание в отеле", "Завтраки", "Билет в метро"],
      notIncluded: ["Расходы на входные билеты", "Обеды и ужины", "Личные расходы"],
      seoTitle: "Двухдневный тур в Алматы из Бишкека | Kapriz Travel",
      seoDescription: "2 дня в Алматы с отелем: зоопарк, Медео, Чимбулак, вечерний Кок-Тобе. Цена 6500 сом.",
    },
    {
      slug: "tashkent-2-days",
      title: "Двухдневный сити-тур в Ташкент",
      description: "Два незабываемых дня в столице Узбекистана. Исторический центр, Хаст Имам, Чорсу, Tashkent City с поющими фонтанами, Magic City.",
      tourType: "cultural",
      duration: 2,
      basePrice: 9900,
      minGroupSize: 4,
      maxGroupSize: 18,
      itinerary: [
        { day: 1, title: "Ташкент — исторический центр", description: "Прибытие. Завтрак. Сквер Амира Тимура. Ташкентский Бродвей. Заселение в отель. Монумент Мужества. Площадь Хаст Имам. Медресе Муре Мубор. Обед. Площадь Независимости. Вечер: Tashkent City, Magic City." },
        { day: 2, title: "Ташкент — Минор и Чорсу", description: "Завтрак в отеле. Мечеть «Минор». Древний базар «Чорсу». Обед в центре плова «Беш Казан». Выезд в Бишкек." },
      ],
      included: ["Комфортабельный транспорт (туда-обратно)", "Услуги тур-лидера", "Экскурсия с профессиональным гидом", "Проживание в отеле", "Завтрак"],
      notIncluded: ["Личные расходы", "Обеды и ужины", "Входные билеты на локации"],
      seoTitle: "Двухдневный тур в Ташкент из Бишкека | Kapriz Travel",
      seoDescription: "2 дня в Ташкенте: Хаст Имам, Чорсу, Tashkent City. Загранпаспорт обязателен. 9900 сом.",
    },
    {
      slug: "uzbekistan-4-days",
      title: "Ташкент — Самарканд — Бухара (4 дня)",
      description: "Четыре дня по городам Узбекистана: столица, Регистан, мавзолей Гур-Эмир, Бухарская цитадель Арк. Поезда между городами включены.",
      tourType: "cultural",
      duration: 4,
      basePrice: 24000,
      minGroupSize: 4,
      maxGroupSize: 18,
      itinerary: [
        { day: 1, title: "Ташкент", description: "Сквер Амира Темура. Монумент Мужества. Площадь Независимости. Метро. Мечеть «Минор». Центр плова «Беш Казан». Tashkent City, фонтаны, Magic City." },
        { day: 2, title: "Самарканд", description: "После завтрака — поезд в Самарканд. Мавзолей Гур-Эмир. Площадь Регистан. Обед. Базар Сиаб. Мечеть Бибиханум. Шахи-Зинда. Ужин. Поезд в Бухару." },
        { day: 3, title: "Бухара", description: "Завтрак. Экскурсия: Мавзолей Саманидов, Чашмаи-Аюб, Мечеть Боло-Хаус, Цитадель Арк. Обед. Минарет «Калян». Торговые купола. Ансамбль «Пои-Калян». Комплекс «Ляби-Хаус»." },
        { day: 4, title: "Возвращение в Бишкек", description: "Завтрак. Поезд Бухара — Ташкент. Обед. Выезд в Бишкек." },
      ],
      included: ["Билеты на скоростные поезда", "Трансфер на протяжении всей поездки", "Профессиональный гид-экскурсовод", "Сопровождающий тур-лидер", "Проживание в отелях (3 ночи)", "Завтраки"],
      notIncluded: ["Обеды и ужины", "Входные билеты", "Личные расходы"],
      seoTitle: "Тур Ташкент Самарканд Бухара 4 дня | Kapriz Travel",
      seoDescription: "4 дня по городам Узбекистана: Ташкент, Самарканд, Бухара. Поезда включены. 24000 сом.",
    },
    {
      slug: "tashkent-samarkand-3-days",
      title: "Ташкент — Самарканд (3 дня)",
      description: "Три дня в Узбекистане: исторический Ташкент, вечерний Регистан, фабрика бумаги XIV века, базар Сияб.",
      tourType: "cultural",
      duration: 3,
      basePrice: 14900,
      minGroupSize: 4,
      maxGroupSize: 18,
      itinerary: [
        { day: 1, title: "Ташкент", description: "Парк Шохидлар. Завтрак. Сквер Амира Тимура. Метро. Площадь Независимости. Комплекс «Хаст Имам». Рынок Чорсу. Tashkent City. Magic City." },
        { day: 2, title: "Самарканд", description: "Завтрак. Выезд в Самарканд. Фабрика бумаги «Конигил Мерос» (XIV в.). Шахи-Зинда. Мавзолей Каримова. Гур-Эмир. Медресе Биби-Ханым. Рынок «Сияб». Вечерний Регистан. Ужин." },
        { day: 3, title: "Возвращение", description: "Выезд в Ташкент. Обед в «Беш Казан». Выезд в Бишкек." },
      ],
      included: ["Комфортабельный транспорт (туда-обратно)", "Услуги тур-лидера", "Экскурсия с профессиональным гидом", "Проживание в отеле", "Завтраки"],
      notIncluded: ["Обеды и ужины", "Входные билеты", "Личные расходы"],
      seoTitle: "Тур Ташкент Самарканд 3 дня | Kapriz Travel",
      seoDescription: "3 дня в Узбекистане: Ташкент и Самарканд. Регистан, Гур-Эмир. Загранпаспорт обязателен. 14900 сом.",
    },
    {
      slug: "horse-tour-chon-kemin",
      title: "Конный тур в Чоң-Кемин",
      description: "Однодневный конный тур в живописном ущелье Чоң-Кемин. 3–4 часа верховой езды с опытными конюхами, ужин на природе.",
      tourType: "adventure",
      duration: 1,
      basePrice: 2600,
      minGroupSize: 3,
      maxGroupSize: 15,
      itinerary: [
        { day: 1, title: "Чоң-Кемин — конная прогулка", description: "Закуп в «Глобусе». Приезд в Чоң-Кемин. Инструктаж. Катание на лошадях (3–4 часа). Ужин. Выезд в Бишкек в 17:00. Приезд в 19:00." },
      ],
      included: ["Транспорт в обе стороны", "Аренда лошадей", "Услуги конюхов", "Услуги тур-гида", "Ужин"],
      notIncluded: ["Личные расходы", "Дополнительное питание"],
      seoTitle: "Конный тур в Чоң-Кемин | Kapriz Travel",
      seoDescription: "Конная прогулка в ущелье Чоң-Кемин: 3–4 часа на лошадях, ужин на природе. 2600 сом.",
    },
    {
      slug: "combo-canyon-issyk-kul",
      title: "Комбо тур: каньоны + Иссык-Куль",
      description: "Насыщенный однодневный комбо-тур: каньоны Кок-Мойнок, круиз на теплоходе, пляж Иссык-Куля, горячие источники.",
      tourType: "relax",
      duration: 1,
      basePrice: 2200,
      minGroupSize: 5,
      maxGroupSize: 18,
      itinerary: [
        { day: 1, title: "Каньоны + Иссык-Куль", description: "Выезд в 7:30 от Вечного огня. Каньоны Кок-Мойнок. Круиз на теплоходе. Пляж Иссык-Куля. Горячие источники (доп. расход). Возвращение в Бишкек в 21:00." },
      ],
      included: ["Транспорт в обе стороны", "Услуги гида", "Круиз на теплоходе", "Вход на каньоны"],
      notIncluded: ["Вход на горячие источники", "Питание", "Личные расходы"],
      seoTitle: "Комбо тур: каньоны Кок-Мойнок + Иссык-Куль | Kapriz Travel",
      seoDescription: "Каньоны, теплоход, пляж Иссык-Куля и горячие источники за один день. 2200 сом.",
    },
    {
      slug: "turkestan-2-days",
      title: "Тур в Туркестан (2 дня)",
      description: "Два дня в древнем Туркестане — мавзолей Ходжи Ахмеда Ясави, подземная мечеть Хильвет, Каравансарай с летающим театром.",
      tourType: "cultural",
      duration: 2,
      basePrice: 8900,
      minGroupSize: 4,
      maxGroupSize: 18,
      itinerary: [
        { day: 1, title: "Туркестан — исторический центр", description: "Прибытие. Завтрак. Мавзолей Х.А. Ясави. Подземная мечеть «Хильвет». Катание на верблюдах, стрельба из лука. Обед. Заселение в отель. Вечер: Комплекс «Казван-Сарай» — летающий театр." },
        { day: 2, title: "Арыстан-Баба и Отрар", description: "Завтрак. Мавзолей Арыстан-Баба. Древний город Отрар. Обед. Ак-Мечеть (пещера Дракона). Выезд в Бишкек." },
      ],
      included: ["Проживание в отеле", "Трансфер (18-местный бус)", "Услуги гида", "Завтрак"],
      notIncluded: ["Входные билеты", "Обеды, ужины", "Личные расходы"],
      seoTitle: "Тур в Туркестан из Бишкека 2 дня | Kapriz Travel",
      seoDescription: "2 дня в Туркестане: мавзолей Ясави, подземная мечеть, Каравансарай. 8900 сом.",
    },
    {
      slug: "sky-bridge-zipline",
      title: "Небесный мост + зиплайн",
      description: "Однодневный приключенческий тур в ущелье Чункурчак: небесный мост, голубиный водопад и адреналиновый зиплайн.",
      tourType: "adventure",
      duration: 1,
      basePrice: 1600,
      minGroupSize: 5,
      maxGroupSize: 20,
      itinerary: [
        { day: 1, title: "Чункурчак — небесный мост и зиплайн", description: "Выезд в 9:30 от Вечного огня. Ущелье Чункурчак. Небесный мост. Голубиный водопад. Зиплайн (за доп. плату). Возвращение в Бишкек в 19:00." },
      ],
      included: ["Комфортабельный транспорт (туда-обратно)", "Сопровождающий гид", "Билет на небесный мост"],
      notIncluded: ["Питание", "Билет на зиплайн"],
      seoTitle: "Небесный мост и зиплайн в Чункурчак | Kapriz Travel",
      seoDescription: "Небесный мост, водопад и зиплайн в ущелье Чункурчак. Однодневный тур. 1600 сом.",
    },
    {
      slug: "sup-sunken-forest",
      title: "SUP-борды по затонувшему лесу",
      description: "Катание на SUP-бордах по мистическому затонувшему лесу — 1,5 часа на воде с инструктором.",
      tourType: "adventure",
      duration: 1,
      basePrice: 1900,
      minGroupSize: 4,
      maxGroupSize: 20,
      itinerary: [
        { day: 1, title: "SUP по затонувшему лесу", description: "Выезд в 10:00 от Вечного огня. Затонувший лес. Инструктаж. Катание на SUP-бордах (1,5 часа). Зона пикника. Возвращение в Бишкек в 16:30." },
      ],
      included: ["Комфортабельный трансфер", "Катание на SUP-бордах (1,5 ч)", "Профессиональный инструктор", "Спасательные жилеты", "Зона для пикника"],
      notIncluded: ["Питание", "Мангал (1000 сом по желанию)", "Личные расходы"],
      seoTitle: "SUP-борды по затонувшему лесу | Kapriz Travel",
      seoDescription: "Катание на SUP-бордах по затонувшему лесу. 1,5 часа на воде с инструктором. 1900 сом.",
    },
    {
      slug: "sary-chelek-3-days",
      title: "Сары-Челек (3 дня)",
      description: "Трёхдневный тур в жемчужину Кыргызстана — заповедник Сары-Челек с 7 горными озёрами. Перевал Тоо-Ашуу, ущелье Чычкан, Токтогульское водохранилище.",
      tourType: "trekking",
      duration: 3,
      basePrice: 7000,
      minGroupSize: 4,
      maxGroupSize: 20,
      itinerary: [
        { day: 1, title: "Дорога в Сары-Челек", description: "Выезд в 6:30. Перевал Тоо-Ашуу — фотосессия. Суусамырская долина. Ущелье Чычкан. Токтогульское водохранилище. Приезд в заповедник. Размещение в гостевом доме. Ужин. Вечер у костра." },
        { day: 2, title: "Целый день в Сары-Челеке", description: "Подъём 7:30. Завтрак. Выезд на озёра. Экскурсия по заповеднику. Подъём до панорамы с видом на 7 озёр. Обед. Спуск в гостевой дом. Ужин." },
        { day: 3, title: "Возвращение в Бишкек", description: "Завтрак в 9:00. Остановка на Токтогульском водохранилище. Купание (по желанию). Приезд в Бишкек в 23:00." },
      ],
      included: ["Комфортабельный транспорт", "Услуги гида", "Проживание в гостевом доме", "3-разовое питание", "Входные билеты в парк", "Эко-сборы"],
      notIncluded: ["Дополнительное питание и личные расходы (1000–2000 сом)"],
      seoTitle: "Тур в Сары-Челек 3 дня | Kapriz Travel",
      seoDescription: "3 дня в заповеднике Сары-Челек: 7 горных озёр, перевал Тоо-Ашуу, вечер у костра. 7000 сом.",
    },
    {
      slug: "son-kul-2-days",
      title: "Сон-Кол (2 дня)",
      description: "Два дня на высокогорном озере Сон-Кол (3016м) — ночёвка в юртах, закат над степью, наблюдение за звёздами.",
      tourType: "relax",
      duration: 2,
      basePrice: 5500,
      minGroupSize: 4,
      maxGroupSize: 20,
      itinerary: [
        { day: 1, title: "Дорога на Сон-Кол", description: "Выезд в 6:30. Орто-Токойское водохранилище. Перевал Калмак-Ашуу. Прибытие на Сон-Кол. Размещение в юртах. Обед. Свободное время. Волшебный закат. Посиделки у костра." },
        { day: 2, title: "Возвращение через перевал", description: "Подъём. Завтрак. Выезд. Перевал «33 попугая». Знаменитый водопад. Ужин в каттаме. Возвращение в Бишкек в 21:00." },
      ],
      included: ["Проживание в юрте", "3-разовое питание", "Комфортабельный трансфер (18-местный бус)", "Услуги сопровождающего гида", "Вечер у костра"],
      notIncluded: ["Конная прогулка (по желанию)", "Питание в дороге", "Личные расходы"],
      seoTitle: "Тур на Сон-Кол 2 дня | Kapriz Travel",
      seoDescription: "2 дня на озере Сон-Кол: ночёвка в юртах, закат, звёзды, перевал 33 попугая. 5500 сом.",
    },
    {
      slug: "parachute-almaty",
      title: "Прыжок с парашюта в Алматы",
      description: "Самостоятельный прыжок с высоты 900 метров с автоматическим раскрытием парашюта. Аэродром Байсерке, Алматы.",
      tourType: "adventure",
      duration: 1,
      basePrice: 15000,
      minGroupSize: 2,
      maxGroupSize: 15,
      itinerary: [
        { day: 1, title: "Прыжок с парашюта — аэродром Байсерке", description: "Выезд из Бишкека в 3:30. Прибытие в Алматы. Инструктаж (3–5 часов). Прыжок с 900 метров. Возвращение в Бишкек в 23:00." },
      ],
      included: ["Прыжок с парашюта", "Трансфер Бишкек — Алматы — Бишкек", "Инструктаж (3–5 ч)", "Услуги гида", "Медицинская страховка"],
      notIncluded: ["Видеосъёмка (4000 тг, по желанию)", "Сертификат (2000 тг, по желанию)", "Питание"],
      seoTitle: "Прыжок с парашюта в Алматы из Бишкека | Kapriz Travel",
      seoDescription: "Прыжок с парашюта с 900м на аэродроме Байсерке в Алматы. Инструктаж, страховка включены. 15000 сом.",
    },
  ];

  const tours: Record<string, { id: string }> = {};
  for (const t of toursData) {
    const tour = await prisma.tour.upsert({
      where: { slug: t.slug },
      update: {
        title: t.title,
        description: t.description,
        tourType: t.tourType,
        duration: t.duration,
        basePrice: t.basePrice,
        minGroupSize: t.minGroupSize,
        maxGroupSize: t.maxGroupSize,
        itinerary: t.itinerary,
        included: t.included,
        notIncluded: t.notIncluded,
        seoTitle: t.seoTitle,
        seoDescription: t.seoDescription,
      },
      create: {
        slug: t.slug,
        title: t.title,
        description: t.description,
        tourType: t.tourType,
        duration: t.duration,
        basePrice: t.basePrice,
        minGroupSize: t.minGroupSize,
        maxGroupSize: t.maxGroupSize,
        itinerary: t.itinerary,
        included: t.included,
        notIncluded: t.notIncluded,
        seoTitle: t.seoTitle,
        seoDescription: t.seoDescription,
        isActive: true,
      },
    });
    tours[t.slug] = { id: tour.id };
  }
  console.log(`✅ Tours: ${toursData.length} created`);

  // ── Tour Schedules ─────────────────────────────────────────────────────────
  // Алматы 1 день — каждую субботу и воскресенье
  await prisma.tourSchedule.create({
    data: {
      tourId: tours["almaty-1-day"].id,
      type: "WEEKLY",
      daysOfWeek: [6, 0], // 6=Сб, 0=Вс
      note: "Еженедельные выезды по выходным",
      isActive: true,
    },
  });

  // Сары-Челек — каждую среду и пятницу
  await prisma.tourSchedule.create({
    data: {
      tourId: tours["sary-chelek-3-days"].id,
      type: "WEEKLY",
      daysOfWeek: [3, 5], // 3=Ср, 5=Пт
      note: "Регулярные выезды: среда и пятница",
      isActive: true,
    },
  });

  // Сон-Кол — каждую пятницу
  await prisma.tourSchedule.create({
    data: {
      tourId: tours["son-kul-2-days"].id,
      type: "WEEKLY",
      daysOfWeek: [5], // 5=Пт
      note: "Еженедельные пятничные выезды",
      isActive: true,
    },
  });
  console.log("✅ Tour schedules created");

  // ── Departures (пример реальных выездов, подтверждённых менеджером) ─────────
  const dep1 = await prisma.departure.create({
    data: {
      tourId: tours["almaty-1-day"].id,
      departureDate: addDays(4), // ближайшая суббота (примерно)
      status: "OPEN",
      note: "Выезд в 3:30 от Вечного огня",
    },
  });
  const dep2 = await prisma.departure.create({
    data: {
      tourId: tours["almaty-1-day"].id,
      departureDate: addDays(11),
      status: "OPEN",
    },
  });
  const dep3 = await prisma.departure.create({
    data: {
      tourId: tours["sary-chelek-3-days"].id,
      departureDate: addDays(3),
      status: "OPEN",
      note: "Выезд в 6:30 от Глобуса",
    },
  });
  const dep4 = await prisma.departure.create({
    data: {
      tourId: tours["sary-chelek-3-days"].id,
      departureDate: addDays(10),
      status: "OPEN",
    },
  });
  const dep5 = await prisma.departure.create({
    data: {
      tourId: tours["son-kul-2-days"].id,
      departureDate: addDays(7),
      status: "OPEN",
      note: "Выезд в 6:30 от Вечного огня",
    },
  });
  const dep6 = await prisma.departure.create({
    data: {
      tourId: tours["uzbekistan-4-days"].id,
      departureDate: addDays(14),
      status: "OPEN",
    },
  });
  console.log("✅ Departures created");

  // ── Groups (автобусы для dep3 — пример распределения) ──────────────────────
  // Для выезда Сары-Челек dep3 уже создали 2 группы (пример работы после набора)
  const group1 = await prisma.group.create({
    data: {
      departureId: dep3.id,
      name: "Автобус 1",
      guideId: guide1.id,
      driverId: driver1.id,
      maxSeats: 15,
    },
  });
  const group2 = await prisma.group.create({
    data: {
      departureId: dep3.id,
      name: "Автобус 2",
      guideId: guide2.id,
      driverId: driver2.id,
      maxSeats: 15,
    },
  });
  console.log("✅ Groups created");

  // ── Clients ───────────────────────────────────────────────────────────────
  const client1 = await prisma.client.upsert({
    where: { whatsapp: "+79161234567" },
    update: {},
    create: { name: "Иван Петров", whatsapp: "+79161234567", country: "Россия", city: "Москва", source: "instagram", tag: "vip" },
  });
  const client2 = await prisma.client.upsert({
    where: { whatsapp: "+77771234567" },
    update: {},
    create: { name: "Алия Сейткали", whatsapp: "+77771234567", country: "Казахстан", city: "Алматы", source: "google" },
  });
  const client3 = await prisma.client.upsert({
    where: { whatsapp: "+996701234567" },
    update: {},
    create: { name: "Мирлан Бекташев", whatsapp: "+996701234567", country: "Кыргызстан", city: "Бишкек", source: "referral" },
  });
  const client4 = await prisma.client.upsert({
    where: { whatsapp: "+996702345678" },
    update: {},
    create: { name: "Айжан Кулова", whatsapp: "+996702345678", country: "Кыргызстан", city: "Бишкек", source: "instagram" },
  });
  const client5 = await prisma.client.upsert({
    where: { whatsapp: "+996703456789" },
    update: {},
    create: { name: "Тимур Асанов", whatsapp: "+996703456789", country: "Кыргызстан", city: "Ош", source: "referral" },
  });
  console.log("✅ Clients created");

  // ── Applications ──────────────────────────────────────────────────────────
  // Заявки на dep1 (Алматы, ближайший выезд) — нераспределённые
  await prisma.application.create({
    data: {
      clientId: client1.id,
      tourId: tours["almaty-1-day"].id,
      departureId: dep1.id,
      persons: 2,
      status: "DEPOSIT",
      managerId: manager.id,
      utmSource: "instagram",
      utmMedium: "social",
      booking: { create: { basePrice: 5000, finalPrice: 5000, depositPaid: 3000, paymentStatus: "PARTIAL" } },
    },
  });
  await prisma.application.create({
    data: {
      clientId: client2.id,
      tourId: tours["almaty-1-day"].id,
      departureId: dep1.id,
      persons: 1,
      status: "CONTACT",
      managerId: manager.id,
      utmSource: "google",
    },
  });

  // Заявки на dep3 (Сары-Челек) — часть распределена по группам
  await prisma.application.create({
    data: {
      clientId: client3.id,
      tourId: tours["sary-chelek-3-days"].id,
      departureId: dep3.id,
      groupId: group1.id, // уже распределён в автобус 1
      persons: 2,
      status: "DEPOSIT",
      managerId: senior.id,
      utmSource: "referral",
      booking: { create: { basePrice: 14000, finalPrice: 14000, depositPaid: 7000, paymentStatus: "PARTIAL" } },
    },
  });
  await prisma.application.create({
    data: {
      clientId: client4.id,
      tourId: tours["sary-chelek-3-days"].id,
      departureId: dep3.id,
      groupId: group1.id, // уже распределён в автобус 1
      persons: 1,
      status: "DEPOSIT",
      managerId: senior.id,
      utmSource: "instagram",
      booking: { create: { basePrice: 7000, finalPrice: 6500, priceChangeReason: "скидка постоянному клиенту", depositPaid: 3500, paymentStatus: "PARTIAL" } },
    },
  });
  await prisma.application.create({
    data: {
      clientId: client5.id,
      tourId: tours["sary-chelek-3-days"].id,
      departureId: dep3.id,
      // groupId: null — ещё не распределён
      persons: 3,
      status: "NEW",
      utmSource: "instagram",
    },
  });

  // Заявка на dep5 (Сон-Кол)
  await prisma.application.create({
    data: {
      clientId: client1.id,
      tourId: tours["son-kul-2-days"].id,
      departureId: dep5.id,
      persons: 2,
      status: "CONTACT",
      managerId: manager.id,
      utmSource: "instagram",
    },
  });

  // Расходы на группу 1 (Сары-Челек Автобус 1)
  await prisma.expense.createMany({
    data: [
      { groupId: group1.id, category: "GUIDE", amount: 3000, currency: "KGS", note: "Оплата гида Асылбека" },
      { groupId: group1.id, category: "DRIVER", amount: 5000, currency: "KGS", note: "Оплата водителя" },
      { groupId: group1.id, category: "TRANSPORT", amount: 8000, currency: "KGS", note: "Аренда автобуса" },
    ],
  });

  console.log("✅ Applications and expenses created");

  console.log("\n🎉 Seed complete!");
  console.log("\n📋 Test accounts (password: password123):");
  console.log("  admin@tourcrm.kg      — Администратор");
  console.log("  senior@tourcrm.kg     — Старший менеджер");
  console.log("  manager@tourcrm.kg    — Менеджер");
  console.log("  finance@tourcrm.kg    — Финансист");
  console.log(`\n🗺️  Tours: ${toursData.length}`);
  console.log(`📅 Departures: 6 (dep1-dep6)`);
  console.log(`🚌 Groups: 2 (для Сары-Челек dep3)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
