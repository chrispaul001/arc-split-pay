import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "coindecc-theme";

/** Light is the default. Follows the OS preference until the user picks a mode. */
export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const ready = useRef(false);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    if (stored === "light" || stored === "dark") {
      setManual(true);
      setTheme(stored);
    } else {
      setTheme(mq.matches ? "dark" : "light");
    }
    ready.current = true;

    const onChange = (e: MediaQueryListEvent) => {
      if (window.localStorage.getItem(KEY)) return;
      setTheme(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    // Enable smooth color transitions only after initial paint to avoid a load flash.
    const id = window.setTimeout(() => document.documentElement.classList.add("theme-anim"), 100);
    return () => {
      window.clearTimeout(id);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (ready.current && manual) window.localStorage.setItem(KEY, theme);
  }, [theme, manual]);

  const toggle = useCallback(() => {
    setManual(true);
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}
