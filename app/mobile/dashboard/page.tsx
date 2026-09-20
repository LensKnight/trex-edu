"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../src/lib/supabase";
import useAuth from "../../../src/hooks/useAuth";
import { useTheme } from "../../../src/context/ThemeContext";
import {
  Megaphone,
  FileText,
  Zap,
  Heart,
  Trophy,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  BookOpen,
  User,
  Settings,
  Bell,
  Calendar,
  Clock,
  BookMarked,
  Flame,
} from "lucide-react";
import MobileNavbar from "@/components/MobileNavbar";

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

type Exam = {
  id: string;
  title: string;
  subject: string;
  date: string;
  time: string;
  topics: string[];
};

// Distinct accent color per subject — reused for icons, spines and badges
function getSubjectAccent(subject: string) {
  const map: Record<string, string> = {
    Physics: "#f97316",
    Chemistry: "#22c55e",
    Mathematics: "#3b82f6",
    "Computer Science": "#a855f7",
    English: "#ec4899",
    "Physical Education": "#eab308",
  };
  return map[subject] || "#ef4444";
}

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function DesktopThemeDashboardPage() {
  const { session, loading } = useAuth();
  const { darkMode } = useTheme();

  const [notesCount, setNotesCount] = useState(0);
  const [xp, setXp] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [fullName, setFullName] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Toggle State: 'notes' or 'exams'
  const [activeTab, setActiveTab] = useState<"notes" | "exams">("notes");

  // Sample Upcoming Exams Data (Replace or Sync with Supabase)
  const [upcomingExams] = useState<Exam[]>([
    {
      id: "1",
      title: "Mid-Term Physics Exam",
      subject: "Physics",
      date: "Sep 21, 2026",
      time: "8:15 AM - 11:15 PM",
      topics: [
          "Electric Charges and Fields",
          "Electrostatic Potential and Capacitance",
          "Current Electricity",
          "Moving Charges and Magnetism",
          "Magnetism and Matter",
          "Electromagnetic Induction",
          "Alternating Current",
          "Ray Optics (till Lenses)"
        ],
    },
    {
      id: "2",
      title: "Mid-Term English Exam",
      subject: "English",
      date: "Sep 23, 2026",
      time: "8:15 AM - 11:15 AM",
      topics: [
        "The Last Lesson",
        "Lost Spring",
        "Deep Water",
        "The Rattrap",
        "Indigo",
        "My Mother at Sixty-Six",
        "Keeping Quiet",
        "A Roadside Stand",
        "The Third Level",
        "The Tiger King",
        "Journey to the End of the Earth",
        "The Enemy"
      ],
    },
    {
      id: "3",
      title: "Mid-Term Computer Science Exam",
      subject: "Computer Science",
      date: "Sep 25, 2026",
      time: "8:15 AM - 11:15 PM",
      topics: ["Python (class notes)", "SQL (class notes)", "RDBMS (class notes)"],
    },
      {
      id: "4",
      title: "Mid-Term Physical Education Exam",
      subject: "Physical Education",
      date: "Sep 28, 2026",
      time: "8:15 AM - 11:15 PM",
      topics: ["Chapter 1-6",],
    },
      {
      id: "5",
      title: "Mid-Term Mathematics Exam",
      subject: "Mathematics",
      date: "Sep 30, 2026",
      time: "8:15 AM - 11:15 PM",
      topics: [
        "Relations and Functions",
        "Inverse Trigonometric Functions",
        "Matrices",
        "Determinants",
        "Continuity and Differentiability",
        "Application of Derivatives",
        "Integrals"
      ],
    },
      {
      id: "6",
      title: "Mid-Term Chemistry Exam",
      subject: "Chemistry",
      date: "Oct 05, 2026",
      time: "8:15 AM - 11:15 PM",
      topics: [
        "Solutions",
        "Electrochemistry",
        "Chemical Kinetics",
        "The d- and f-Block Elements",
        "Coordination Compounds",
        "The Haloalkanes and Haloarenes",
      ],
    },
  ]);

  const subjects = [
    "Physics",
    "Chemistry",
    "Mathematics",
    "Computer Science",
    "English",
    "Physical Education",
  ];

  const bgClass = darkMode
    ? "bg-[#09090b] text-zinc-100"
    : "bg-zinc-50 text-zinc-900";

  const cardBgClass = darkMode
    ? "bg-zinc-900/60 border-zinc-800/80 backdrop-blur-xl"
    : "bg-white/80 border-zinc-200/80 backdrop-blur-xl shadow-sm";

  const sidebarBgClass = darkMode
    ? "bg-zinc-950/80 border-zinc-800/60"
    : "bg-white border-zinc-200";

  const mobileTopBarClass = darkMode
    ? "bg-zinc-950/80 border-zinc-800/60 backdrop-blur-xl"
    : "bg-white/80 border-zinc-200 backdrop-blur-xl";

  const subTextClass = darkMode ? "text-zinc-400" : "text-zinc-500";

  useEffect(() => {
    if (!loading && session) {
      fetchStats();
      fetchLeaderboard();
    }
  }, [loading, session]);

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("desktop-dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notes" },
        async () => {
          await fetchStats();
          await fetchLeaderboard();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notes" },
        async () => {
          await fetchStats();
          await fetchLeaderboard();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notes" },
        async () => {
          await fetchStats();
          await fetchLeaderboard();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
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
      setTotalLikes(notesData.reduce((sum, n) => sum + (n.likes || 0), 0));
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("xp, full_name")
      .eq("id", session!.user.id)
      .single();

    setXp(profileData?.xp || 0);
    setFullName((profileData?.full_name || "").split(" ")[0]);
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

      if (deleteTarget.file_url?.includes("/materials/")) {
        fileName = deleteTarget.file_url.split("/materials/")[1];
      }

      if (fileName) {
        await supabase.storage.from("materials").remove([fileName]);
      }

      const { error: dbError } = await supabase
        .from("notes")
        .delete()
        .eq("id", deleteTarget.id);

      if (dbError) {
        return alert("Delete failed: " + dbError.message);
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("xp")
        .eq("id", session!.user.id)
        .single();

      const newXp = Math.max((profileData?.xp || 0) - 20, 0);

      await supabase
        .from("profiles")
        .update({ xp: newXp })
        .eq("id", session!.user.id);

      setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      setNotesCount((prev) => prev - 1);
      setTotalLikes((prev) => prev - (deleteTarget.likes || 0));
      setXp(newXp);
      setDeleteTarget(null);
    } catch {
      alert("Something went wrong while deleting");
    }
  }

  const statCards = [
    {
      label: "Uploaded Notes",
      value: notesCount,
      icon: FileText,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Total XP",
      value: xp,
      icon: Zap,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Total Likes",
      value: totalLikes,
      icon: Heart,
      color: "text-red-400 bg-red-500/10 border-red-500/20",
    },
  ];

  return (
    <div className={`min-h-screen flex ${bgClass}`}>
      {/* Desktop Navigation Sidebar */}
      <aside
        className={`w-64 border-r hidden md:flex flex-col justify-between p-4 sticky top-0 h-screen ${sidebarBgClass}`}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-3 py-2">
            <span className="font-extrabold text-lg tracking-tight">TreX Edu</span>
          </div>

          <nav className="space-y-1">
            {[
              { label: "Dashboard", icon: LayoutDashboard, href: "/mobile/dashboard" },
              { label: "Materials", icon: BookOpen, href: "/mobile/feed" },
              { label: "Announcements", icon: Megaphone, href: "/mobile/announcements" },
              { label: "Profile", icon: User, href: "/mobile/profile" },
            ].map((item) => {
              const pathname = usePathname();
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? darkMode
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : "bg-red-50 text-red-600 border border-red-200"
                      : `${subTextClass} hover:bg-zinc-800/40 hover:text-zinc-200`
                  }`}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-zinc-800/60 pt-4 px-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center font-bold text-xs text-white">
              {getInitials(fullName)}
            </div>
            <div className="text-xs">
              <p className="font-bold leading-none">{fullName}</p>
              <p className={`text-[10px] mt-0.5 ${subTextClass}`}>Student</p>
            </div>
          </div>
          <button className={`p-2 rounded-lg hover:bg-zinc-800/50 ${subTextClass}`}>
            <Settings size={15} />
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile top bar — brand + notifications, sticky */}
        <div
          className={`md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b ${mobileTopBarClass}`}
        >
          <div className="flex items-center gap-2.5">
            <span className="font-extrabold text-base tracking-tight">TreX Edu</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              className={`relative p-2 rounded-full border transition-all ${cardBgClass}`}
            >
              <Bell size={15} className={subTextClass} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
            </button>

          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
            <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            <span className="mt-4 text-xs font-semibold text-zinc-400">
              Loading Dashboard...
            </span>
          </div>
        ) : (
          <main className="max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6 md:space-y-8 pb-28 md:pb-8">
            {/* Header Bar */}
            <header className="hidden md:flex flex-row items-center justify-between gap-4 border-b border-zinc-800/40 pb-6">
              <div>
                <p
                  className={`text-xs font-medium uppercase tracking-wider ${subTextClass}`}
                >
                  Overview
                </p>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">
                  Welcome back, <span className="text-red-500">{fullName}</span> 👋
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <button
                  className={`p-2.5 rounded-xl border transition-all ${cardBgClass} hover:border-zinc-700`}
                >
                  <Bell size={16} className={subTextClass} />
                </button>
                <a
                  href="/mobile/announcements"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-all shadow-md shadow-red-900/20"
                >
                  <Megaphone size={15} />
                  <span>Announcements</span>
                </a>
              </div>
            </header>

            {/* Mobile greeting + XP hero card */}
            <div
              className={`md:hidden rounded-3xl p-5 border overflow-hidden relative ${cardBgClass}`}
              style={{
                backgroundImage: darkMode
                  ? "radial-gradient(120% 100% at 100% 0%, rgba(239,68,68,0.12), transparent 60%)"
                  : "radial-gradient(120% 100% at 100% 0%, rgba(239,68,68,0.08), transparent 60%)",
              }}
            >
              <p className={`text-[11px] font-semibold uppercase tracking-widest ${subTextClass}`}>
                Welcome back
              </p>
              <h1 className="text-xl font-extrabold tracking-tight mt-0.5">
                {fullName} 👋
              </h1>

              <div className="flex items-center gap-2 mt-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <Zap size={13} className="text-amber-400" />
                  <span className="text-xs font-bold text-amber-400">{xp} XP</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                  <Heart size={13} className="text-red-400" />
                  <span className="text-xs font-bold text-red-400">{totalLikes} Likes</span>
                </div>
              </div>

              <a
                href="/mobile/announcements"
                className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-semibold bg-red-600 text-white active:scale-[0.98] transition-all shadow-md shadow-red-900/20"
              >
                <Megaphone size={14} />
                <span>View Announcements</span>
              </a>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              <div className="lg:col-span-2 space-y-6 md:space-y-8">
                {/* Stats — horizontal snap row on mobile, grid on desktop */}
                <div
                  className="flex md:grid md:grid-cols-3 gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory pb-1 md:pb-0 [&::-webkit-scrollbar]:hidden"
                  style={{ scrollbarWidth: "none" }}
                >
                  {statCards.map((stat) => (
                    <div
                      key={stat.label}
                      className={`shrink-0 snap-start w-[42vw] md:w-auto p-4 md:p-5 rounded-2xl border transition-all hover:scale-[1.01] ${cardBgClass}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] md:text-xs font-medium ${subTextClass}`}>
                          {stat.label}
                        </span>
                        <div className={`p-1.5 md:p-2 rounded-xl border ${stat.color}`}>
                          <stat.icon size={14} className="md:hidden" />
                          <stat.icon size={16} className="hidden md:block" />
                        </div>
                      </div>
                      <p className="text-2xl md:text-3xl font-extrabold mt-2 md:mt-3">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Section with Toggle Switcher */}
                <section className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                    <h2 className="text-base md:text-lg font-bold">
                      {activeTab === "notes" ? "My Notes" : "Upcoming Exams"}
                    </h2>

                    {/* Toggle Switch — full width on mobile */}
                    <div className="flex sm:inline-flex p-1 rounded-xl border border-zinc-800 bg-zinc-950/60 self-stretch sm:self-auto">
                      <button
                        onClick={() => setActiveTab("notes")}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          activeTab === "notes"
                            ? "bg-red-600 text-white shadow-sm"
                            : `${subTextClass} hover:text-zinc-200`
                        }`}
                      >
                        <FileText size={14} />
                        <span>My Notes</span>
                      </button>

                      <button
                        onClick={() => setActiveTab("exams")}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          activeTab === "exams"
                            ? "bg-red-600 text-white shadow-sm"
                            : `${subTextClass} hover:text-zinc-200`
                        }`}
                      >
                        <Calendar size={14} />
                        <span>Upcoming Exams</span>
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: MY NOTES VIEW */}
                  {activeTab === "notes" && (
                    <div className="space-y-3">
                      {subjects.map((subject) => {
                        const subjectNotes = notes.filter(
                          (n) => n.subject === subject
                        );

                        if (subjectNotes.length === 0) return null;

                        const isOpen = openSubject === subject;
                        const accent = getSubjectAccent(subject);

                        return (
                          <div
                            key={subject}
                            className={`rounded-2xl border overflow-hidden transition-all relative ${cardBgClass}`}
                          >
                            <div
                              className="absolute inset-y-0 left-0 w-[3px]"
                              style={{ background: accent }}
                            />
                            <button
                              onClick={() =>
                                setOpenSubject(isOpen ? null : subject)
                              }
                              className="w-full flex items-center justify-between p-4 pl-5 hover:bg-zinc-800/20 transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="p-2 rounded-lg"
                                  style={{
                                    background: `${accent}1a`,
                                    color: accent,
                                  }}
                                >
                                  <FileText size={16} />
                                </div>
                                <span className="text-sm font-semibold">
                                  {subject}
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <span
                                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium border border-zinc-700/50 ${subTextClass}`}
                                >
                                  {subjectNotes.length}{" "}
                                  {subjectNotes.length === 1 ? "File" : "Files"}
                                </span>
                                {isOpen ? (
                                  <ChevronUp size={16} className={subTextClass} />
                                ) : (
                                  <ChevronDown
                                    size={16}
                                    className={subTextClass}
                                  />
                                )}
                              </div>
                            </button>

                            {isOpen && (
                              <div className="p-4 border-t border-zinc-800/40 bg-zinc-950/20">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {subjectNotes.map((note) => (
                                    <div
                                      key={note.id}
                                      className="p-3.5 rounded-xl border border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700 flex items-center justify-between gap-3 transition-all"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-xs truncate">
                                          {note.title}
                                        </p>
                                        <p
                                          className={`text-[11px] mt-1 flex items-center gap-1 ${subTextClass}`}
                                        >
                                          <Heart
                                            size={11}
                                            className="text-red-500 fill-red-500"
                                          />
                                          {note.likes || 0} Likes
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <a
                                          href={note.file_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1 transition-colors"
                                        >
                                          <span>View</span>
                                          <ExternalLink size={12} />
                                        </a>

                                        <button
                                          onClick={() => setDeleteTarget(note)}
                                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TAB 2: UPCOMING EXAMS VIEW */}
                  {activeTab === "exams" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {upcomingExams.map((exam) => {
                        const accent = getSubjectAccent(exam.subject);
                        return (
                          <div
                            key={exam.id}
                            className={`p-5 rounded-2xl border space-y-4 relative overflow-hidden ${cardBgClass} hover:border-zinc-700 transition-all`}
                          >
                            <div
                              className="absolute inset-y-0 left-0 w-[3px]"
                              style={{ background: accent }}
                            />
                            <div className="flex items-start justify-between gap-2 pl-1.5">
                              <div>
                                <span
                                  className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border"
                                  style={{
                                    background: `${accent}1a`,
                                    color: accent,
                                    borderColor: `${accent}33`,
                                  }}
                                >
                                  {exam.subject}
                                </span>
                                <h3 className="font-bold text-sm mt-2">
                                  {exam.title}
                                </h3>
                              </div>
                              <div
                                className="p-2 rounded-xl shrink-0"
                                style={{ background: `${accent}1a`, color: accent }}
                              >
                                <BookMarked size={16} />
                              </div>
                            </div>

                            <div className="space-y-1.5 text-xs pl-1.5">
                              <div className={`flex items-center gap-2 ${subTextClass}`}>
                                <Calendar size={13} className="text-red-400" />
                                <span>{exam.date}</span>
                              </div>
                              <div className={`flex items-center gap-2 ${subTextClass}`}>
                                <Clock size={13} className="text-amber-400" />
                                <span>{exam.time}</span>
                              </div>
                            </div>

                            <div className="border-t border-zinc-800/40 pt-3 pl-1.5">
                              <p className={`text-[11px] font-semibold mb-1.5 ${subTextClass}`}>
                                Topics Included:
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {exam.topics.map((topic, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-300 border border-zinc-700/50"
                                  >
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              {/* Leaderboard Column */}
              <div className="lg:col-span-1">
                <div
                  className={`p-5 rounded-2xl border lg:sticky lg:top-8 space-y-4 ${cardBgClass}`}
                >
                  <div className="flex items-center justify-between border-b border-zinc-800/40 pb-3">
                    <div className="flex items-center gap-2">
                      <Trophy size={18} className="text-amber-400" />
                      <h2 className="text-base font-bold">Class Leaderboard</h2>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {leaderboard.map((user, index) => {
                      const isTop = index === 0;
                      return (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                            isTop
                              ? "border-amber-500/30 bg-amber-500/5"
                              : "border-zinc-800/40 bg-zinc-900/30 hover:border-zinc-700/60"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black shrink-0 ${
                                index === 0
                                  ? "bg-amber-500/15 text-amber-400"
                                  : index === 1
                                  ? "bg-zinc-500/15 text-zinc-300"
                                  : index === 2
                                  ? "bg-amber-800/20 text-amber-600"
                                  : `bg-zinc-800/40 ${subTextClass}`
                              }`}
                            >
                              {index + 1}
                            </span>
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-200 shrink-0">
                              {getInitials(user.full_name)}
                            </div>
                            <span className="text-xs font-semibold truncate">
                              {user.full_name}
                            </span>
                          </div>

                          <span className="flex items-center gap-1 text-xs font-extrabold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                            {isTop && <Flame size={11} />}
                            {user.xp} XP
                          </span>
                        </div>
                      );
                    })}

                    {leaderboard.length === 0 && (
                      <p className={`text-xs text-center py-4 ${subTextClass}`}>
                        No leaderboard data yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        )}
      </div>

      {/* Mobile Bottom Navbar */}
      <div className="md:hidden">
        <MobileNavbar
          darkMode={darkMode}
          subTextColor={darkMode ? "#a1a1aa" : "#8b0000"}
          border={darkMode ? "1px solid #3f0000" : "1px solid #ffb3b3"}
        />
      </div>

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="p-6 rounded-2xl w-full max-w-sm border border-zinc-800 bg-zinc-900 text-zinc-100 shadow-2xl space-y-4 text-center">
            <div className="w-10 h-10 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={20} />
            </div>

            <div>
              <h3 className="text-base font-bold">Delete Material?</h3>
              <p className={`text-xs mt-1 ${subTextClass}`}>
                This action will deduct <strong>20 XP</strong>.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs font-medium truncate">
              "{deleteTarget.title}"
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-xs font-semibold hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
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