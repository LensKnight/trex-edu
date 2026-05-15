"use client";

import { useTheme } from "../src/context/ThemeContext";

export default function ThemedBody({ children }: { children: React.ReactNode }) {
  const { darkMode } = useTheme();

  return (
    <div className={`transition-all duration-500 min-h-screen ${darkMode ? "bg-black text-white" : "bg-gray-50 text-black"}`}>
      {children}
    </div>
  );
}