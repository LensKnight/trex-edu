"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../../../src/lib/supabase";
import { useTheme } from "../../../src/context/ThemeContext";
import useAuth from "../../../src/hooks/useAuth";
import MobileNavbar from "@/components/MobileNavbar";
import {
  LayoutDashboard,
  BookOpen,
  Megaphone,
  User,
  Sparkles,
} from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/mobile/dashboard" },
  { label: "Notes Feed", icon: BookOpen, href: "/mobile/feed" },
  { label: "Announcements", icon: Megaphone, href: "/mobile/announcements" },
  { label: "Profile", icon: User, href: "/mobile/profile" },
];

function isRecent(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  return diffMs < 1000 * 60 * 60 * 24; // under 24h
}

export default function MobileAnnouncementsPage() {
  const pathname = usePathname();
  const { loading } = useAuth();
  const { darkMode } = useTheme();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";

  const textColor = darkMode ? "#ffffff" : "#1a0000";
  const subTextColor = darkMode ? "#a1a1aa" : "#8b0000";

  const cardBg = darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)";

  const border = darkMode ? "1px solid #3f0000" : "1px solid #ffb3b3";

  // Same color-only border that the chat page passes to MobileNavbar
  const navBorder = darkMode
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.08)";

  const sidebarBg = darkMode
    ? "rgba(15, 0, 0, 0.9)"
    : "rgba(255, 255, 255, 0.9)";

  useEffect(() => {
    if (!loading) {
      fetchAnnouncements();
    }
  }, [loading]);

  useEffect(() => {
    const channel = supabase
      .channel("mobile-announcements")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
        },
        () => {
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchAnnouncements() {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setAnnouncements(data);
    }
  }

  return (
    <div
      className="min-h-screen flex transition-all duration-500"
      style={{ background: bg, color: textColor }}
    >
      {/* Desktop sidebar */}
      <aside
        className="w-64 hidden md:flex flex-col justify-between p-4 sticky top-0 h-screen border-r backdrop-blur-xl shrink-0"
        style={{ background: sidebarBg, borderColor: "#3f0000" }}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-3 py-2">
            <span className="font-extrabold text-lg tracking-tight">TreX Edu</span>
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: isActive ? "rgba(139, 0, 0, 0.25)" : "transparent",
                    color: isActive ? "#ff6666" : subTextColor,
                    border: isActive
                      ? "1px solid rgba(139, 0, 0, 0.4)"
                      : "1px solid transparent",
                  }}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0">
        {loading && (
          <div className="loading-screen">
            <img src="/toggle-icon.png" className="loading-x" alt="loading" />
            <div className="loading-text">Loading Announcements</div>
          </div>
        )}

        {/* Mobile top bar */}
        <div
          className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b backdrop-blur-xl"
          style={{ background: sidebarBg, borderColor: "#3f0000" }}
        >
          <div className="flex items-center gap-2.5">
            <span className="font-extrabold text-base tracking-tight">TreX Edu</span>
          </div>
        </div>

        <div className="p-4 pb-28 md:pb-10 max-w-2xl mx-auto">
          {/* HEADER */}
          <div className="flex items-start justify-between mb-6 pt-4">
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 mb-2">
                <Sparkles size={10} /> School Updates
              </span>

              <h1 className="text-2xl md:text-3xl font-bold">Announcements</h1>

              <div
                className="mt-2 h-0.5 w-12 rounded-full"
                style={{
                  background: "linear-gradient(90deg, #8b0000, transparent)",
                }}
              />
            </div>
          </div>

          {/* ANNOUNCEMENTS */}
          <div className="relative space-y-3">
            {/* Timeline rail */}
            {announcements.length > 0 && (
              <div
                className="absolute left-[19px] top-2 bottom-2 w-px"
                style={{
                  background: darkMode
                    ? "linear-gradient(to bottom, rgba(139,0,0,0.5), transparent)"
                    : "linear-gradient(to bottom, rgba(139,0,0,0.25), transparent)",
                }}
              />
            )}

            {announcements.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center pt-24">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: darkMode
                      ? "linear-gradient(135deg, #6b0000, #3d0000)"
                      : "linear-gradient(135deg, #ffb3b3, #ff8080)",
                  }}
                >
                  <Megaphone size={26} className="text-white" />
                </div>

                <p className="text-lg font-bold" style={{ color: subTextColor }}>
                  No announcements yet
                </p>
              </div>
            )}

            {announcements.map((item) => {
              const recent = isRecent(item.created_at);
              return (
                <div key={item.id} className="relative pl-11 group">
                  {/* Timeline node */}
                  <div
                    className="absolute left-0 top-5 w-[15px] h-[15px] rounded-full border-2 z-10"
                    style={{
                      background: recent ? "#ef4444" : cardBg,
                      borderColor: recent ? "#ff8080" : "#8b0000",
                      boxShadow: recent ? "0 0 10px rgba(239,68,68,0.6)" : "none",
                    }}
                  />

                  <div
                    className="p-4 rounded-3xl transition-all duration-300 active:scale-[0.98] group-hover:scale-[1.01] relative overflow-hidden"
                    style={{
                      background: cardBg,
                      border,
                      backdropFilter: "blur(14px)",
                      WebkitBackdropFilter: "blur(14px)",
                      boxShadow: darkMode
                        ? "0 8px 24px -12px rgba(0,0,0,0.5)"
                        : "0 8px 24px -12px rgba(139,0,0,0.15)",
                    }}
                  >
                    {/* TOP */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0"
                          style={{
                            background: darkMode
                              ? "linear-gradient(135deg, #6b0000, #3d0000)"
                              : "linear-gradient(135deg, #ffb3b3, #ff8080)",
                          }}
                        >
                          <Megaphone size={18} className="text-white" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold leading-tight truncate">
                              {item.title}
                            </h2>
                            {recent && (
                              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                                NEW
                              </span>
                            )}
                          </div>

                          <p className="text-[10px] mt-1" style={{ color: subTextColor }}>
                            Admin Announcement
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* MESSAGE */}
                    <p
                      className="text-sm leading-relaxed mb-4"
                      style={{ color: darkMode ? "#d4d4d4" : "#3d0000" }}
                    >
                      {item.message}
                    </p>

                    {/* DATE */}
                    <div
                      className="text-[10px] pt-3 border-t"
                      style={{
                        color: subTextColor,
                        borderColor: darkMode
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.08)",
                      }}
                    >
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Nav (same component as the chat page) */}
      <MobileNavbar
        darkMode={darkMode}
        subTextColor={subTextColor}
        border={navBorder}
      />
    </div>
  );
}