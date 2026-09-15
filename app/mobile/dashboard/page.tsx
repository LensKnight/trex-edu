"use client";

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
      date: "Sep 22, 2026",
      time: "10:00 AM - 1:00 PM",
      topics: ["Electrostatics", "Current Electricity", "Magnetism"],
    },
    {
      id: "2",
      title: "Unit Test Chemistry",
      subject: "Chemistry",
      date: "Sep 28, 2026",
      time: "09:30 AM - 11:00 AM",
      topics: ["Solutions", "Electrochemistry", "Chemical Kinetics"],
    },
    {
      id: "3",
      title: "CS Practical Assessment",
      subject: "Computer Science",
      date: "Oct 05, 2026",
      time: "11:00 AM - 01:00 PM",
      topics: ["Python File Handling", "Data Structures", "SQL"],
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

  return (
    <div className={`min-h-screen flex ${bgClass}`}>
      {/* Desktop Navigation Sidebar */}
      <aside
        className={`w-64 border-r hidden md:flex flex-col justify-between p-4 sticky top-0 h-screen ${sidebarBgClass}`}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center font-black text-white text-base">
              N
            </div>
            <span className="font-extrabold text-lg tracking-tight">Portal</span>
          </div>

          <nav className="space-y-1">
            {[
              { label: "Dashboard", icon: LayoutDashboard, active: true },
              { label: "Materials", icon: BookOpen },
              { label: "Announcements", icon: Megaphone },
              { label: "Profile", icon: User },
            ].map((item) => (
              <button
                key={item.label}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  item.active
                    ? darkMode
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : "bg-red-50 text-red-600 border border-red-200"
                    : `${subTextClass} hover:bg-zinc-800/40 hover:text-zinc-200`
                }`}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="border-t border-zinc-800/60 pt-4 px-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs">
              {fullName ? fullName[0] : "U"}
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
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
            <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            <span className="mt-4 text-xs font-semibold text-zinc-400">
              Loading Dashboard...
            </span>
          </div>
        ) : (
          <main className="max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8 pb-28 md:pb-8">
            {/* Header Bar */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/40 pb-6">
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

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
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
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={`p-5 rounded-2xl border transition-all hover:scale-[1.01] ${cardBgClass}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${subTextClass}`}>
                          {stat.label}
                        </span>
                        <div className={`p-2 rounded-xl border ${stat.color}`}>
                          <stat.icon size={16} />
                        </div>
                      </div>
                      <p className="text-3xl font-extrabold mt-3">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Section with Desktop Toggle Switcher */}
                <section className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                    <h2 className="text-lg font-bold">
                      {activeTab === "notes" ? "My Notes" : "Upcoming Exams"}
                    </h2>

                    {/* Toggle Switch Button Component */}
                    <div className="inline-flex p-1 rounded-xl border border-zinc-800 bg-zinc-950/60 self-start sm:self-auto">
                      <button
                        onClick={() => setActiveTab("notes")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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

                        return (
                          <div
                            key={subject}
                            className={`rounded-2xl border overflow-hidden transition-all ${cardBgClass}`}
                          >
                            <button
                              onClick={() =>
                                setOpenSubject(isOpen ? null : subject)
                              }
                              className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/20 transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-zinc-800/60 text-zinc-300">
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
                      {upcomingExams.map((exam) => (
                        <div
                          key={exam.id}
                          className={`p-5 rounded-2xl border space-y-4 ${cardBgClass} hover:border-zinc-700 transition-all`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                                {exam.subject}
                              </span>
                              <h3 className="font-bold text-sm mt-2">
                                {exam.title}
                              </h3>
                            </div>
                            <div className="p-2 rounded-xl bg-zinc-800/60 text-zinc-300 shrink-0">
                              <BookMarked size={16} />
                            </div>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div className={`flex items-center gap-2 ${subTextClass}`}>
                              <Calendar size={13} className="text-red-400" />
                              <span>{exam.date}</span>
                            </div>
                            <div className={`flex items-center gap-2 ${subTextClass}`}>
                              <Clock size={13} className="text-amber-400" />
                              <span>{exam.time}</span>
                            </div>
                          </div>

                          <div className="border-t border-zinc-800/40 pt-3">
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
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Leaderboard Column */}
              <div className="lg:col-span-1">
                <div
                  className={`p-5 rounded-2xl border sticky top-8 space-y-4 ${cardBgClass}`}
                >
                  <div className="flex items-center justify-between border-b border-zinc-800/40 pb-3">
                    <div className="flex items-center gap-2">
                      <Trophy size={18} className="text-amber-400" />
                      <h2 className="text-base font-bold">Class Leaderboard</h2>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {leaderboard.map((user, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-800/40 bg-zinc-900/30 hover:border-zinc-700/60 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`text-xs font-black w-5 text-center ${
                              index === 0
                                ? "text-amber-400"
                                : index === 1
                                ? "text-zinc-300"
                                : index === 2
                                ? "text-amber-600"
                                : subTextClass
                            }`}
                          >
                            #{index + 1}
                          </span>
                          <span className="text-xs font-semibold truncate">
                            {user.full_name}
                          </span>
                        </div>

                        <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {user.xp} XP
                        </span>
                      </div>
                    ))}
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