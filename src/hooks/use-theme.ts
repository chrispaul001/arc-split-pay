import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "coindecc-theme";

/**
 * Light is the default. The inline script in the root head applies the saved
 * mode before first paint, so the class effect below must not run on mount.
 */
export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const first = useRef(true);
  const manual = useRef(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    setTheme(stored === "light" || stored === "dark" ? stored : mq.matches ? "dark" : "light");

    const onChange = (e: MediaQueryListEvent) => {
      if (window.localStorage.getItem(KEY)) return;
      setTheme(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (manual.current) window.localStorage.setItem(KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    manual.current = true;
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}
