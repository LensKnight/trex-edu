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

type Note = {
  id: string;
  title: string;
  subject: string;
  category?: string;
  file_id?: string;
  file_type?: string; // e.g. "pdf", "jpg", "png" — populated from DB if column exists
  likes: number;
  uploader_id: string;
  uploader_name?: string;
};
import { buildTrexViewLink } from "../../src/lib/trexview";

import {
  LayoutDashboard,
  BookOpen,
  TriangleAlert,
  CircleUserRound,
  X,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Heart,
  Award,
  ExternalLink,
} from "lucide-react";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "gif", "bmp"];

const CATEGORIES = ["All", "School Notes", "Extra Notes", "TreX Special"];

// Pulls a real extension out of a Telegram file_path, e.g. "documents/file_72.pdf" -> "pdf".
// Telegram often omits the extension entirely (e.g. "documents/file_72"), so this can return "".
function extFromFilePath(filePath: string): string {
  const match = filePath.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : "";
}

// Decides pdf vs image for the viewer. Priority: real extension from Telegram path,
// then the note's own file_type from the DB, then the Telegram folder prefix
// ("photos/" vs "documents/"), then default to pdf since that's the common case for notes.
function inferViewerType(filePath: string, noteFileType?: string): "pdf" | "image" {
  const pathExt = extFromFilePath(filePath);
  const dbExt = (noteFileType || "").toLowerCase().replace(".", "");
  const ext = pathExt || dbExt;

  if (IMAGE_EXTS.includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (filePath.startsWith("photos/")) return "image";
  return "pdf";
}

// Returns badge info (label + icon + colors) based on file extension
function getFileBadge(fileType?: string, darkMode?: boolean) {
  const ext = (fileType || "").toLowerCase().replace(".", "");

  if (!ext) {
    return {
      label: "FILE",
      Icon: FileIcon,
      bg: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      color: darkMode ? "#d4d4d8" : "#52525b",
    };
  }

  if (ext === "pdf") {
    return {
      label: "PDF",
      Icon: FileText,
      bg: "rgba(220,38,38,0.15)",
      color: "#ef4444",
    };
  }

  if (IMAGE_EXTS.includes(ext)) {
    return {
      label: "IMG",
      Icon: ImageIcon,
      bg: "rgba(37,99,235,0.15)",
      color: "#3b82f6",
    };
  }

  return {
    label: ext.toUpperCase(),
    Icon: FileIcon,
    bg: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    color: darkMode ? "#d4d4d8" : "#52525b",
  };
}

// Distinct accent color per subject — used as the card's "index tab" spine
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
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}


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
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Report confirmation modal state
  const [reportTarget, setReportTarget] = useState<Note | null>(null);
  const [reportAgreed, setReportAgreed] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";

  const textColor = darkMode ? "#ffffff" : "#1a0000";
  const subTextColor = darkMode ? "#a1a1aa" : "#8b0000";
  const cardBg = darkMode
    ? "linear-gradient(160deg, #1c1c1f 0%, #150505 100%)"
    : "linear-gradient(160deg, #ffe0e0 0%, #ffc9c9 100%)";
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
          category: n.category || "School Notes",
          // falls back gracefully to undefined if the notes table
          // doesn't have a file_type / file_name column yet
          file_type:
            n.file_type ||
            n.file_ext ||
            n.file_name?.split(".").pop() ||
            undefined,
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

  const openNote = async (note: Note) => {
    if (!note.file_id) return alert("File not found");
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${process.env.NEXT_PUBLIC_BOT_TOKEN}/getFile?file_id=${note.file_id}`
      );
      const data = await res.json();
      if (!data.ok) return alert("Cannot open file");

      const filePath: string = data.result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${process.env.NEXT_PUBLIC_BOT_TOKEN}/${filePath}`;

      const viewerType = inferViewerType(filePath, note.file_type);
      const pathExt = extFromFilePath(filePath);
      const displayExt = pathExt || note.file_type || (viewerType === "image" ? "jpg" : "pdf");
      const fileName = `${note.title}.${displayExt}`;

      window.open(buildTrexViewLink(fileUrl, fileName, viewerType), "_blank");
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

    async function unlikeNote(note: Note) {
    if (!session) return;
    if (liking === note.id) return;

    setLiking(note.id);

    const { error } = await supabase
      .from("note_likes")
      .delete()
      .eq("note_id", note.id)
      .eq("user_id", session.user.id);

    if (error) {
      setLiking(null);
      return alert("Unlike failed");
    }

    const newLikes = Math.max((note.likes || 0) - 1, 0);

    await supabase
      .from("notes")
      .update({ likes: newLikes })
      .eq("id", note.id);

    setLikedNotes((prev) => prev.filter((id) => id !== note.id));

    setNotes((prev) =>
      prev.map((n) =>
        n.id === note.id ? { ...n, likes: newLikes } : n
      )
    );

    setLiking(null);
  }

  // Step 1: Report button click -> open confirmation modal (no report yet)
  function askReportConfirmation(note: Note) {
    if (!session) return;

    if (reportedNotes.includes(note.id))
      return alert("Already reported!");

    if (note.uploader_id === session.user.id)
      return alert("You cannot report your own note!");

    setReportAgreed(false);
    setReportTarget(note);
  }

  function closeReportModal() {
    if (reportSubmitting) return;
    setReportTarget(null);
    setReportAgreed(false);
  }

  // Step 2: Actual report submission, only called after checkbox confirm
  async function confirmReport() {
    if (!session || !reportTarget) return;
    if (!reportAgreed) return;

    const note = reportTarget;
    setReportSubmitting(true);

    const { error } = await supabase
      .from("note_reports")
      .insert({
        note_id: note.id,
        user_id: session.user.id,
      });

    if (error) {
      setReportSubmitting(false);
      return alert("Report failed!");
    }

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

      setReportSubmitting(false);
      setReportTarget(null);
      setReportAgreed(false);
      alert("Note removed due to multiple reports!");
    } else {
      setReportSubmitting(false);
      setReportTarget(null);
      setReportAgreed(false);
      alert("Reported! ✅");
    }
  }

  const filteredBySearch = notes.filter(
    (note) =>
      (activeCategory === "All" || note.category === activeCategory) &&
      (note.title
        .toLowerCase()
        .includes(search.toLowerCase()) ||
        note.subject
          .toLowerCase()
          .includes(search.toLowerCase()))
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
      <div className="mb-4 hover: scale-102 transition-all duration-300">
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
      </div>

      {/* Category tabs */}
      <div className="mb-6 md:mb-10 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="shrink-0 rounded-xl px-4 py-2 text-xs md:text-sm font-semibold transition-colors"
            style={{
              background: activeCategory === cat ? "#8b0000" : inputBg,
              color: activeCategory === cat ? "#ffffff" : textColor,
              border,
            }}
          >
            {cat}
          </button>
        ))}
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

                const fileBadge = getFileBadge(
                  note.file_type,
                  darkMode
                );

                const accent = getSubjectAccent(note.subject);

                return (
                  <div
                    key={note.id}
                    className="relative pl-6 pr-5 py-5 md:pl-7 md:pr-6 md:py-6 rounded-2xl transition-all duration-300  overflow-hidden group"
                    style={{
                      background: cardBg,
                      border,
                      boxShadow: darkMode
                        ? "0 1px 2px rgba(0,0,0,0.3), 0 12px 28px -12px rgba(0,0,0,0.55)"
                        : "0 1px 2px rgba(139,0,0,0.05), 0 12px 28px -14px rgba(139,0,0,0.25)",
                    }}
                  >
                    {/* Subject spine — index-card tab */}
                    <div
                      className="absolute inset-y-0 left-0 w-1.25 transition-all duration-300 group-hover:w-2"
                      style={{ background: accent }}
                    />

                    {/* hover shadow tint matching subject */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{
                        boxShadow: `0 20px 40px -20px ${accent}55`,
                      }}
                    />

                    {/* Students Choice ribbon */}
                    {note.likes >= 10 && (
                      <div
                        className="absolute top-0 right-0 flex items-center gap-1 pl-3 pr-4 py-1.5 rounded-bl-2xl rounded-tr-2xl text-[10px] font-bold tracking-wide"
                        style={{
                          background:
                            "linear-gradient(135deg, #b8860b, #6b4a00)",
                          color: "#fff7d6",
                        }}
                      >
                        <Award size={11} />
                        TOP RATED
                      </div>
                    )}

                    {/* Eyebrow row: avatar + name + subject */}
                    <div className="flex items-center gap-2.5 mb-4">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                        style={{
                          background: `${accent}22`,
                          color: accent,
                          border: `1px solid ${accent}44`,
                        }}
                      >
                        {getInitials(
                          isOwn ? "You" : note.uploader_name
                        )}
                      </div>

                      <div className="min-w-0">
                        <p
                          className="text-xs font-semibold truncate"
                          style={{ color: textColor }}
                        >
                          {isOwn ? "You" : note.uploader_name}
                        </p>
                        <p
                          className="text-[10px] font-bold uppercase tracking-widest truncate"
                          style={{ color: accent }}
                        >
                          {note.subject}
                        </p>
                      </div>

                      <div
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold tracking-wide ml-auto shrink-0"
                        style={{
                          background: "transparent",
                          border: `1px solid ${fileBadge.color}55`,
                          color: fileBadge.color,
                        }}
                      >
                        <fileBadge.Icon size={11} />
                        {fileBadge.label}
                      </div>
                    </div>

                    {/* Title */}
                    <h3
                      className={`${baloo.className} text-xl md:text-2xl mb-5 leading-tight line-clamp-2`}
                      style={{
                        fontWeight: 700,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {note.title}
                    </h3>

                    {/* Actions */}
                    <div
                      className="flex items-center gap-2 pt-4"
                      style={{
                        borderTop: darkMode
                          ? "1px dashed rgba(255,255,255,0.12)"
                          : "1px dashed rgba(139,0,0,0.15)",
                      }}
                    >
                      <button
                        onClick={() =>
                          openNote(note)
                        }
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition text-xs font-semibold hover:brightness-150"
                        style={{
                          background: accent,
                          color: "#ffffff",
                        }}
                      >
                        <ExternalLink size={12} />
                        Open Note
                      </button>

                      <button
                        onClick={() =>
                          alreadyLiked
                            ? unlikeNote(note)
                            : likeNote(note)
                        }
                        disabled={
                          liking === note.id ||
                          isOwn
                        }
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition text-xs font-semibold"
                        style={{
                          background: "transparent",
                          border: darkMode
                            ? "1px solid rgba(255,255,255,0.14)"
                            : "1px solid rgba(139,0,0,0.15)",
                          color:
                            alreadyLiked
                              ? "#ef4444"
                              : subTextColor,
                          cursor:
                            alreadyLiked || isOwn
                              ? "not-allowed"
                              : "pointer",
                          opacity: isOwn ? 0.5 : 1,
                        }}
                      >
                        <Heart
                          size={12}
                          fill={
                            alreadyLiked
                              ? "#ef4444"
                              : "none"
                          }
                        />
                        {note.likes || 0}
                      </button>

                      {!isOwn && (
                        <button
                          onClick={() =>
                            askReportConfirmation(note)
                          }
                          disabled={
                            alreadyReported
                          }
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition text-xs font-semibold ml-auto"
                          style={{
                            background: "transparent",
                            color: alreadyReported
                              ? subTextColor
                              : "#ef4444",
                            cursor:
                              alreadyReported
                                ? "not-allowed"
                                : "pointer",
                            opacity: alreadyReported ? 0.6 : 1,
                          }}
                        >
                          <TriangleAlert size={12} />
                          {alreadyReported
                            ? "Reported"
                            : "Report"}
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

      {/* REPORT CONFIRMATION MODAL */}
      {reportTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
          }}
          onClick={closeReportModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl p-6 md:p-7 relative"
            style={{
              background: darkMode
                ? "linear-gradient(160deg, #1c1c1f 0%, #150505 100%)"
                : "#ffffff",
              border: darkMode
                ? "1px solid #3f0000"
                : "1px solid #ffb3b3",
              color: textColor,
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            }}
          >
            <button
              onClick={closeReportModal}
              className="absolute top-4 right-4 p-1.5 rounded-full transition hover:scale-110"
              style={{
                background: darkMode
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.05)",
              }}
            >
              <X size={16} />
            </button>

            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: "rgba(220,38,38,0.15)",
                color: "#ef4444",
              }}
            >
              <TriangleAlert size={22} />
            </div>

            <h3 className="text-xl font-bold mb-2">
              Report this note?
            </h3>

            <p
              className="text-sm mb-4 leading-relaxed"
              style={{ color: subTextColor }}
            >
              Through reports, we can remove incorrect / spam / irrelevant notes from the community. Please read these conditions carefully:
            </p>

            <ul
              className="text-sm mb-5 space-y-2 leading-relaxed"
              style={{ color: subTextColor }}
            >
              <li>• Only report genuine reasons (spam, wrong subject, offensive content, plagiarism).</li>
              <li>• If a note receives multiple reports, it will be automatically removed and the uploader will face penalties.</li>
              <li>• Fake or false reports may result in your account being reviewed.</li>
              <li>• Once a report is submitted, it cannot be undone.</li>
            </ul>

            <label
              className="flex items-start gap-2.5 mb-5 cursor-pointer select-none"
              style={{ color: textColor }}
            >
              <input
                type="checkbox"
                checked={reportAgreed}
                onChange={(e) =>
                  setReportAgreed(e.target.checked)
                }
                className="mt-1 w-4 h-4 accent-red-600 cursor-pointer"
              />
              <span className="text-sm">
                I confirm that I understand the above conditions and this report is genuine.
              </span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={closeReportModal}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition hover:scale-[1.02]"
                style={{
                  background: darkMode
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.05)",
                  color: textColor,
                }}
              >
                Cancel
              </button>

              <button
                onClick={confirmReport}
                disabled={!reportAgreed || reportSubmitting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition hover:scale-[1.02]"
                style={{
                  background:
                    !reportAgreed || reportSubmitting
                      ? darkMode
                        ? "rgba(220,38,38,0.15)"
                        : "rgba(220,38,38,0.15)"
                      : "#ef4444",
                  color:
                    !reportAgreed || reportSubmitting
                      ? "#ef4444"
                      : "#ffffff",
                  cursor:
                    !reportAgreed || reportSubmitting
                      ? "not-allowed"
                      : "pointer",
                  opacity: reportSubmitting ? 0.7 : 1,
                }}
              >
                {reportSubmitting
                  ? "Reporting..."
                  : "Confirm Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}