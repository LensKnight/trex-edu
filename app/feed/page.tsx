"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import useAuth from "../../src/hooks/useAuth";
import { useTheme } from "../../src/context/ThemeContext";

type Note = {
  id: string;
  title: string;
  subject: string;
  file_id?: string; // ✅ Telegram file_id
  likes: number;
  uploader_id: string;
};

export default function FeedPage() {
  const { session, loading } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [liking, setLiking] = useState<string | null>(null);
  const [likedNotes, setLikedNotes] = useState<string[]>([]);
  

  const bg =
    darkMode
      ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
      : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";

  const textColor = darkMode ? "#ffffff" : "#1a0000";
  const subTextColor = darkMode ? "#a1a1aa" : "#8b0000";
  const cardBg = darkMode ? "#18181b" : "#ffcccc";
  const border = darkMode ? "1px solid #3f0000" : "1px solid #ffb3b3";

  useEffect(() => {
    if (!loading && session) {
      fetchNotes();
      fetchLikedNotes();
    }
  }, [loading, session]);

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
      .select("*")
      .eq("class_name", profile.class_name)
      .eq("section", profile.section)
      .order("created_at", { ascending: false });

    if (data) setNotes(data);
  }

  async function fetchLikedNotes() {
    const { data } = await supabase
      .from("note_likes")
      .select("note_id")
      .eq("user_id", session!.user.id);

    if (data) setLikedNotes(data.map((d) => d.note_id));
  }

  // 🔥 FIXED OPEN LOGIC (IMPORTANT PART)
  const openNote = async (fileId?: string) => {
    if (!fileId) return alert("File not found");

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${process.env.NEXT_PUBLIC_BOT_TOKEN}/getFile?file_id=${fileId}`
      );

      const data = await res.json();

      if (!data.ok) {
        console.log("Telegram error:", data);
        return alert("Cannot open file");
      }

      const filePath = data.result.file_path;

      const fileUrl = `https://api.telegram.org/file/bot${process.env.NEXT_PUBLIC_BOT_TOKEN}/${filePath}`;

      window.open(fileUrl, "_blank");
    } catch (err) {
      console.log(err);
      alert("Open failed");
    }
  };

  async function likeNote(note: Note) {
    if (!session) return;
    if (liking === note.id) return;

    setLiking(note.id);

    const { error } = await supabase
      .from("note_likes")
      .insert({ note_id: note.id, user_id: session.user.id });

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
        n.id === note.id ? { ...n, likes: newLikes } : n
      )
    );

    setLiking(null);
  }

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
        <img src="/toggle-icon.png" className="loading-x" alt="loading" />
        <div className="loading-text">Loading Notes</div>
      </div>
    );

  return (
    <div
      className="p-8 min-h-screen transition-all duration-500"
      style={{ background: bg, color: textColor }}
    >
      {/* Header (UNCHANGED) */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p
            className="text-sm font-medium tracking-widest uppercase mb-1"
            style={{ color: subTextColor }}
          >
            Community Notes
          </p>
          <h1 className="text-5xl font-bold">Notes Feed</h1>
          <div
            className="mt-2 h-0.5 w-24 rounded-full"
            style={{
              background: "linear-gradient(90deg, #8b0000, transparent)",
            }}
          />
        </div>

        <button
          onClick={() => setDarkMode(!darkMode)}
          className="px-4 py-2 rounded-2xl font-bold transition-all duration-300 hover:scale-105"
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

      {/* BODY (UNCHANGED UI) */}
      {subjects.map((subject) => {
        const filteredNotes = notes.filter(
          (note) => note.subject === subject
        );

        if (filteredNotes.length === 0) return null;

        return (
          <div key={subject} className="mb-12">
            <h2 className="text-3xl font-bold mb-5">{subject}</h2>

            <div className="grid grid-cols-2 gap-5">
              {filteredNotes.map((note) => {
                const alreadyLiked = likedNotes.includes(note.id);
                const isOwn = note.uploader_id === session?.user.id;

                return (
                  <div
                    key={note.id}
                    className="p-5 rounded-3xl transition-all duration-300 hover:scale-103"
                    style={{ background: cardBg, border }}
                  >
                    <h3 className="text-2xl font-bold mb-2">
                      {note.title}
                    </h3>

                    <p
                      className="mb-4 text-sm"
                      style={{ color: subTextColor }}
                    >
                      {note.subject}
                    </p>

                    <div className="flex items-center gap-3">

                      {/* 🔥 FIXED BUTTON */}
                      <button
                        onClick={() => openNote(note.file_id)}
                        className="px-4 py-2 rounded-xl transition hover:scale-105"
                        style={{
                          background: darkMode
                            ? "#1e3a5f"
                            : "#dbeafe",
                          color: darkMode ? "#fff" : "#1e3a5f",
                        }}
                      >
                        Open Note
                      </button>

                      <button
                        onClick={() => likeNote(note)}
                        disabled={liking === note.id || alreadyLiked || isOwn}
                        className="px-4 py-2 rounded-xl transition flex items-center gap-2"
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
                        {alreadyLiked ? "❤️" : "🤍"} {note.likes || 0}
                      </button>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}