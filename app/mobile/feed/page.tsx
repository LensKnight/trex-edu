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
  TriangleAlert,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Heart,
  Award,
  ExternalLink,
  X,
} from "lucide-react";
import MobileNavbar from "@/components/MobileNavbar";

type Note = {
  id: string;
  title: string;
  subject: string;
  file_id?: string;
  file_type?: string; // e.g. "pdf", "jpg", "png" — populated from DB if column exists
  likes: number;
  uploader_id: string;
  uploader_name?: string;
};

// Returns badge info (label + icon + colors) based on file extension
function getFileBadge(fileType?: string, darkMode?: boolean) {
  const ext = (fileType || "").toLowerCase().replace(".", "");

  if (!ext) {
    return {
      label: "FILE",
      Icon: FileIcon,
      color: darkMode ? "#d4d4d8" : "#52525b",
    };
  }

  if (ext === "pdf") {
    return {
      label: "PDF",
      Icon: FileText,
      color: "#ef4444",
    };
  }

  if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return {
      label: "IMG",
      Icon: ImageIcon,
      color: "#3b82f6",
    };
  }

  return {
    label: ext.toUpperCase(),
    Icon: FileIcon,
    color: darkMode ? "#d4d4d8" : "#52525b",
  };
}

// Distinct accent color per subject — used as the card's "index tab" spine
function getSubjectAccent(subject: string) {
  const map: Record<string, string> = {
    Physics: "#f97316",
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
      setNotes(
        data.map((n: any) => ({
          ...n,
          uploader_name: n.profiles?.full_name || "Unknown",
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
      return alert("Apna note report nahi kar sakte!");

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

    const { error } = await supabase.from("note_reports").insert({ note_id: note.id, user_id: session.user.id });

    if (error) {
      setReportSubmitting(false);
      return alert("Report failed!");
    }

    setReportedNotes((prev) => [...prev, note.id]);

    const { count } = await supabase.from("note_reports").select("*", { count: "exact", head: true }).eq("note_id", note.id);

    if ((count ?? 0) >= 10) {
      await supabase.from("notes").delete().eq("id", note.id);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
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

  const filteredBySearch = notes.filter((note) =>
    note.title.toLowerCase().includes(search.toLowerCase()) ||
    note.subject.toLowerCase().includes(search.toLowerCase())
  );

  const subjects = ["Physics","Chemistry","Mathematics","Computer Science","English","Physical Education"];

  return (
    <div className="min-h-screen pb-24 transition-all duration-500" style={{background: bg, color: textColor}}>
        {loading && (
          <div className="loading-screen">
            <img src="/toggle-icon.png" className="loading-x" alt="loading" />
            <div className="loading-text">Loading Notes</div>
          </div>
        )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-6">
        <div>
          <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{color: subTextColor}}>Community</p>
          <h1
            className="text-2xl"
            style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700 }}
          >
            Notes Feed
          </h1>
          <div className="mt-1 h-0.5 w-12 rounded-full" style={{background: "linear-gradient(90deg, #8b0000, transparent)"}} />
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-5">
        <input
          type="text"
          placeholder="🔍 Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 rounded-2xl outline-none"
          style={{background: inputBg, color: textColor, border}}
        />
      </div>

      {/* Notes — horizontal scroll rows per subject */}
      <div>
        {subjects.map((subject) => {
          const filteredNotes = filteredBySearch.filter((note) => note.subject === subject);
          if (filteredNotes.length === 0) return null;

          const accent = getSubjectAccent(subject);

          return (
            <div key={subject} className="mb-7">
              <div className="flex items-center gap-2 px-4 mb-3">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: accent }}
                />
                <h2 className="text-base font-bold">{subject}</h2>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    color: subTextColor,
                    background: darkMode
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(139,0,0,0.06)",
                  }}
                >
                  {filteredNotes.length}
                </span>
              </div>

              {/* Horizontal snap-scroll row */}
              <div
                className="flex gap-3 overflow-x-auto snap-x snap-mandatory pl-4 pr-4 pb-2 [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: "none" }}
              >
                {filteredNotes.map((note) => {
                  const alreadyLiked = likedNotes.includes(note.id);
                  const alreadyReported = reportedNotes.includes(note.id);
                  const isOwn = note.uploader_id === session?.user.id;
                  const fileBadge = getFileBadge(note.file_type, darkMode);

                  return (
                    <div
                      key={note.id}
                      className="relative shrink-0 snap-start w-[72vw] max-w-[280px] pl-5 pr-4 py-4 rounded-2xl overflow-hidden active:scale-[0.98] transition-transform duration-150"
                      style={{
                        background: cardBg,
                        border,
                        boxShadow: darkMode
                          ? "0 1px 2px rgba(0,0,0,0.3), 0 10px 22px -12px rgba(0,0,0,0.55)"
                          : "0 1px 2px rgba(139,0,0,0.05), 0 10px 22px -14px rgba(139,0,0,0.25)",
                      }}
                    >
                      {/* Subject spine — index-card tab */}
                      <div
                        className="absolute inset-y-0 left-0 w-[4px]"
                        style={{ background: accent }}
                      />

                      {/* Students Choice ribbon */}
                      {note.likes >= 10 && (
                        <div
                          className="absolute top-0 right-0 flex items-center gap-1 pl-2.5 pr-3 py-1 rounded-bl-xl rounded-tr-2xl text-[9px] font-bold tracking-wide"
                          style={{
                            background: "linear-gradient(135deg, #b8860b, #6b4a00)",
                            color: "#fff7d6",
                          }}
                        >
                          <Award size={10} />
                          TOP
                        </div>
                      )}

                      {/* Eyebrow: avatar + name + subject */}
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{
                            background: `${accent}22`,
                            color: accent,
                            border: `1px solid ${accent}44`,
                          }}
                        >
                          {getInitials(isOwn ? "You" : note.uploader_name)}
                        </div>

                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold truncate" style={{ color: textColor }}>
                            {isOwn ? "You" : note.uploader_name}
                          </p>
                          <p
                            className="text-[9px] font-bold uppercase tracking-widest truncate"
                            style={{ color: accent }}
                          >
                            {note.subject}
                          </p>
                        </div>

                        <div
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold ml-auto shrink-0"
                          style={{
                            border: `1px solid ${fileBadge.color}55`,
                            color: fileBadge.color,
                          }}
                        >
                          <fileBadge.Icon size={10} />
                          {fileBadge.label}
                        </div>
                      </div>

                      {/* Title */}
                      <h3
                        className="text-base mb-4 leading-snug line-clamp-2"
                        style={{
                          fontFamily: "'Baloo 2', sans-serif",
                          fontWeight: 700,
                        }}
                      >
                        {note.title}
                      </h3>

                      {/* Actions */}
                      <div
                        className="flex items-center gap-1.5 pt-3"
                        style={{
                          borderTop: darkMode
                            ? "1px dashed rgba(255,255,255,0.12)"
                            : "1px dashed rgba(139,0,0,0.15)",
                        }}
                      >
                        <button
                          onClick={() => openNote(note.file_id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                          style={{ background: accent, color: "#ffffff" }}
                        >
                          <ExternalLink size={11} />
                          Open
                        </button>

                        <button
                          onClick={() => likeNote(note)}
                          disabled={liking === note.id || isOwn}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
                          style={{
                            background: "transparent",
                            border: darkMode
                              ? "1px solid rgba(255,255,255,0.14)"
                              : "1px solid rgba(139,0,0,0.15)",
                            color: alreadyLiked ? "#ef4444" : subTextColor,
                            cursor: alreadyLiked || isOwn ? "not-allowed" : "pointer",
                            opacity: isOwn ? 0.5 : 1,
                          }}
                        >
                          <Heart size={11} fill={alreadyLiked ? "#ef4444" : "none"} />
                          {note.likes || 0}
                        </button>

                        {!isOwn && (
                          <button
                            onClick={() => askReportConfirmation(note)}
                            disabled={alreadyReported}
                            className="flex items-center justify-center p-1.5 rounded-lg ml-auto"
                            style={{
                              color: alreadyReported ? subTextColor : "#ef4444",
                              cursor: alreadyReported ? "not-allowed" : "pointer",
                              opacity: alreadyReported ? 0.6 : 1,
                            }}
                          >
                            <TriangleAlert size={13} />
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
          <div className="text-center mt-20 px-4">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm font-bold" style={{color: subTextColor}}>No notes found for "{search}"</p>
          </div>
        )}
      </div>

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
            className="w-full max-w-md rounded-t-3xl p-6 relative"
            style={{
              background: darkMode
                ? "linear-gradient(160deg, #1c1c1f 0%, #150505 100%)"
                : "#ffffff",
              border: darkMode
                ? "1px solid #3f0000"
                : "1px solid #ffb3b3",
              color: textColor,
              boxShadow: "0 -10px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }} />

            <button
              onClick={closeReportModal}
              className="absolute top-4 right-4 p-1.5 rounded-full transition"
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
                onChange={(e) => setReportAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 accent-red-600 cursor-pointer"
              />
              <span className="text-sm">
                I confirm that I understand the above conditions and this report is genuine.
              </span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={closeReportModal}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition"
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
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
                style={{
                  background:
                    !reportAgreed || reportSubmitting
                      ? "rgba(220,38,38,0.15)"
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
                {reportSubmitting ? "Reporting..." : "Confirm Report"}
              </button>
            </div>
          </div>
        </div>
      )}

     <MobileNavbar
        darkMode={darkMode}
        subTextColor={subTextColor}
        border={border}
      /> 
    </div>
  );
}