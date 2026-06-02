"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import { useTheme } from "../../src/context/ThemeContext";
import useAuth from "../../src/hooks/useAuth";

type Announcement = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

export default function AnnouncementsPage() {
  const { loading } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";
  const textColor = darkMode ? "#ffffff" : "#1a0000";
  const subTextColor = darkMode ? "#a1a1aa" : "#8b0000";
  const cardBg = darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";
  const border = darkMode ? "1px solid #3f0000" : "1px solid #ffb3b3";

  useEffect(() => {
    if (!loading) fetchAnnouncements();
  }, [loading]);

  async function fetchAnnouncements() {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setAnnouncements(data);
  }

  if (loading) return (
    <div className="loading-screen">
      <img src="/toggle-icon.png" className="loading-x" alt="loading" />
      <div className="loading-text">Loading</div>
    </div>
  );

  return (
    <div className="min-h-screen p-6 transition-all duration-500" style={{background: bg, color: textColor}}>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs md:text-sm font-medium tracking-widest uppercase mb-1" style={{color: subTextColor}}>School Updates</p>
          <h1 className="text-3xl md:text-5xl font-bold">Announcements</h1>
          <div className="mt-2 h-0.5 w-16 md:w-24 rounded-full" style={{background: "linear-gradient(90deg, #8b0000, transparent)"}} />
        </div>
      </div>

      {/* Announcements */}
      <div className="space-y-6 max-w-2xl">
        {announcements.length === 0 && (
          <div className="text-center mt-20">
            <p className="text-4xl mb-4">📭</p>
            <p className="text-lg font-bold" style={{color: subTextColor}}>No announcements yet</p>
          </div>
        )}
        {announcements.map((item) => (
          <div key={item.id} className="p-5 rounded-2xl transition-all duration-300 hover:scale-103" style={{background: cardBg, border}}>
            <h2 className="text-xl font-bold mb-2">{item.title}</h2>
            <p className="mb-4 text-sm" style={{color: darkMode ? "#d4d4d4" : "#3d0000"}}>{item.message}</p>
            <p className="text-xs" style={{color: subTextColor}}>
              {new Date(item.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}