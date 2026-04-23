"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

function useCountUp(target: number, active: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    let start = 0;
    const duration = 1800;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, active]);

  return count;
}

function Counter({
  value,
  suffix,
  label,
}: {
  value: number;
  suffix: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const count = useCountUp(value, active);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setActive(true);
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="text-center">
      <div className="font-heading font-black text-4xl sm:text-5xl text-brand-lime">
        {count.toLocaleString("ru")}
        {suffix}
      </div>
      <div className="font-heading font-600 text-white/60 text-sm uppercase tracking-wider mt-2">
        {label}
      </div>
    </div>
  );
}

export default function TrustCounters() {
  const t = useTranslations("trustCounters");

  const counters = [
    { value: 2500, suffix: "+", label: t("tourists") },
    { value: 6, suffix: "", label: t("years") },
    { value: 13, suffix: "+", label: t("routes") },
    { value: 5, suffix: "", label: t("countries") },
  ];

  return (
    <section className="bg-brand-blue-dark py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {counters.map((c) => (
            <Counter key={c.label} {...c} />
          ))}
        </div>
      </div>
    </section>
  );
}
