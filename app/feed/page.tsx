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

import {
  LayoutDashboard,
  BookOpen,
  TriangleAlert,
  CircleUserRound
} from "lucide-react";

export default function FeedPage() {
  const { session, loading } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [liking, setLiking] = useState<string | null>(null);
  const [likedNotes, setLikedNotes] = useState<string[]>([]);
  const [reportedNotes, setReportedNotes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  
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
      const res = await fetch(`https://api.telegram.org/bot${process.env.NEXT_PUBLIC_BOT_TOKEN}/getFile?file_id=${fileId}`);
      const data = await res.json();
      if (!data.ok) return alert("Cannot open file");

      const filePath = data.result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${process.env.NEXT_PUBLIC_BOT_TOKEN}/${filePath}`;
      const lower = filePath.toLowerCase();

      if (lower.endsWith(".pdf")) {
        window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}`, "_blank");
      } 
        else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp")) {
        // Image — HTML page mein wrap karke dikhao
        const html = `<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${fileUrl}" style="max-width:100%;max-height:100vh;object-fit:contain"/></body></html>`;
        const blob = new Blob([html], {type: "text/html"});
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
      } else {
        window.open(fileUrl, "_blank");
      }
    } catch {
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

    if (count && count >= 10) {
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
                    className="p-4 md:p-5 rounded-3xl transition-all duration-300 hover:scale-103"
                    style={{
                      background: cardBg,
                      border,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div
                        className="flex items-center gap-1"
                        style={{ color: subTextColor }}
                      >
                        <CircleUserRound size={13} />

                        <p className="text-xs font-medium">
                          {isOwn ? "You" : note.uploader_name}
                        </p>
                      </div>
                      {note.likes >= 10 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background: "linear-gradient(135deg, #6b0000, #3d0000)", color: "#ffd700"}}>
                          ⭐ Students Choice!
                        </span>
                      )}
                    </div>

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
                            : <TriangleAlert size={12} />}
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