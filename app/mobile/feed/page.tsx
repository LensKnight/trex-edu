"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../../../src/lib/supabase";
import useAuth from "../../../src/hooks/useAuth";
import { useTheme } from "../../../src/context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  TriangleAlert,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Heart,
  Award,
  ExternalLink,
  Download,
  X,
  Search,
  Sparkles,
  Loader2,
  LayoutDashboard,
  BookOpen,
  Megaphone,
  User,
  Bell,
} from "lucide-react";
import MobileNavbar from "@/components/MobileNavbar";
import { buildTrexViewLink } from "../../../src/lib/trexview";

type Note = {
  id: string;
  title: string;
  subject: string;
  category?: string;
  file_id?: string;
  file_type?: string;
  likes: number;
  uploader_id: string;
  uploader_name?: string;
};

const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "gif", "bmp"];
const CATEGORIES = ["All", "School Notes", "Extra Notes", "TreX Special", "Projects"];

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/mobile/dashboard" },
  { label: "Notes Feed", icon: BookOpen, href: "/mobile/feed" },
  { label: "Announcements", icon: Megaphone, href: "/mobile/announcements" },
  { label: "Profile", icon: User, href: "/mobile/profile" },
];

function extFromFilePath(filePath: string): string {
  const match = filePath.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : "";
}

function inferViewerType(filePath: string, noteFileType?: string): "pdf" | "image" {
  const pathExt = extFromFilePath(filePath);
  const dbExt = (noteFileType || "").toLowerCase().replace(".", "");
  const ext = pathExt || dbExt;

  if (IMAGE_EXTS.includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (filePath.startsWith("photos/")) return "image";
  return "pdf";
}

function getFileBadge(fileType?: string, darkMode?: boolean) {
  const ext = (fileType || "").toLowerCase().replace(".", "");

  if (!ext) {
    return {
      label: "FILE",
      Icon: FileIcon,
      color: darkMode ? "#a1a1aa" : "#64748b",
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
    color: darkMode ? "#a1a1aa" : "#64748b",
  };
}

function getSubjectAccent(subject: string) {
  const map: Record<string, string> = {
    Physics: "#f97316",
    Chemistry: "#10b981",
    Mathematics: "#3b82f6",
    "Computer Science": "#a855f7",
    English: "#ec4899",
    "Physical Education": "#eab308",
  };
  return map[subject] || "#dc2626";
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
  const { darkMode } = useTheme();
  const pathname = usePathname();
  const [notes, setNotes] = useState<Note[]>([]);
  const [liking, setLiking] = useState<string | null>(null);
  const [likedNotes, setLikedNotes] = useState<string[]>([]);
  const [reportedNotes, setReportedNotes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [downloading, setDownloading] = useState<string | null>(null);

  const [reportTarget, setReportTarget] = useState<Note | null>(null);
  const [reportAgreed, setReportAgreed] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const bg = darkMode
    ? "radial-gradient(ellipse at top, #1a0808 0%, #09090b 100%)"
    : "radial-gradient(ellipse at top, #fef2f2 0%, #f8fafc 100%)";
  const textColor = darkMode ? "#f4f4f5" : "#0f172a";
  const subTextColor = darkMode ? "#a1a1aa" : "#64748b";
  const cardBg = darkMode
    ? "rgba(24, 24, 27, 0.75)"
    : "rgba(255, 255, 255, 0.85)";
  const border = darkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
  const inputBg = darkMode ? "rgba(24, 24, 27, 0.8)" : "rgba(241, 245, 249, 0.9)";
  const sidebarBg = darkMode ? "rgba(9, 9, 11, 0.9)" : "rgba(255, 255, 255, 0.9)";

  useEffect(() => {
    if (!loading && session) {
      fetchNotes();
      fetchLikedNotes();
      fetchReportedNotes();
    }
  }, [loading, session]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel("mobile-notes-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notes" }, async () => await fetchNotes())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notes" }, async () => await fetchNotes())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notes" }, async () => await fetchNotes())
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
    const { data: profile } = await supabase.from("profiles").select("class_name, section").eq("id", user.id).single();
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

      const viewerTypeGuess = inferViewerType(filePath, note.file_type);
      const pathExt = extFromFilePath(filePath);
      const displayExt = pathExt || note.file_type || (viewerTypeGuess === "image" ? "jpg" : "pdf");
      const fileName = `${note.title}.${displayExt}`;

      window.open(buildTrexViewLink(fileUrl, fileName, viewerTypeGuess), "_blank");
    } catch (err) {
      console.log(err);
      alert("Open failed");
    }
  };

  async function downloadNote(note: Note) {
    if (!note.file_id) return alert("File not found");
    if (downloading === note.id) return;

    setDownloading(note.id);

    try {
      const res = await fetch(`/api/download?file_id=${note.file_id}`);
      if (!res.ok) throw new Error("Server error");

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const ext = note.file_type || "pdf";
      const fileName = `${note.title}.${ext}`;

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.log(err);
      alert("Download failed");
    } finally {
      setDownloading(null);
    }
  }

  async function likeNote(note: Note) {
    if (!session || liking === note.id) return;
    setLiking(note.id);
    const { error } = await supabase.from("note_likes").insert({ note_id: note.id, user_id: session.user.id });
    if (error) {
      setLiking(null);
      return;
    }
    const newLikes = (note.likes || 0) + 1;
    await supabase.from("notes").update({ likes: newLikes }).eq("id", note.id);
    setLikedNotes((prev) => [...prev, note.id]);
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, likes: newLikes } : n)));
    setLiking(null);
  }

  async function unlikeNote(note: Note) {
    if (!session || liking === note.id) return;

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

    await supabase.from("notes").update({ likes: newLikes }).eq("id", note.id);

    setLikedNotes((prev) => prev.filter((id) => id !== note.id));
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, likes: newLikes } : n)));

    setLiking(null);
  }

  function askReportConfirmation(note: Note) {
    if (!session) return;

    if (reportedNotes.includes(note.id)) return alert("Already reported!");

    if (note.uploader_id === session.user.id) return alert("Apna note report nahi kar sakte!");

    setReportAgreed(false);
    setReportTarget(note);
  }

  function closeReportModal() {
    if (reportSubmitting) return;
    setReportTarget(null);
    setReportAgreed(false);
  }

  async function confirmReport() {
    if (!session || !reportTarget || !reportAgreed) return;

    const note = reportTarget;
    setReportSubmitting(true);

    const { error } = await supabase.from("note_reports").insert({ note_id: note.id, user_id: session.user.id });

    if (error) {
      setReportSubmitting(false);
      return alert("Report failed!");
    }

    setReportedNotes((prev) => [...prev, note.id]);

    const { count } = await supabase
      .from("note_reports")
      .select("*", { count: "exact", head: true })
      .eq("note_id", note.id);

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

  const filteredBySearch = notes.filter(
    (note) =>
      (activeCategory === "All" || note.category === activeCategory) &&
      (note.title.toLowerCase().includes(search.toLowerCase()) ||
        note.subject.toLowerCase().includes(search.toLowerCase()))
  );

  const subjects = ["Physics", "Chemistry", "Mathematics", "Computer Science", "English", "Physical Education"];

  return (
    <div className="min-h-screen flex transition-colors duration-300" style={{ background: bg, color: textColor }}>
      {/* Desktop sidebar */}
      <aside
        className="w-64 hidden md:flex flex-col justify-between p-4 sticky top-0 h-screen border-r backdrop-blur-xl shrink-0"
        style={{ background: sidebarBg, borderColor: border }}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-3 py-2">
            <span className="font-extrabold text-lg tracking-tight">TreX Edu</span>
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: isActive ? "rgba(220, 38, 38, 0.1)" : "transparent",
                    color: isActive ? "#ef4444" : subTextColor,
                    border: isActive ? "1px solid rgba(220, 38, 38, 0.2)" : "1px solid transparent",
                  }}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div
          className="border-t pt-4 px-2 flex items-center justify-between"
          style={{ borderColor: border }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white"
              style={{ background: "linear-gradient(135deg, #ef4444, #991b1b)" }}
            >
              {getInitials(session?.user?.user_metadata?.full_name)}
            </div>
            <div className="text-xs">
              <p className="font-bold leading-none">Student</p>
              <p className="text-[10px] mt-0.5" style={{ color: subTextColor }}>
                TreX Edu
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 pb-28 md:pb-8">
        {loading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
            <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-2" />
            <div className="text-sm font-medium tracking-wide text-zinc-300">Loading Notes...</div>
          </div>
        )}

        {/* Mobile top bar — brand + notifications, sticky */}
        <div
          className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b backdrop-blur-xl"
          style={{ background: sidebarBg, borderColor: border }}
        >
          <div className="flex items-center gap-2.5">
            <span className="font-extrabold text-base tracking-tight">TreX Edu</span>
          </div>

          <button
            className="relative p-2 rounded-full border"
            style={{ borderColor: border, background: cardBg }}
          >
            <Bell size={15} style={{ color: subTextColor }} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
          </button>
        </div>

        {/* Header */}
        <div className="p-4 pt-6 max-w-lg md:max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                <Sparkles size={10} /> Community Hub
              </span>
              <h1 className="text-2xl mt-1 font-bold tracking-tight">Notes Feed</h1>
            </div>
          </div>
        </div>

        {/* Handwriting disclaimer */}
        <div className="px-4 mb-4 max-w-lg md:max-w-3xl mx-auto">
          <div
            className="flex items-start gap-2.5 p-3 rounded-2xl text-xs leading-relaxed backdrop-blur-md"
            style={{
              background: darkMode ? "rgba(239, 68, 68, 0.08)" : "rgba(239, 68, 68, 0.05)",
              border: darkMode ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(239, 68, 68, 0.15)",
              color: subTextColor,
            }}
          >
            <TriangleAlert size={15} className="shrink-0 mt-0.5 text-red-500" />
            <span>
              Notes are contributed by students — double check details before relying on them completely.
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 mb-4 max-w-lg md:max-w-3xl mx-auto">
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search notes or subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl outline-none text-xs font-medium transition-all duration-200 border"
              style={{
                background: inputBg,
                color: textColor,
                borderColor: border,
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div
          className="flex gap-2 overflow-x-auto px-4 mb-6 pb-1 [&::-webkit-scrollbar]:hidden max-w-lg md:max-w-3xl mx-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-200"
                style={{
                  background: isActive ? "#dc2626" : inputBg,
                  color: isActive ? "#ffffff" : subTextColor,
                  border: isActive ? "1px solid #ef4444" : `1px solid ${border}`,
                  boxShadow: isActive ? "0 4px 12px rgba(220, 38, 38, 0.25)" : "none",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Notes Horizontal Rows */}
        <div className="max-w-lg md:max-w-3xl mx-auto">
          {subjects.map((subject) => {
            const filteredNotes = filteredBySearch.filter((note) => note.subject === subject);
            if (filteredNotes.length === 0) return null;

            const accent = getSubjectAccent(subject);

            return (
              <div key={subject} className="mb-6">
                <div className="flex items-center justify-between px-4 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
                    <h2 className="text-sm font-bold tracking-tight">{subject}</h2>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      color: subTextColor,
                      background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                    }}
                  >
                    {filteredNotes.length} {filteredNotes.length === 1 ? "Note" : "Notes"}
                  </span>
                </div>

                {/* Horizontal snap-scroll row */}
                <div
                  className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory px-4 pb-3 [&::-webkit-scrollbar]:hidden"
                  style={{ scrollbarWidth: "none" }}
                >
                  {filteredNotes.map((note) => {
                    const alreadyLiked = likedNotes.includes(note.id);
                    const alreadyReported = reportedNotes.includes(note.id);
                    const isOwn = note.uploader_id === session?.user.id;
                    const fileBadge = getFileBadge(note.file_type, darkMode);

                    return (
                      <motion.div
                        key={note.id}
                        whileHover={{ y: -2 }}
                        className="relative shrink-0 snap-start w-[75vw] max-w-[270px] p-4 rounded-3xl overflow-hidden backdrop-blur-xl transition-all"
                        style={{
                          background: cardBg,
                          border: `1px solid ${border}`,
                          boxShadow: darkMode
                            ? "0 10px 30px -10px rgba(0,0,0,0.5)"
                            : "0 10px 25px -10px rgba(0,0,0,0.08)",
                        }}
                      >
                        {/* Top Accent Strip */}
                        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: accent }} />

                        {/* Top ribbon if likes >= 10 */}
                        {note.likes >= 10 && (
                          <div
                            className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide"
                            style={{
                              background: "linear-gradient(135deg, #f59e0b, #d97706)",
                              color: "#ffffff",
                            }}
                          >
                            <Award size={10} /> TOP
                          </div>
                        )}

                        {/* Header info */}
                        <div className="flex items-center gap-2 mb-3 mt-1">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{
                              background: `${accent}18`,
                              color: accent,
                              border: `1px solid ${accent}33`,
                            }}
                          >
                            {getInitials(isOwn ? "You" : note.uploader_name)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold truncate" style={{ color: textColor }}>
                              {isOwn ? "You" : note.uploader_name}
                            </p>
                            <p className="text-[9px] font-bold uppercase tracking-wider truncate" style={{ color: accent }}>
                              {note.category}
                            </p>
                          </div>

                          <div
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold"
                            style={{
                              background: `${fileBadge.color}15`,
                              color: fileBadge.color,
                              border: `1px solid ${fileBadge.color}30`,
                            }}
                          >
                            <fileBadge.Icon size={10} />
                            {fileBadge.label}
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-xs font-bold mb-4 line-clamp-2 h-8 leading-snug" style={{ color: textColor }}>
                          {note.title}
                        </h3>

                        {/* Actions */}
                        <div
                          className="flex items-center gap-1.5 pt-2.5"
                          style={{ borderTop: `1px border-dashed ${border}` }}
                        >
                          <button
                            onClick={() => openNote(note)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold active:scale-95 transition-transform"
                            style={{ background: accent, color: "#ffffff" }}
                          >
                            <ExternalLink size={11} /> Open
                          </button>

                          <button
                            onClick={() => downloadNote(note)}
                            disabled={downloading === note.id}
                            className="p-1.5 rounded-xl border transition-all active:scale-95"
                            style={{
                              borderColor: border,
                              color: textColor,
                              opacity: downloading === note.id ? 0.5 : 1,
                            }}
                          >
                            {downloading === note.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Download size={12} />
                            )}
                          </button>

                          <button
                            onClick={() => (alreadyLiked ? unlikeNote(note) : likeNote(note))}
                            disabled={liking === note.id || isOwn}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-semibold border transition-all active:scale-95"
                            style={{
                              borderColor: border,
                              color: alreadyLiked ? "#ef4444" : subTextColor,
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
                              className="p-1.5 rounded-xl ml-auto transition-colors"
                              style={{
                                color: alreadyReported ? subTextColor : "#ef4444",
                                opacity: alreadyReported ? 0.4 : 1,
                              }}
                            >
                              <TriangleAlert size={12} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredBySearch.length === 0 && search && (
            <div className="text-center py-16 px-4">
              <Search size={32} className="mx-auto mb-2 text-zinc-400 opacity-60" />
              <p className="text-xs font-semibold" style={{ color: subTextColor }}>
                No notes matched "{search}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* REPORT CONFIRMATION MODAL */}
      <AnimatePresence>
        {reportTarget && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeReportModal}
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 z-10 backdrop-blur-2xl"
              style={{
                background: darkMode ? "rgba(18, 18, 20, 0.95)" : "rgba(255, 255, 255, 0.95)",
                border: `1px solid ${border}`,
                color: textColor,
              }}
            >
              <div className="w-10 h-1 bg-zinc-500/30 rounded-full mx-auto mb-4" />

              <button
                onClick={closeReportModal}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-zinc-500/10 transition"
              >
                <X size={16} />
              </button>

              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3 bg-red-500/10 text-red-500 border border-red-500/20">
                <TriangleAlert size={20} />
              </div>

              <h3 className="text-lg font-bold mb-1">Report Note</h3>
              <p className="text-xs mb-3 leading-relaxed" style={{ color: subTextColor }}>
                Help clean up invalid content. Please read the terms carefully:
              </p>

              <ul className="text-xs mb-4 space-y-1.5 list-disc pl-4" style={{ color: subTextColor }}>
                <li>Report only genuine issues (spam, offensive, wrong subject).</li>
                <li>Multiple reports cause automatic content removal.</li>
                <li>Misuse of reports may affect your account standing.</li>
              </ul>

              <label className="flex items-start gap-2.5 mb-5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={reportAgreed}
                  onChange={(e) => setReportAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-red-600 rounded"
                />
                <span className="text-xs" style={{ color: textColor }}>
                  I confirm this report is truthful and accurate.
                </span>
              </label>

              <div className="flex gap-2.5">
                <button
                  onClick={closeReportModal}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition bg-zinc-500/10 hover:bg-zinc-500/20"
                >
                  Cancel
                </button>

                <button
                  onClick={confirmReport}
                  disabled={!reportAgreed || reportSubmitting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition text-white bg-red-600 disabled:opacity-50"
                >
                  {reportSubmitting ? "Submitting..." : "Confirm Report"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="md:hidden">
        <MobileNavbar darkMode={darkMode} subTextColor={subTextColor} border={border} />
      </div>
    </div>
  );
}