"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
const THEME_KEY = "syntax-stories-theme";
export type Theme = "light" | "dark" | "system";
type ThemeState = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
};
function getSystemPrefersDark(): boolean {
  if (globalThis.window === undefined) return false;
  return globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
}
export function getEffectiveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return getSystemPrefersDark() ? "dark" : "light";
  }
  return theme;
}
export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const effective = getEffectiveTheme(theme);
  document.documentElement.classList.toggle("dark", effective === "dark");
  document.documentElement.style.colorScheme = effective;
}
let systemListenerAttached = false;
export function attachSystemThemeListener() {
  if (systemListenerAttached || globalThis.window === undefined) return;
  systemListenerAttached = true;
  const mq = globalThis.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (useThemeStore.getState().theme === "system") {
      applyTheme("system");
    }
  };
  mq.addEventListener("change", onChange);
  if (globalThis.window.syntaxStoriesDesktop?.onSystemThemeChange) {
    globalThis.window.syntaxStoriesDesktop.onSystemThemeChange(() => {
      if (useThemeStore.getState().theme === "system") {
        applyTheme("system");
      }
    });
  }
}
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "system",
      setTheme: (t) => {
        set({ theme: t });
        applyTheme(t);
      },
      toggleTheme: () => {
        const current = get().theme;
        const effective = getEffectiveTheme(current);
        const next: Theme = effective === "dark" ? "light" : "dark";
        set({ theme: next });
        applyTheme(next);
      },
    }),
    {
      name: THEME_KEY,
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme);
      },
    },
  ),
);
