"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../src/lib/supabase";
import useAuth from "../../../src/hooks/useAuth";
import { useTheme } from "../../../src/context/ThemeContext";

type Note = {
  id: string;
  title: string;
  subject: string;
  file_url: string;
  likes: number;
};

type LeaderboardEntry = {
  full_name: string;
  xp: number;
};

export default function MobileDashboardPage() {
  const { session, loading } = useAuth();
  const { darkMode, setDarkMode } = useTheme();

  const [notesCount, setNotesCount] = useState(0);
  const [xp, setXp] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [fullName, setFullName] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const subjects = [
    "Physics",
    "Chemistry",
    "Mathematics",
    "Computer Science",
    "English",
    "Physical Education",
  ];

  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";

  const textColor = darkMode ? "#ffffff" : "#1a0000";

  const subTextColor = darkMode
    ? "#a1a1aa"
    : "#8b0000";

  const cardBg = darkMode
    ? "linear-gradient(135deg, #6b1a1a, #2d0a0a)"
    : "linear-gradient(135deg, #ffcccc, #ffb3b3)";

  const cardBg2 = darkMode
    ? "rgba(255,255,255,0.04)"
    : "rgba(0,0,0,0.10)";

  const noteBg = darkMode
    ? "rgba(255,255,255,0.03)"
    : "rgba(0,0,0,0.08)";

  const border = darkMode
    ? "1px solid #3f0000"
    : "1px solid #ffb3b3";

  useEffect(() => {
    if (!loading && session) {
      fetchStats();
      fetchLeaderboard();
    }
  }, [loading, session]);

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("mobile-dashboard-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notes",
        },
        async () => {
          await fetchStats();
          await fetchLeaderboard();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notes",
        },
        async () => {
          await fetchStats();
          await fetchLeaderboard();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notes",
        },
        async () => {
          await fetchStats();
          await fetchLeaderboard();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        async () => {
          await fetchStats();
          await fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  async function fetchStats() {
    const { data: notesData } = await supabase
      .from("notes")
      .select("*")
      .eq("uploader_id", session!.user.id);

    if (notesData) {
      setNotes(notesData);
      setNotesCount(notesData.length);

      setTotalLikes(
        notesData.reduce(
          (sum, n) => sum + (n.likes || 0),
          0
        )
      );
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("xp, full_name")
      .eq("id", session!.user.id)
      .single();

    setXp(profileData?.xp || 0);

    setFullName(
      (profileData?.full_name || "").split(" ")[0]
    );
  }

  async function fetchLeaderboard() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("section, class_name")
      .eq("id", user.id)
      .single();

    if (!profile) return;

    const { data } = await supabase
      .from("profiles")
      .select("full_name, xp")
      .eq("class_name", profile.class_name)
      .eq("section", profile.section)
      .order("xp", { ascending: false })
      .limit(5);

    if (data) setLeaderboard(data);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    try {
      let fileName = "";

      if (
        deleteTarget.file_url?.includes("/materials/")
      ) {
        fileName =
          deleteTarget.file_url.split(
            "/materials/"
          )[1];
      }

      if (fileName) {
        await supabase.storage
          .from("materials")
          .remove([fileName]);
      }

      const { error: dbError } = await supabase
        .from("notes")
        .delete()
        .eq("id", deleteTarget.id);

      if (dbError) {
        return alert(
          "Delete failed: " + dbError.message
        );
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("xp")
        .eq("id", session!.user.id)
        .single();

      const newXp = Math.max(
        (profileData?.xp || 0) - 20,
        0
      );

      await supabase
        .from("profiles")
        .update({ xp: newXp })
        .eq("id", session!.user.id);

      setNotes((prev) =>
        prev.filter(
          (n) => n.id !== deleteTarget.id
        )
      );

      setNotesCount((prev) => prev - 1);

      setTotalLikes(
        (prev) => prev - (deleteTarget.likes || 0)
      );

      setXp(newXp);

      setDeleteTarget(null);
    } catch (err) {
      alert(
        "Something went wrong while deleting"
      );
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

        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-4">
          <div>
            <p
              className="text-xs font-medium tracking-widest uppercase mb-1"
              style={{
                color: subTextColor,
              }}
            >
              Dashboard
            </p>

            <h1 className="text-2xl font-bold">
              Hi,{" "}
              <span className="glow-text">
                {fullName}
              </span>{" "}
              👋
            </h1>

            <div
              className="mt-1 h-0.5 w-12 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, #8b0000, transparent)",
              }}
            />
          </div>

          <div className="flex items-center gap-2">

            {/* Announcement Button */}
            <a
              href="/mobile/announcements"
              className="px-3 py-2 rounded-2xl text-xs font-bold transition-all duration-300 active:scale-95"
              style={{
                background: darkMode
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.08)",
                color: textColor,
                border,
                backdropFilter: "blur(12px)",
              }}
            >
              📢
            </a>

            {/* Theme Button */}
            <button
              onClick={() =>
                setDarkMode(!darkMode)
              }
              className="p-2 rounded-xl text-sm"
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
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            {
              label: "Notes",
              value: notesCount,
              icon: "📄",
            },
            {
              label: "XP",
              value: xp,
              icon: "⚡",
            },
            {
              label: "Likes",
              value: totalLikes,
              icon: "❤️",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="shine-effect p-3 rounded-2xl text-center"
              style={{
                background: cardBg,
              }}
            >
              <p className="text-lg">
                {stat.icon}
              </p>

              <p className="text-xl font-bold">
                {stat.value}
              </p>

              <p
                className="text-xs"
                style={{
                  color: subTextColor,
                }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Leaderboard */}
        <div
          className="shine-effect p-4 rounded-2xl mb-6"
          style={{
            background: cardBg,
          }}
        >
          <h2 className="text-lg font-bold mb-1">
            🏆 Leaderboard
          </h2>

          <p
            className="text-xs mb-3"
            style={{
              color: subTextColor,
            }}
          >
            ⓘ Points verified & updated regularly
          </p>

          <div className="space-y-2">
            {leaderboard.map(
              (user, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-xl"
                  style={{
                    background: noteBg,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-bold"
                      style={{
                        color:
                          index === 0
                            ? "#FFD700"
                            : index === 1
                            ? "#C0C0C0"
                            : index === 2
                            ? "#CD7F32"
                            : "#888",
                      }}
                    >
                      #{index + 1}
                    </span>

                    <span className="text-sm font-medium truncate max-w-30">
                      {user.full_name}
                    </span>
                  </div>

                  <span
                    className="text-xs font-bold"
                    style={{
                      color: "#ff6666",
                    }}
                  >
                    {user.xp} XP
                  </span>
                </div>
              )
            )}
          </div>
        </div>

        {/* My Notes */}
        <h2 className="text-xl font-bold mb-3">
          My Notes
        </h2>

        <div className="space-y-2">
          {subjects.map((subject) => {
            const subjectNotes =
              notes.filter(
                (n) =>
                  n.subject === subject
              );

            if (
              subjectNotes.length === 0
            )
              return null;

            const isOpen =
              openSubject === subject;

            return (
              <div
                key={subject}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: cardBg2,
                  border,
                }}
              >
                <button
                  onClick={() =>
                    setOpenSubject(
                      isOpen
                        ? null
                        : subject
                    )
                  }
                  className="w-full flex items-center justify-between p-3 transition hover:opacity-80"
                >
                  <span className="text-sm font-bold">
                    {subject}
                  </span>

                  <span
                    className="text-xs"
                    style={{
                      color:
                        subTextColor,
                    }}
                  >
                    {
                      subjectNotes.length
                    }{" "}
                    {isOpen
                      ? "▲"
                      : "▼"}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 space-y-2">
                    {subjectNotes.map(
                      (note) => (
                        <div
                          key={note.id}
                          className="p-3 rounded-xl flex items-center justify-between gap-2"
                          style={{
                            background:
                              noteBg,
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs truncate">
                              {
                                note.title
                              }
                            </p>

                            <p
                              className="text-xs mt-0.5"
                              style={{
                                color:
                                  subTextColor,
                              }}
                            >
                              ❤️{" "}
                              {note.likes ||
                                0}
                            </p>
                          </div>

                          <div className="flex gap-1 shrink-0">
                            <a
                              href={
                                note.file_url
                              }
                              target="_blank"
                              className="px-2 py-1 rounded-lg text-xs"
                              style={{
                                background:
                                  darkMode
                                    ? "#1e3a5f"
                                    : "#dbeafe",
                                color:
                                  darkMode
                                    ? "#fff"
                                    : "#1e3a5f",
                              }}
                            >
                              Open
                            </a>

                            <button
                              onClick={() =>
                                setDeleteTarget(
                                  note
                                )
                              }
                              className="bg-red-600 px-2 py-1 rounded-lg text-xs text-white"
                            >
                              Del
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Nav */}
      <div
        className="fixed bottom-4 left-4 right-4 flex items-center justify-around p-3 z-40 rounded-3xl glass"
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
            className="text-xs"
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
            className="text-xs"
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
            className="text-xs"
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
            className="text-xs"
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
            className="text-xs"
            style={{
              color: subTextColor,
            }}
          >
            Profile
          </span>
        </a>
      </div>

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div
            className="p-6 rounded-3xl w-full max-w-xs text-center"
            style={{
              background: darkMode
                ? "#1a0000"
                : "#fff5f5",
              color: textColor,
            }}
          >
            <p className="text-4xl mb-3">
              🗑️
            </p>

            <h2 className="text-lg font-bold mb-2">
              Delete Note?
            </h2>

            <p
              className="mb-1 text-xs"
              style={{
                color: subTextColor,
              }}
            >
              This will be deleted
              permanently
            </p>

            <p
              className="text-xs mb-2"
              style={{
                color: subTextColor,
              }}
            >
              20XP will be deducted
            </p>

            <p className="font-bold mb-4 text-xs">
              "
              {deleteTarget.title}
              "
            </p>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  setDeleteTarget(null)
                }
                className="flex-1 p-2 rounded-xl font-bold text-sm"
                style={{
                  background:
                    darkMode
                      ? "#3f3f3f"
                      : "#e5e5e5",
                  color: textColor,
                }}
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 p-2 rounded-xl font-bold text-white text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}