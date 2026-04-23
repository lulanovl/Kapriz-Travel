"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface Props {
  color?: string;
}

export default function NavigationProgress({ color = "#CCFF00" }: Props) {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const prevPath = useRef(pathname);

  function clear() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  // Navigation completed — finish the bar
  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;
    clear();
    setProgress(100);
    const t = setTimeout(() => { setVisible(false); setProgress(0); }, 300);
    timers.current.push(t);
  }, [pathname]);

  // Navigation started — intercept anchor clicks
  useEffect(() => {
    function onAnchorClick(e: MouseEvent) {
      const a = (e.target as Element).closest("a");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (href === window.location.pathname) return;

      clear();
      setVisible(true);
      setProgress(25);
      timers.current.push(
        setTimeout(() => setProgress(55), 200),
        setTimeout(() => setProgress(78), 600),
      );
    }

    document.addEventListener("click", onAnchorClick);
    return () => document.removeEventListener("click", onAnchorClick);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none">
      <div
        className="h-full transition-all duration-300 ease-out"
        style={{ width: `${progress}%`, backgroundColor: color }}
      />
    </div>
  );
}
