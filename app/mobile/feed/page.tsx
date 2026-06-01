"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../src/lib/supabase";
import useAuth from "../../../src/hooks/useAuth";
import { useTheme } from "../../../src/context/ThemeContext";
import {
  LayoutDashboard,
  BookOpen,
  PlusSquare,
  MessageCircle,
  CircleUserRound,
} from "lucide-react";

type Note = {
  id: string;
  title: string;
  subject: string;
  file_id?: string;
  likes: number;
  uploader_id: string;
  uploader_name?: string;
};

export default function MobileFeedPage() {
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
  const border = darkMode ? "1px solid #3f0000" : "1px solid #ffb3b3";
  const inputBg = darkMode ? "#1b1b1e" : "#ffd0d0";

  useEffect(() => {
    if (!loading && session) {
      fetchNotes();
      fetchLikedNotes();
      fetchReportedNotes();
    }
  }, [loading, session]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase.channel("mobile-notes-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notes" }, async () => await fetchNotes())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notes" }, async () => await fetchNotes())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notes" }, async () => await fetchNotes())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  async function fetchNotes() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("class_name, section").eq("id", user.id).single();
    if (!profile) return;
    const { data } = await supabase.from("notes").select("*, profiles(full_name)").eq("class_name", profile.class_name).eq("section", profile.section).order("created_at", { ascending: false });
    if (data) {
      setNotes(data.map((n: any) => ({ ...n, uploader_name: n.profiles?.full_name || "Unknown" })));
    }
  }

  async function fetchLikedNotes() {
    const { data } = await supabase.from("note_likes").select("note_id").eq("user_id", session!.user.id);
    if (data) setLikedNotes(data.map((d) => d.note_id));
  }

  async function fetchReportedNotes() {
    const { data } = await supabase.from("note_reports").select("note_id").eq("user_id", session!.user.id);
    if (data) setReportedNotes(data.map((d) => d.note_id));
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

      const fileUrl =
        `https://api.telegram.org/file/bot${process.env.NEXT_PUBLIC_BOT_TOKEN}/${filePath}`;

      const lower = filePath.toLowerCase();

      // PDF
      if (lower.endsWith(".pdf")) {

        // Google PDF Viewer
        const viewer =
          `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(fileUrl)}`;

        window.open(viewer, "_blank");

      }

      // Images
      else if (
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".png") ||
        lower.endsWith(".webp")
      ) {

        const html = `
          <html>
            <body style="
              margin:0;
              background:#000;
              display:flex;
              align-items:center;
              justify-content:center;
              min-height:100vh;
            ">
              <img
                src="${fileUrl}"
                style="
                  max-width:100%;
                  max-height:100vh;
                  object-fit:contain;
                "
              />
            </body>
          </html>
        `;

        const blob = new Blob([html], {
          type: "text/html",
        });

        const blobUrl = URL.createObjectURL(blob);

        window.open(blobUrl, "_blank");

      }

      // Other files
      else {
        window.open(fileUrl, "_blank");
      }

    } catch (err) {
      console.log(err);
      alert("Open failed");
    }
};

  async function likeNote(note: Note) {
    if (!session || liking === note.id) return;
    setLiking(note.id);
    const { error } = await supabase.from("note_likes").insert({ note_id: note.id, user_id: session.user.id });
    if (error) { setLiking(null); return; }
    const newLikes = (note.likes || 0) + 1;
    await supabase.from("notes").update({ likes: newLikes }).eq("id", note.id);
    setLikedNotes((prev) => [...prev, note.id]);
    setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, likes: newLikes } : n));
    setLiking(null);
  }

  async function reportNote(note: Note) {
    if (!session) return;
    if (reportedNotes.includes(note.id)) return alert("Already reported!");
    if (note.uploader_id === session.user.id) return alert("Apna note report nahi kar sakte!");
    const { error } = await supabase.from("note_reports").insert({ note_id: note.id, user_id: session.user.id });
    if (error) return alert("Report failed!");
    setReportedNotes((prev) => [...prev, note.id]);
    const { count } = await supabase.from("note_reports").select("*", { count: "exact", head: true }).eq("note_id", note.id);
    if ((count ?? 0) >= 3) {
      await supabase.from("notes").delete().eq("id", note.id);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      alert("Note removed due to multiple reports!");
    } else {
      alert("Reported! ✅");
    }
  }

  const filteredBySearch = notes.filter((note) =>
    note.title.toLowerCase().includes(search.toLowerCase()) ||
    note.subject.toLowerCase().includes(search.toLowerCase())
  );

  const subjects = ["Physics","Chemistry","Mathematics","Computer Science","English","Physical Education"];

  if (loading) return (
    <div className="loading-screen">
      <img src="/toggle-icon.png" className="loading-x" alt="loading" />
      <div className="loading-text">Loading Notes</div>
    </div>
  );

  return (
    <div className="min-h-screen pb-24 transition-all duration-500" style={{background: bg, color: textColor}}>

      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-6">
        <div>
          <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{color: subTextColor}}>Community</p>
          <h1 className="text-2xl font-bold">Notes Feed</h1>
          <div className="mt-1 h-0.5 w-12 rounded-full" style={{background: "linear-gradient(90deg, #8b0000, transparent)"}} />
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <input
          type="text"
          placeholder="🔍 Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 rounded-2xl outline-none"
          style={{background: inputBg, color: textColor, border}}
        />
      </div>

      {/* Notes */}
      <div className="px-4">
        {subjects.map((subject) => {
          const filteredNotes = filteredBySearch.filter((note) => note.subject === subject);
          if (filteredNotes.length === 0) return null;
          return (
            <div key={subject} className="mb-6">
              <h2 className="text-lg font-bold mb-3">{subject}</h2>
              <div className="space-y-3">
                {filteredNotes.map((note) => {
                  const alreadyLiked = likedNotes.includes(note.id);
                  const alreadyReported = reportedNotes.includes(note.id);
                  const isOwn = note.uploader_id === session?.user.id;
                  return (
                    <div key={note.id} className="p-4 rounded-2xl" style={{background: cardBg, border}}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium" style={{color: subTextColor}}>
                            {isOwn ? "📝 You" : `👤 ${note.uploader_name}`}
                          </p>
                          {note.likes >= 3 && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background: "linear-gradient(135deg, #6b0000, #3d0000)", color: "#ffd700"}}>
                              ⭐ Students choice!
                            </span>
                          )}
                        </div>
                      <h3 className="text-base font-bold mb-1 truncate">{note.title}</h3>
                      <p className="text-xs mb-3" style={{color: subTextColor}}>{note.subject}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => openNote(note.file_id)}
                          className="px-3 py-1.5 rounded-xl text-xs"
                          style={{background: darkMode ? "#1e3a5f" : "#dbeafe", color: darkMode ? "#fff" : "#1e3a5f"}}
                        >
                          Open Note
                        </button>
                        <button
                          onClick={() => likeNote(note)}
                          disabled={liking === note.id || alreadyLiked || isOwn}
                          className="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1"
                          style={{
                            background: alreadyLiked || isOwn ? darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" : darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                            color: alreadyLiked || isOwn ? subTextColor : textColor,
                            cursor: alreadyLiked || isOwn ? "not-allowed" : "pointer",
                          }}
                        >
                          {alreadyLiked ? "❤️" : "🤍"} {note.likes || 0}
                        </button>
                        {!isOwn && (
                          <button
                            onClick={() => reportNote(note)}
                            disabled={alreadyReported}
                            className="px-3 py-1.5 rounded-xl text-xs"
                            style={{
                              background: alreadyReported ? darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" : "rgba(220,38,38,0.15)",
                              color: alreadyReported ? subTextColor : "#ef4444",
                              cursor: alreadyReported ? "not-allowed" : "pointer",
                            }}
                          >
                            {alreadyReported ? "Reported" : "🚩"}
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

        {filteredBySearch.length === 0 && search && (
          <div className="text-center mt-20">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm font-bold" style={{color: subTextColor}}>No notes found for "{search}"</p>
          </div>
        )}
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
            <LayoutDashboard size={22} />
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
            <BookOpen size={22} />
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
            <PlusSquare size={22} />
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
            <MessageCircle size={22} />
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
            <CircleUserRound size={22} />
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
    </div>
  );
}