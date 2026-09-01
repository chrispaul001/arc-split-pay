import { useEffect, useState } from "react";
import logoLight from "@/assets/coindecc-logo-light.png.asset.json";
import logoDark from "@/assets/coindecc-logo-dark.png.asset.json";

const KEY = "coindecc-splash-seen";

/** 3s intro: logo on the left, wordmark on the right, then fades out. */
export function Splash() {
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(KEY)) return;
    setDone(false);
    setMounted(true);
    const out = window.setTimeout(() => setLeaving(true), 2600);
    const end = window.setTimeout(() => {
      window.sessionStorage.setItem(KEY, "1");
      setDone(true);
    }, 3000);
    return () => {
      window.clearTimeout(out);
      window.clearTimeout(end);
    };
  }, []);

  if (done) return null;

  return (
    <div
      aria-hidden="true"
      className={`app-gradient fixed inset-0 z-[100] grid place-items-center overflow-hidden px-6 transition-all duration-400 ease-out ${
        leaving ? "pointer-events-none scale-[1.03] opacity-0" : "opacity-100"
      }`}
    >
      <div
        className={`flex max-w-full items-center gap-4 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          mounted ? "translate-y-0 scale-100 opacity-100 blur-0" : "translate-y-3 scale-95 opacity-0 blur-sm"
        }`}
      >
        <img
          src={logoDark.url}
          alt=""
          className="animate-float h-14 w-auto shrink-0 object-contain sm:h-16 dark:hidden"
        />
        <img
          src={logoLight.url}
          alt=""
          className="animate-float hidden h-14 w-auto shrink-0 object-contain sm:h-16 dark:block"
        />
        <span className="min-w-0">
          <span className="text-gradient block truncate font-display text-3xl font-bold sm:text-4xl">
            Coindecc
          </span>
          <span className="block truncate text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
            Pay on Arc
          </span>
        </span>
      </div>

      <div className="absolute bottom-16 h-0.5 w-40 overflow-hidden rounded-full bg-secondary/60">
        <div className="h-full w-full origin-left animate-[splash-bar_3s_linear_forwards] rounded-full bg-primary" />
      </div>
    </div>
  );
}
