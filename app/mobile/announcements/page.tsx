"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../src/lib/supabase";
import { useTheme } from "../../../src/context/ThemeContext";
import useAuth from "../../../src/hooks/useAuth";

type Announcement = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

export default function MobileAnnouncementsPage() {
  const { loading } = useAuth();
  const { darkMode, setDarkMode } = useTheme();

  const [announcements, setAnnouncements] = useState<
    Announcement[]
  >([]);

  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";

  const textColor = darkMode
    ? "#ffffff"
    : "#1a0000";

  const subTextColor = darkMode
    ? "#a1a1aa"
    : "#8b0000";

  const cardBg = darkMode
    ? "rgba(255,255,255,0.04)"
    : "rgba(0,0,0,0.06)";

  const border = darkMode
    ? "1px solid #3f0000"
    : "1px solid #ffb3b3";

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
      .order("created_at", {
        ascending: false,
      });

    if (data) {
      setAnnouncements(data);
    }
  }

  if (loading)
    return (
      <div className="loading-screen">
        <img
          src="/toggle-icon.png"
          className="loading-x"
          alt="loading"
        />
        <div className="loading-text">
          Loading
        </div>
      </div>
    );

  return (
    <div
      className="min-h-screen transition-all duration-500"
      style={{
        background: bg,
        color: textColor,
      }}
    >
      <div className="p-4 pb-28">

        {/* HEADER */}
        <div className="flex items-start justify-between mb-6 pt-4">
          <div>
            <p
              className="text-[10px] font-medium tracking-[0.25em] uppercase mb-1"
              style={{
                color: subTextColor,
              }}
            >
              School Updates
            </p>

            <h1 className="text-2xl font-bold">
              📢 Announcements
            </h1>

            <div
              className="mt-2 h-0.5 w-12 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, #8b0000, transparent)",
              }}
            />
          </div>

          <button
            onClick={() =>
              setDarkMode(!darkMode)
            }
            className="p-2 rounded-xl text-sm transition-all duration-300"
            style={{
              background: darkMode
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.1)",
              color: textColor,
            }}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>

        {/* ANNOUNCEMENTS */}
        <div className="space-y-3">

          {announcements.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center pt-24">
              <p className="text-5xl mb-4">
                📭
              </p>

              <p
                className="text-lg font-bold"
                style={{
                  color: subTextColor,
                }}
              >
                No announcements yet
              </p>
            </div>
          )}

          {announcements.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-3xl transition-all duration-300 active:scale-[0.98]"
              style={{
                background: cardBg,
                border,
                backdropFilter:
                  "blur(14px)",
                WebkitBackdropFilter:
                  "blur(14px)",
              }}
            >
              {/* TOP */}
              <div className="flex items-start justify-between gap-3 mb-3">

                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0"
                    style={{
                      background:
                        darkMode
                          ? "linear-gradient(135deg, #6b0000, #3d0000)"
                          : "linear-gradient(135deg, #ffb3b3, #ff8080)",
                    }}
                  >
                    📢
                  </div>

                  <div>
                    <h2 className="text-sm font-bold leading-tight">
                      {item.title}
                    </h2>

                    <p
                      className="text-[10px] mt-1"
                      style={{
                        color:
                          subTextColor,
                      }}
                    >
                      Admin Announcement
                    </p>
                  </div>
                </div>

              </div>

              {/* MESSAGE */}
              <p
                className="text-sm leading-relaxed mb-4"
                style={{
                  color: darkMode
                    ? "#d4d4d4"
                    : "#3d0000",
                }}
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
                {new Date(
                  item.created_at
                ).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div
        className="fixed bottom-4 left-4 right-4 flex items-center justify-around p-3 z-50 rounded-3xl glass"
        style={{
          background: darkMode
            ? "rgba(13,0,0,0.75)"
            : "rgba(255,245,245,0.7)",
          border,
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter:
            "blur(18px)",
        }}
      >
        <a
          href="/mobile/dashboard"
          className="flex flex-col items-center gap-1"
        >
          <span className="text-xl">
            🏠
          </span>

          <span
            className="text-[10px]"
            style={{
              color: subTextColor,
            }}
          >
            Home
          </span>
        </a>

        <a
          href="/mobile/feed"
          className="flex flex-col items-center gap-1"
        >
          <span className="text-xl">
            📚
          </span>

          <span
            className="text-[10px]"
            style={{
              color: subTextColor,
            }}
          >
            Notes
          </span>
        </a>

        <a
          href="/mobile/upload"
          className="flex flex-col items-center gap-1"
        >
          <span className="text-xl">
            ➕
          </span>

          <span
            className="text-[10px]"
            style={{
              color: subTextColor,
            }}
          >
            Upload
          </span>
        </a>

        <a
          href="/mobile/chat"
          className="flex flex-col items-center gap-1"
        >
          <span className="text-xl">
            💬
          </span>

          <span
            className="text-[10px]"
            style={{
              color: subTextColor,
            }}
          >
            Chat
          </span>
        </a>

        <a
          href="/mobile/profile"
          className="flex flex-col items-center gap-1"
        >
          <span className="text-xl">
            👤
          </span>

          <span
            className="text-[10px]"
            style={{
              color: subTextColor,
            }}
          >
            Profile
          </span>
        </a>
      </div>
    </div>
  );
}