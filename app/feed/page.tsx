"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import useAuth from "../../src/hooks/useAuth";
import { useTheme } from "../../src/context/ThemeContext";

type Note = {
  id: string;
  title: string;
  subject: string;
  file_id?: string;
  likes: number;
  uploader_id: string;
  uploader_name?: string;
};

export default function FeedPage() {
  const { session, loading } = useAuth();
  const { darkMode, setDarkMode } = useTheme();

  const [notes, setNotes] = useState<Note[]>([]);
  const [liking, setLiking] = useState<string | null>(null);
  const [likedNotes, setLikedNotes] = useState<string[]>([]);
  const [reportedNotes, setReportedNotes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");
  const [viewerType, setViewerType] = useState<"image" | "pdf" | "other">("other");

  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";

  const textColor = darkMode ? "#ffffff" : "#1a0000";
  const subTextColor = darkMode ? "#a1a1aa" : "#8b0000";
  const cardBg = darkMode ? "#18181b" : "#ffcccc";
  const border = darkMode
    ? "1px solid #3f0000"
    : "1px solid #ffb3b3";

  const inputBg = darkMode ? "#1b1b1e" : "#ffd0d0";

  // Initial fetch
  useEffect(() => {
    if (!loading && session) {
      fetchNotes();
      fetchLikedNotes();
      fetchReportedNotes();
    }
  }, [loading, session]);

  // REALTIME
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("notes-realtime")

      // New notes
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notes",
        },
        async () => {
          await fetchNotes();
        }
      )

      // Updated notes (likes etc.)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notes",
        },
        async () => {
          await fetchNotes();
        }
      )

      // Deleted notes
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notes",
        },
        async () => {
          await fetchNotes();
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  async function fetchNotes() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("class_name, section")
      .eq("id", user.id)
      .single();

    if (!profile) return;

    const { data } = await supabase
      .from("notes")
      .select("*, profiles(full_name)")
      .eq("class_name", profile.class_name)
      .eq("section", profile.section)
      .order("created_at", { ascending: false });

    if (data) {
      setNotes(
        data.map((n: any) => ({
          ...n,
          uploader_name: n.profiles?.full_name || "Unknown",
        }))
      );
    }
  }

  async function fetchLikedNotes() {
    const { data } = await supabase
      .from("note_likes")
      .select("note_id")
      .eq("user_id", session!.user.id);

    if (data) {
      setLikedNotes(data.map((d) => d.note_id));
    }
  }

  async function fetchReportedNotes() {
    const { data } = await supabase
      .from("note_reports")
      .select("note_id")
      .eq("user_id", session!.user.id);

    if (data) {
      setReportedNotes(data.map((d) => d.note_id));
    }
  }

  const openNote = async (fileId?: string) => {
    if (!fileId) return alert("File not found");

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${process.env.NEXT_PUBLIC_BOT_TOKEN}/getFile?file_id=${fileId}`
      );

      const data = await res.json();

      if (!data.ok) return alert("Cannot open file");

      const filePath = data.result.file_path;

      const fileUrl = `https://api.telegram.org/file/bot${process.env.NEXT_PUBLIC_BOT_TOKEN}/${filePath}`;

      const lower = filePath.toLowerCase();

      // IMAGE
      if (
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".png") ||
        lower.endsWith(".webp")
      ) {
        setViewerType("image");
        setViewerUrl(fileUrl);
        setViewerOpen(true);
        return;
      }

      // PDF
      if (lower.endsWith(".pdf")) {
        setViewerType("pdf");
        setViewerUrl(fileUrl);
        setViewerOpen(true);
        return;
      }

      // OTHER FILES
      window.open(fileUrl, "_blank");

    } catch (err) {
      alert("Open failed");
    }
  };

  async function likeNote(note: Note) {
    if (!session) return;

    if (liking === note.id) return;

    setLiking(note.id);

    const { error } = await supabase
      .from("note_likes")
      .insert({
        note_id: note.id,
        user_id: session.user.id,
      });

    if (error) {
      setLiking(null);
      return alert("Like failed");
    }

    const newLikes = (note.likes || 0) + 1;

    await supabase
      .from("notes")
      .update({ likes: newLikes })
      .eq("id", note.id);

    setLikedNotes((prev) => [...prev, note.id]);

    setNotes((prev) =>
      prev.map((n) =>
        n.id === note.id
          ? { ...n, likes: newLikes }
          : n
      )
    );

    setLiking(null);
  }

  async function reportNote(note: Note) {
    if (!session) return;

    if (reportedNotes.includes(note.id))
      return alert("Already reported!");

    if (note.uploader_id === session.user.id)
      return alert("You cannot report your own note!");

    const { error } = await supabase
      .from("note_reports")
      .insert({
        note_id: note.id,
        user_id: session.user.id,
      });

    if (error) return alert("Report failed!");

    setReportedNotes((prev) => [...prev, note.id]);

    const { count } = await supabase
      .from("note_reports")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("note_id", note.id);

    if (count && count >= 2) {
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("xp")
        .eq("id", note.uploader_id)
        .single();

      if (profileData && !profileError) {
        const newXP = Math.max(
          (profileData.xp || 0) - 20,
          0
        );

        await supabase
          .from("profiles")
          .update({ xp: newXP })
          .eq("id", note.uploader_id);
      }

      await supabase
        .from("notes")
        .delete()
        .eq("id", note.id);

      setNotes((prev) =>
        prev.filter((n) => n.id !== note.id)
      );

      alert("Note removed due to multiple reports!");
    } else {
      alert("Reported! ✅");
    }
  }

  const filteredBySearch = notes.filter(
    (note) =>
      note.title
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      note.subject
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  const subjects = [
    "Physics",
    "Chemistry",
    "Mathematics",
    "Computer Science",
    "English",
    "Physical Education",
  ];

  if (loading)
    return (
      <div className="loading-screen">
        <img
          src="/toggle-icon.png"
          className="loading-x"
          alt="loading"
        />
        <div className="loading-text">
          Loading Notes
        </div>
      </div>
    );

  return (
    <div
      className="p-4 md:p-8 min-h-screen transition-all duration-500"
      style={{
        background: bg,
        color: textColor,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6 md:mb-10">
        <div>
          <p
            className="text-xs md:text-sm font-medium tracking-widest uppercase mb-1"
            style={{ color: subTextColor }}
          >
            Community Notes
          </p>

          <h1 className="text-3xl md:text-5xl font-bold">
            Notes Feed
          </h1>

          <div
            className="mt-2 h-0.5 w-16 md:w-24 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, #8b0000, transparent)",
            }}
          />
        </div>

        <button
          onClick={() => setDarkMode(!darkMode)}
          className="px-3 py-2 md:px-4 md:py-2 rounded-2xl font-bold transition-all duration-300 hover:scale-105 text-sm"
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

      {/* Search */}
      <div className="mb-6 md:mb-10 hover: scale-102 transition-all duration-300">
        <input
          type="text"
          placeholder="🔍 Search notes..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="w-full p-3 md:p-4 rounded-2xl outline-none transition-all duration-300"
          style={{
            background: inputBg,
            color: textColor,
            border,
          }}
        />
        {/* FILE VIEWER */}
        {viewerOpen && (
          <div
            className="fixed inset-0 flex items-center justify-center"
            onClick={() => setViewerOpen(false)}
          >
            <div
              className="relative w-full h-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setViewerOpen(false)}
                className="absolute top-4 right-4 z-50 bg-black/70 text-white px-4 py-2 rounded-xl"
              >
                ✕
              </button>

              {/* IMAGE */}
              {viewerType === "image" && (
                <img
                  src={viewerUrl}
                  className="w-full h-full object-contain"
                />
              )}

              {/* PDF (FIXED SIZE) */}
              {viewerType === "pdf" && (
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(
                    viewerUrl
                  )}&embedded=true`}
                  className="w-full h-full"
                />
              )}
            </div>
          </div>
        )}

      </div>

      {/* Notes */}
      {subjects.map((subject) => {
        const filteredNotes =
          filteredBySearch.filter(
            (note) => note.subject === subject
          );

        if (filteredNotes.length === 0)
          return null;

        return (
          <div
            key={subject}
            className="mb-8 md:mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-5">
              {subject}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
              {filteredNotes.map((note) => {
                const alreadyLiked =
                  likedNotes.includes(note.id);

                const alreadyReported =
                  reportedNotes.includes(note.id);

                const isOwn =
                  note.uploader_id ===
                  session?.user.id;

                return (
                  <div
                    key={note.id}
                    className="p-4 md:p-5 rounded-3xl transition-all duration-300"
                    style={{
                      background: cardBg,
                      border,
                    }}
                  >
                    <p
                      className="text-xs mb-1 font-medium"
                      style={{
                        color: subTextColor,
                      }}
                    >
                      {isOwn
                        ? "📝 You"
                        : `👤 ${note.uploader_name}`}
                    </p>

                    <h3 className="text-lg md:text-2xl font-bold mb-2 truncate">
                      {note.title}
                    </h3>

                    <p
                      className="mb-3 md:mb-4 text-xs md:text-sm"
                      style={{
                        color: subTextColor,
                      }}
                    >
                      {note.subject}
                    </p>

                    <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                      <button
                        onClick={() =>
                          openNote(note.file_id)
                        }
                        className="px-3 md:px-4 py-2 rounded-xl transition hover:scale-105 text-sm"
                        style={{
                          background: darkMode
                            ? "#1e3a5f"
                            : "#dbeafe",
                          color: darkMode
                            ? "#fff"
                            : "#1e3a5f",
                        }}
                      >
                        Open Note
                      </button>

                      <button
                        onClick={() =>
                          likeNote(note)
                        }
                        disabled={
                          liking === note.id ||
                          alreadyLiked ||
                          isOwn
                        }
                        className="px-3 md:px-4 py-2 rounded-xl transition flex items-center gap-2 text-sm"
                        style={{
                          background:
                            alreadyLiked || isOwn
                              ? darkMode
                                ? "rgba(255,255,255,0.05)"
                                : "rgba(0,0,0,0.05)"
                              : darkMode
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.1)",

                          color:
                            alreadyLiked || isOwn
                              ? subTextColor
                              : textColor,

                          cursor:
                            alreadyLiked || isOwn
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {alreadyLiked
                          ? "❤️"
                          : "🤍"}{" "}
                        {note.likes || 0}
                      </button>

                      {!isOwn && (
                        <button
                          onClick={() =>
                            reportNote(note)
                          }
                          disabled={
                            alreadyReported
                          }
                          className="px-3 py-2 rounded-xl transition text-sm"
                          style={{
                            background:
                              alreadyReported
                                ? darkMode
                                  ? "rgba(255,255,255,0.03)"
                                  : "rgba(0,0,0,0.03)"
                                : "rgba(220,38,38,0.15)",

                            color:
                              alreadyReported
                                ? subTextColor
                                : "#ef4444",

                            cursor:
                              alreadyReported
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          {alreadyReported
                            ? "Reported"
                            : "🚩 Report"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* No results */}
      {filteredBySearch.length === 0 &&
        search && (
          <div className="text-center mt-20">
            <p className="text-4xl mb-4">
              🔍
            </p>

            <p
              className="text-lg font-bold"
              style={{
                color: subTextColor,
              }}
            >
              No notes found for "{search}"
            </p>
          </div>
        )}
    </div>
  );
}