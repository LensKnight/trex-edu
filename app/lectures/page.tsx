"use client";

import { Baloo_2 } from "next/font/google";

const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import useAuth from "../../src/hooks/useAuth";
import { useTheme } from "../../src/context/ThemeContext";

import {
  Headphones,
  Play,
  Pause,
  Search,
  Clock3,
  UserRound,
  BookOpen,
  FileAudio,
  Volume2,
} from "lucide-react";

type Lecture = {
  id: string;
  title: string;
  subject: string;
  class_name: string;
  section: string;

  file_id: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  duration?: number;

  uploader_id: string;
  uploader_name?: string;

  created_at?: string;
};

const SUBJECTS = [
  "Physics",
  "Chemistry",
  "Mathematics",
  "Computer Science",
  "English",
  "Physical Education",
];

function getSubjectAccent(subject: string) {
  const map: Record<string, string> = {
    Physics: "#793C57",
    Chemistry: "#22c55e",
    Mathematics: "#3b82f6",
    "Computer Science": "#a855f7",
    English: "#ec4899",
    "Physical Education": "#eab308",
  };

  return map[subject] || "#8b0000";
}

function getInitials(name?: string) {
  if (!name) return "?";

  const parts = name
    .trim()
    .split(" ")
    .filter(Boolean);

  if (parts.length === 0) return "?";

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[1][0]
  ).toUpperCase();
}

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) {
    return "Audio";
  }

  const total = Math.floor(seconds);

  const hours = Math.floor(total / 3600);

  const minutes = Math.floor(
    (total % 3600) / 60
  );

  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${String(
      minutes
    ).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(
    secs
  ).padStart(2, "0")}`;
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "";

  const mb = bytes / (1024 * 1024);

  if (mb < 1) {
    return `${Math.round(
      bytes / 1024
    )} KB`;
  }

  return `${mb.toFixed(1)} MB`;
}

export default function LecturesPage() {
  const { session, loading } = useAuth();
  const { darkMode } = useTheme();

  const [lectures, setLectures] =
    useState<Lecture[]>([]);

  const [search, setSearch] =
    useState("");

  const [activeSubject, setActiveSubject] =
    useState("All");

  const [loadingLectures, setLoadingLectures] =
    useState(true);

  const [playingId, setPlayingId] =
    useState<string | null>(null);

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
    ? "linear-gradient(160deg, #1c1c1f 0%, #150505 100%)"
    : "linear-gradient(160deg, #ffe0e0 0%, #ffc9c9 100%)";

  const border = darkMode
    ? "1px solid #3f0000"
    : "1px solid #ffb3b3";

  const inputBg = darkMode
    ? "#1b1b1e"
    : "#ffd0d0";

  // ------------------------------------------------
  // Fetch lectures
  // ------------------------------------------------

  useEffect(() => {
    if (!loading && session) {
      fetchLectures();
    }
  }, [loading, session]);

  async function fetchLectures() {
    if (!session) return;

    setLoadingLectures(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Get student's class + section
      const { data: profile } =
        await supabase
          .from("profiles")
          .select(
            "class_name, section"
          )
          .eq("id", user.id)
          .single();

      if (!profile) return;

      // Get lectures for same class + section
      const { data, error } =
        await supabase
          .from("lectures")
          .select(
            `
            *,
            profiles(full_name)
            `
          )
          .eq(
            "class_name",
            profile.class_name
          )
          .eq(
            "section",
            profile.section
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (error) {
        console.error(
          "Lecture fetch error:",
          error
        );
        return;
      }

      if (data) {
        setLectures(
          data.map(
            (lecture: any) => ({
              ...lecture,

              uploader_name:
                lecture.profiles
                  ?.full_name ||
                "Unknown",
            })
          )
        );
      }
    } finally {
      setLoadingLectures(false);
    }
  }

  // ------------------------------------------------
  // Realtime
  // ------------------------------------------------

  useEffect(() => {
    if (!session) return;

    const channel =
      supabase
        .channel(
          "lectures-realtime"
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "lectures",
          },
          async () => {
            await fetchLectures();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "lectures",
          },
          async () => {
            await fetchLectures();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "lectures",
          },
          async () => {
            await fetchLectures();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [session]);

  // ------------------------------------------------
  // Filter
  // ------------------------------------------------

  const filteredLectures =
    lectures.filter(
      (lecture) => {
        const matchesSubject =
          activeSubject ===
            "All" ||
          lecture.subject ===
            activeSubject;

        const query =
          search.toLowerCase();

        const matchesSearch =
          lecture.title
            .toLowerCase()
            .includes(query) ||
          lecture.subject
            .toLowerCase()
            .includes(query) ||
          (
            lecture.uploader_name ||
            ""
          )
            .toLowerCase()
            .includes(query);

        return (
          matchesSubject &&
          matchesSearch
        );
      }
    );

  if (loading) {
    return (
      <div className="loading-screen">
        <img
          src="/toggle-icon.png"
          className="loading-x"
          alt="loading"
        />

        <div className="loading-text">
          Loading Lectures
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-4 md:p-8 min-h-screen transition-all duration-500"
      style={{
        background: bg,
        color: textColor,
      }}
    >
      {/* ------------------------------------------ */}
      {/* HEADER */}
      {/* ------------------------------------------ */}

      <div className="mb-6 md:mb-10">
        <p
          className="text-xs md:text-sm font-medium tracking-widest uppercase mb-1"
          style={{
            color: subTextColor,
          }}
        >
          Audio Learning
        </p>

        <h1
          className={`${baloo.className} text-3xl md:text-5xl`}
          style={{
            fontWeight: 800,
          }}
        >
          Lectures
        </h1>

        <div
          className="mt-2 h-0.5 w-16 md:w-24 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, #8b0000, transparent)",
          }}
        />

        <p
          className="mt-3 text-sm md:text-base"
          style={{
            color: subTextColor,
          }}
        >
          Listen to lectures uploaded
          by your community.
        </p>
      </div>

      {/* ------------------------------------------ */}
      {/* SEARCH */}
      {/* ------------------------------------------ */}

      <div className="mb-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2"
            style={{
              color: subTextColor,
            }}
          />

          <input
            type="text"
            placeholder="       Search lectures..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            className="w-full p-3 md:p-4 pl-11 rounded-2xl outline-none transition-all duration-300 focus:scale-[1.01]"
            style={{
              background: inputBg,
              color: textColor,
              border,
            }}
          />
        </div>
      </div>

      {/* ------------------------------------------ */}
      {/* SUBJECT FILTER */}
      {/* ------------------------------------------ */}

      <div className="mb-6 md:mb-10 flex gap-2 overflow-x-auto pb-1">
        {[
          "All",
          ...SUBJECTS,
        ].map((subject) => (
          <button
            key={subject}
            onClick={() =>
              setActiveSubject(
                subject
              )
            }
            className="shrink-0 rounded-xl px-4 py-2 text-xs md:text-sm font-semibold transition-all duration-200 hover:scale-[1.03]"
            style={{
              background:
                activeSubject ===
                subject
                  ? "#8b0000"
                  : inputBg,

              color:
                activeSubject ===
                subject
                  ? "#ffffff"
                  : textColor,

              border,
            }}
          >
            {subject}
          </button>
        ))}
      </div>

      {/* ------------------------------------------ */}
      {/* LOADING */}
      {/* ------------------------------------------ */}

      {loadingLectures && (
        <div className="text-center py-20">
          <div
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{
              background: cardBg,
              border,
            }}
          >
            <Headphones
              size={18}
              className="animate-pulse"
            />

            <span className="text-sm">
              Loading lectures...
            </span>
          </div>
        </div>
      )}

      {/* ------------------------------------------ */}
      {/* LECTURES */}
      {/* ------------------------------------------ */}

      {!loadingLectures &&
        SUBJECTS.map((subject) => {
          const subjectLectures =
            filteredLectures.filter(
              (lecture) =>
                lecture.subject ===
                subject
            );

          if (
            subjectLectures.length ===
            0
          ) {
            return null;
          }

          const accent =
            getSubjectAccent(
              subject
            );

          return (
            <div
              key={subject}
              className="mb-8 md:mb-12"
            >
              {/* Subject heading */}

              <div className="flex items-center gap-3 mb-3 md:mb-5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: accent,
                  }}
                />

                <h2
                  className={`${baloo.className} text-2xl md:text-3xl`}
                  style={{
                    fontWeight: 700,
                  }}
                >
                  {subject}
                </h2>

                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{
                    background: darkMode
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(139,0,0,0.06)",
                    color:
                      subTextColor,
                  }}
                >
                  {
                    subjectLectures.length
                  }
                </span>
              </div>

              {/* Cards */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
                {subjectLectures.map(
                  (lecture) => {
                    const isPlaying =
                      playingId ===
                      lecture.id;

                    const audioUrl =
                      `/api/file-proxy?file_id=${encodeURIComponent(
                        lecture.file_id
                      )}`;

                    const isOwn =
                      lecture.uploader_id ===
                      session?.user.id;

                    return (
                      <div
                        key={
                          lecture.id
                        }
                        className="relative pl-6 pr-5 py-5 md:pl-7 md:pr-6 md:py-6 rounded-2xl overflow-hidden group transition-all duration-300 hover:-translate-y-0.5"
                        style={{
                          background:
                            cardBg,
                          border,

                          boxShadow:
                            darkMode
                              ? "0 1px 2px rgba(0,0,0,0.3), 0 12px 28px -12px rgba(0,0,0,0.55)"
                              : "0 1px 2px rgba(139,0,0,0.05), 0 12px 28px -14px rgba(139,0,0,0.25)",
                        }}
                      >
                        {/* Subject spine */}

                        <div
                          className="absolute inset-y-0 left-0 w-1.25 group-hover:w-2 transition-all duration-300"
                          style={{
                            background:
                              accent,
                          }}
                        />

                        {/* Hover glow */}

                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                          style={{
                            boxShadow: `0 20px 40px -20px ${accent}55`,
                          }}
                        />

                        {/* -------------------------------- */}
                        {/* TOP ROW */}
                        {/* -------------------------------- */}

                        <div className="flex items-center gap-2.5 mb-4">
                          {/* Avatar */}

                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                            style={{
                              background: `${accent}22`,
                              color: accent,
                              border: `1px solid ${accent}44`,
                            }}
                          >
                            {getInitials(
                              isOwn
                                ? "You"
                                : lecture.uploader_name
                            )}
                          </div>

                          {/* User */}

                          <div className="min-w-0">
                            <p
                              className="text-xs font-semibold truncate"
                              style={{
                                color:
                                  textColor,
                              }}
                            >
                              {isOwn
                                ? "You"
                                : lecture.uploader_name}
                            </p>

                            <p
                              className="text-[10px] font-bold uppercase tracking-widest truncate"
                              style={{
                                color:
                                  accent,
                              }}
                            >
                              {lecture.subject}
                            </p>
                          </div>

                          {/* Audio badge */}

                          <div
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold tracking-wide ml-auto shrink-0"
                            style={{
                              background:
                                "rgba(139,0,0,0.08)",
                              border: `1px solid ${accent}55`,
                              color: accent,
                            }}
                          >
                            <FileAudio
                              size={11}
                            />

                            AUDIO
                          </div>
                        </div>

                        {/* -------------------------------- */}
                        {/* TITLE */}
                        {/* -------------------------------- */}

                        <h3
                          className={`${baloo.className} text-xl md:text-2xl mb-3 leading-tight`}
                          style={{
                            fontWeight: 700,
                            letterSpacing:
                              "-0.01em",
                          }}
                        >
                          {
                            lecture.title
                          }
                        </h3>

                        {/* -------------------------------- */}
                        {/* META */}
                        {/* -------------------------------- */}

                        <div
                          className="flex flex-wrap items-center gap-3 mb-4 text-xs"
                          style={{
                            color:
                              subTextColor,
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <Clock3
                              size={13}
                            />

                            {formatDuration(
                              lecture.duration
                            )}
                          </div>

                          {lecture.file_size && (
                            <div className="flex items-center gap-1.5">
                              <FileAudio
                                size={13}
                              />

                              {formatFileSize(
                                lecture.file_size
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-1.5">
                            <UserRound
                              size={13}
                            />

                            {isOwn
                              ? "Uploaded by you"
                              : "Community Lecture"}
                          </div>
                        </div>

                        {/* -------------------------------- */}
                        {/* AUDIO PLAYER */}
                        {/* -------------------------------- */}

                        <div
                          className="rounded-xl p-3 mb-4"
                          style={{
                            background:
                              darkMode
                                ? "rgba(0,0,0,0.25)"
                                : "rgba(255,255,255,0.35)",
                            border:
                              darkMode
                                ? "1px solid rgba(255,255,255,0.07)"
                                : "1px solid rgba(139,0,0,0.08)",
                          }}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                              style={{
                                background:
                                  accent,
                                color:
                                  "#ffffff",
                              }}
                            >
                              {isPlaying ? (
                                <Pause
                                  size={17}
                                />
                              ) : (
                                <Play
                                  size={17}
                                />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p
                                className="text-xs font-semibold truncate"
                                style={{
                                  color:
                                    textColor,
                                }}
                              >
                                {
                                  lecture.file_name
                                }
                              </p>

                              <p
                                className="text-[10px]"
                                style={{
                                  color:
                                    subTextColor,
                                }}
                              >
                                Tap play to listen
                              </p>
                            </div>

                            <Volume2
                              size={15}
                              style={{
                                color:
                                  subTextColor,
                              }}
                            />
                          </div>

                          <audio
                            controls
                            preload="metadata"
                            className="w-full h-10"
                            src={audioUrl}
                            onPlay={() =>
                              setPlayingId(
                                lecture.id
                              )
                            }
                            onPause={() =>
                              setPlayingId(
                                (current) =>
                                  current ===
                                  lecture.id
                                    ? null
                                    : current
                              )
                            }
                            onEnded={() =>
                              setPlayingId(
                                null
                              )
                            }
                          />
                        </div>

                        {/* -------------------------------- */}
                        {/* FOOTER */}
                        {/* -------------------------------- */}

                        <div
                          className="flex items-center gap-2 pt-4"
                          style={{
                            borderTop:
                              darkMode
                                ? "1px dashed rgba(255,255,255,0.12)"
                                : "1px dashed rgba(139,0,0,0.15)",
                          }}
                        >
                          <div
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
                            style={{
                              background:
                                `${accent}18`,
                              color:
                                accent,
                            }}
                          >
                            <Headphones
                              size={13}
                            />

                            Audio Lecture
                          </div>

                          <div
                            className="ml-auto text-[10px]"
                            style={{
                              color:
                                subTextColor,
                            }}
                          >
                            {lecture.created_at
                              ? new Date(
                                  lecture.created_at
                                ).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "numeric",
                                    month:
                                      "short",
                                    year:
                                      "numeric",
                                  }
                                )
                              : ""}
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          );
        })}

      {/* ------------------------------------------ */}
      {/* NO RESULTS */}
      {/* ------------------------------------------ */}

      {!loadingLectures &&
        filteredLectures.length ===
          0 && (
          <div className="text-center mt-20">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{
                background:
                  darkMode
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(139,0,0,0.06)",
              }}
            >
              <Headphones
                size={28}
                style={{
                  color:
                    subTextColor,
                }}
              />
            </div>

            <p
              className={`${baloo.className} text-xl font-bold`}
              style={{
                color:
                  subTextColor,
              }}
            >
              No lectures found
            </p>

            <p
              className="text-sm mt-1"
              style={{
                color:
                  subTextColor,
              }}
            >
              Try another search or
              subject.
            </p>
          </div>
        )}
    </div>
  );
}