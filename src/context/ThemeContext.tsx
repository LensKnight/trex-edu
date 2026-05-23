"use client";

import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext<any>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkModeState] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved !== null) {
      setDarkModeState(saved === "dark");
    }
  }, []);

  function setDarkMode(value: boolean) {
    setDarkModeState(value);
    localStorage.setItem("theme", value ? "dark" : "light");
  }

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}