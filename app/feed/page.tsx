"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import useAuth from "../../src/hooks/useAuth";
import { useTheme } from "../../src/context/ThemeContext";

type Note = {
  id: string;
  title: string;
  subject: string;
  file_url: string;
  likes: number;
  uploader_id: string;
};

export default function FeedPage() {
  const { session, loading } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [liking, setLiking] = useState<string | null>(null);
  const [likedNotes, setLikedNotes] = useState<string[]>([]);

  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";
  const textColor = darkMode ? "#ffffff" : "#1a0000";
  const subTextColor = darkMode ? "#a1a1aa" : "#8b0000";
  const cardBg = darkMode ? "#18181b" : "#ffcccc";
  const border = darkMode ? "1px solid #3f0000" : "1px solid #ffb3b3";

  useEffect(() => {
    if (!loading && session) { fetchNotes(); fetchLikedNotes(); }
  }, [loading, session]);

  async function fetchNotes() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // get current user's class + section
    const { data: profile } = await supabase
      .from("profiles")
      .select("class_name, section")
      .eq("id", user.id)
      .single();

    if (!profile) return;

    // fetch ONLY same section notes
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("class_name", profile.class_name)
      .eq("section", profile.section)
      .order("created_at", { ascending: false });

    if (!error && data) setNotes(data);
  }

  async function fetchLikedNotes() {
    const { data } = await supabase.from("note_likes").select("note_id").eq("user_id", session!.user.id);
    if (data) setLikedNotes(data.map((d) => d.note_id));
  }

  async function likeNote(note: Note) {
    if (!session) return;
    if (liking === note.id) return;
    if (note.uploader_id === session.user.id) return alert("Apna note like nahi kar sakte! 😄");
    if (likedNotes.includes(note.id)) return alert("Ye note pehle se like kar chuke ho!");

    setLiking(note.id);
    const { error: likeError } = await supabase.from("note_likes").insert({ note_id: note.id, user_id: session.user.id });
    if (likeError) { setLiking(null); return alert("Like nahi hua, dobara try karo!"); }

    const newLikes = (note.likes || 0) + 1;
    await supabase.from("notes").update({ likes: newLikes }).eq("id", note.id);

    const { data: profileData } = await supabase.from("profiles").select("xp").eq("id", note.uploader_id).single();
    const newXp = (profileData?.xp || 0) + 5;
    await supabase.from("profiles").update({ xp: newXp }).eq("id", note.uploader_id);

    setLikedNotes((prev) => [...prev, note.id]);
    setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, likes: newLikes } : n));
    setLiking(null);
  }

  const subjects = ["Physics","Chemistry","Mathematics","Computer Science","English","Physical Education"];

  if (loading) return (
    <div className="loading-screen">
      <img src="/toggle-icon.png" className="loading-x" alt="loading" />
      <div className="loading-text">Loading Notes</div>
    </div>
  );

  return (
    <div className="p-8 min-h-screen transition-all duration-500" style={{background: bg, color: textColor}}>

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-sm font-medium tracking-widest uppercase mb-1" style={{color: subTextColor}}>Community Notes</p>
          <h1 className="text-5xl font-bold">Notes Feed</h1>
          <div className="mt-2 h-0.5 w-24 rounded-full" style={{background: "linear-gradient(90deg, #8b0000, transparent)"}}></div>
        </div>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="px-4 py-2 rounded-2xl font-bold transition-all duration-300 hover:scale-105"
          style={{background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", color: textColor}}
        >
          {darkMode ? "☀️" : "🌙"}
        </button>
      </div>

      {subjects.map((subject) => {
        const filteredNotes = notes.filter((note) => note.subject === subject);
        if (filteredNotes.length === 0) return null;
        return (
          <div key={subject} className="mb-12">
            <h2 className="text-3xl font-bold mb-5">{subject}</h2>
            <div className="grid grid-cols-2 gap-5">
              {filteredNotes.map((note) => {
                const alreadyLiked = likedNotes.includes(note.id);
                const isOwn = note.uploader_id === session?.user.id;
                return (
                  <div key={note.id} className="p-5 rounded-3xl transition-all duration-300 hover:scale-103" style={{background: cardBg, border}}>
                    <h3 className="text-2xl font-bold mb-2">{note.title}</h3>
                    <p className="mb-4 text-sm" style={{color: subTextColor}}>{note.subject}</p>
                    <div className="flex items-center gap-3">
                      <a href={note.file_url} target="_blank" className="px-4 py-2 rounded-xl inline-block transition hover:scale-105" style={{background: darkMode ? "#1e3a5f" : "#dbeafe", color: darkMode ? "#fff" : "#1e3a5f"}}>
                        Open Note
                      </a>
                      <button
                        onClick={() => likeNote(note)}
                        disabled={liking === note.id || alreadyLiked || isOwn}
                        className="px-4 py-2 rounded-xl transition flex items-center gap-2"
                        style={{
                          background: alreadyLiked || isOwn
                            ? darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"
                            : darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                          color: alreadyLiked || isOwn ? subTextColor : textColor,
                          cursor: alreadyLiked || isOwn ? "not-allowed" : "pointer"
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