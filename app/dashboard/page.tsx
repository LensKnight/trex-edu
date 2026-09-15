"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import useAuth from "../../src/hooks/useAuth";
import { useTheme } from "../../src/context/ThemeContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { 
  Trophy, 
  FileText, 
  Zap, 
  Heart, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  ExternalLink,
  BookOpen,
  Sparkles,
  AlertTriangle,
  LayoutDashboard,
  FolderOpen,
  Bell,
  Calendar,
  Clock,
  X
} from "lucide-react";

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

type RoutineItem = {
  subject: string;
  date: string;
  time: string;
  room: string;
};

export default function DashboardPage() {
  const { session, loading } = useAuth();
  const { darkMode } = useTheme();

  const [activeTab, setActiveTab] = useState<"dashboard" | "files">("dashboard");
  const [showRoutineModal, setShowRoutineModal] = useState(false);

  const [notesCount, setNotesCount] = useState(0);
  const [xp, setXp] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [fullName, setFullName] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Updated Exam Routine Schedule
  const examRoutine: RoutineItem[] = [
    { subject: "Physics", date: "21 Sep 2026", time: "8:15 AM - 11:15 PM", room: "N/A" },
    { subject: "English", date: "23 Sep 2026", time: "8:15 AM - 11:15 PM", room: "N/A" },
    { subject: "Computer Science / Biology", date: "25 Sep 2026", time: "8:15 AM - 11:15 PM", room: "N/A" },
    { subject: "Physical Education", date: "28 Sep 2026", time: "8:15 AM - 11:15 PM", room: "N/A" },
    { subject: "Mathematics", date: "30 Sep 2026", time: "8:15 AM - 11:15 PM", room: "N/A" },
    { subject: "Chemistry", date: "05 Oct 2026", time: "8:15 AM - 11:15 PM", room: "N/A" },
  ];

  const subjects = [
    "Physics",
    "Chemistry",
    "Mathematics",
    "Computer Science",
    "English",
    "Physical Education",
  ];

  const pageBg = darkMode
    ? "bg-[#090101] text-zinc-100"
    : "bg-[#fff8f8] text-zinc-900";

  const cardStyle = darkMode
    ? "bg-zinc-900/60 border-zinc-800/80 backdrop-blur-xl shadow-2xl"
    : "bg-white/90 border-red-100 backdrop-blur-xl shadow-xl shadow-red-500/5";

  const subTextColor = darkMode ? "text-zinc-400" : "text-zinc-500";
  const accentGradient = "bg-gradient-to-r from-red-600 via-rose-600 to-amber-600";

  useEffect(() => {
    if (!loading && session) {
      fetchStats();
      fetchLeaderboard();
    }
  }, [loading, session]);

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, async () => {
        await fetchStats();
        await fetchLeaderboard();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, async () => {
        await fetchStats();
        await fetchLeaderboard();
      })
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
      setChartData(
        subjects
          .map((s) => ({
            subject: s.split(" ")[0],
            notes: notesData.filter((n) => n.subject === s).length,
          }))
          .filter((s) => s.notes > 0)
      );
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
    const { data: { user } } = await supabase.auth.getUser();
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

      if (dbError) return alert("Delete failed: " + dbError.message);

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
    } catch (err) {
      alert("Something went wrong while deleting");
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${pageBg}`}>
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin" />
          <Sparkles className="w-6 h-6 text-red-500 absolute animate-pulse" />
        </div>
        <p className="mt-4 text-sm font-semibold tracking-wider uppercase opacity-70">
          Loading Workspace
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${pageBg}`}>
      <div className="w-full px-4 sm:px-8 lg:px-12 py-8 space-y-8">
        
        {/* Top Banner Header */}
        <div className={`p-6 sm:p-8 rounded-3xl border ${cardStyle} relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20 mb-3">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                Student Workspace Portal
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Welcome back,{" "}
                <span className={`bg-clip-text text-transparent ${accentGradient}`}>
                  {fullName || "Student"}
                </span>
              </h1>
              <p className={`text-sm mt-1 ${subTextColor}`}>
                Track your academic stats, exam schedules, and manage shared resources.
              </p>
            </div>

            {/* SLIDER TOGGLE BUTTON */}
            <div className={`p-1.5 rounded-2xl border flex items-center gap-1 shrink-0 ${
              darkMode ? "bg-zinc-950/80 border-zinc-800" : "bg-zinc-100/80 border-zinc-200"
            }`}>
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 ${
                  activeTab === "dashboard"
                    ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20"
                    : `${subTextColor} hover:text-zinc-200`
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setActiveTab("files")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 ${
                  activeTab === "files"
                    ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/20"
                    : `${subTextColor} hover:text-zinc-200`
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                <span>My Files ({notesCount})</span>
              </button>
            </div>
          </div>
        </div>
        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              label: "Shared Resources",
              value: notesCount,
              sub: "Total files published",
              icon: <FileText className="w-5 h-5 text-red-500" />,
              bg: "from-red-500/10 to-transparent",
            },
            {
              label: "Earned Experience",
              value: `${xp} XP`,
              sub: "Academic contribution score",
              icon: <Zap className="w-5 h-5 text-amber-500" />,
              bg: "from-amber-500/10 to-transparent",
            },
            {
              label: "Total Appreciations",
              value: totalLikes,
              sub: "Community positive reactions",
              icon: <Heart className="w-5 h-5 text-rose-500" />,
              bg: "from-rose-500/10 to-transparent",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`p-6 rounded-2xl border ${cardStyle} relative overflow-hidden transition-all duration-300 hover:-translate-y-1`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bg} opacity-50 pointer-events-none`} />
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
                  {stat.label}
                </span>
                <div className="p-2.5 rounded-xl bg-zinc-500/10 border border-zinc-500/10">
                  {stat.icon}
                </div>
              </div>
              <div className="text-3xl font-extrabold tracking-tight">{stat.value}</div>
              <p className={`text-xs mt-2 ${subTextColor}`}>{stat.sub}</p>
            </div>
          ))}
        </div>
              {/* EXAM ALERT WIDGET WITH FIRST UPCOMING PAPER */}
              <div className={`p-6 rounded-3xl border ${cardStyle} relative overflow-hidden bg-gradient-to-br from-red-600/15 via-rose-600/5 to-amber-600/10 border-red-500/20`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-lg shadow-red-600/30">
                      <Bell className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-500 border border-red-500/30 mb-1">
                        Upcoming Schedule
                      </div>
                      <h3 className="text-lg font-black tracking-tight">Mid-Term Board Exam</h3>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowRoutineModal(true)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-red-500 border border-red-500/30 transition shadow-sm shrink-0"
                  >
                    View Routine
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-500/15 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-red-500" />
                    <div>
                      <p className={`text-[10px] uppercase font-semibold ${subTextColor}`}>Next Paper</p>
                      <p className="text-xs font-bold">Physics (21 Sep)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className={`text-[10px] uppercase font-semibold ${subTextColor}`}>Timing</p>
                      <p className="text-xs font-bold">10:00 AM - 1:00 PM</p>
                    </div>
                  </div>
                </div>
              </div>
        {/* VIEW 1: DASHBOARD ANALYTICS & EXAM ALERT */}
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* LEFT COLUMN: Leaderboard Widget */}
            <div className="lg:col-span-6 flex flex-col">
              <div className={`p-6 rounded-3xl border ${cardStyle} flex-1 flex flex-col justify-between`}>
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Class Leaderboard</h2>
                      <p className={`text-xs ${subTextColor}`}>Top performing peers in your section</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {leaderboard.map((user, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                          darkMode
                            ? "bg-zinc-800/40 border-zinc-800/80 hover:bg-zinc-800/80"
                            : "bg-zinc-50/80 border-zinc-200/60 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                              index === 0
                                ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                                : index === 1
                                ? "bg-slate-400/20 text-slate-400 border border-slate-400/30"
                                : index === 2
                                ? "bg-amber-700/20 text-amber-700 border border-amber-700/30"
                                : "bg-zinc-500/10 text-zinc-500"
                            }`}
                          >
                            #{index + 1}
                          </span>
                          <span className="font-semibold text-sm truncate max-w-[180px] sm:max-w-none">
                            {user.full_name}
                          </span>
                        </div>

                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                          <Zap className="w-3.5 h-3.5" />
                          {user.xp} XP
                        </div>
                      </div>
                    ))}

                    {leaderboard.length === 0 && (
                      <p className={`text-xs text-center py-8 ${subTextColor}`}>No leaderboard rankings available.</p>
                    )}
                  </div>
                </div>

                <p className={`text-[11px] mt-6 text-center ${subTextColor}`}>
                  Rankings refresh automatically based on contribution XP.
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN: Subject Chart & Updated Exam Alert */}
            <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
              
              {/* Subject Chart Container */}
              <div className={`p-6 rounded-3xl border ${cardStyle}`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Subject Distribution</h2>
                    <p className={`text-xs ${subTextColor}`}>Resource uploads per subject</p>
                  </div>
                </div>

                <div className="h-44 w-full mt-2">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis
                          dataKey="subject"
                          tick={{ fill: darkMode ? "#a1a1aa" : "#71717a", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: darkMode ? "#a1a1aa" : "#71717a", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                          contentStyle={{
                            backgroundColor: darkMode ? "#18181b" : "#ffffff",
                            borderColor: darkMode ? "#27272a" : "#e4e4e7",
                            borderRadius: "12px",
                            color: darkMode ? "#ffffff" : "#000000",
                            fontSize: "12px"
                          }}
                        />
                        <Bar
                          dataKey="notes"
                          fill={darkMode ? "#dc2626" : "#ef4444"}
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <FileText className={`w-8 h-8 ${subTextColor} opacity-40 mb-2`} />
                      <p className={`text-xs ${subTextColor}`}>Upload notes to view analytics</p>
                    </div>
                  )}
                </div>
              </div>



            </div>

          </div>
        )}

        {/* VIEW 2: FILES REPOSITORY */}
        {activeTab === "files" && (
          <div className={`p-6 sm:p-8 rounded-3xl border ${cardStyle}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Uploaded Materials</h2>
                  <p className={`text-xs ${subTextColor}`}>Access and manage files uploaded by you</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {subjects.map((subject) => {
                const subjectNotes = notes.filter((n) => n.subject === subject);
                if (subjectNotes.length === 0) return null;

                const isOpen = openSubject === subject;

                return (
                  <div
                    key={subject}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      darkMode ? "bg-zinc-800/20 border-zinc-800" : "bg-zinc-50/50 border-zinc-200"
                    }`}
                  >
                    <button
                      onClick={() => setOpenSubject(isOpen ? null : subject)}
                      className="w-full flex items-center justify-between p-4 text-left transition hover:bg-zinc-500/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span className="font-bold text-base">{subject}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          darkMode ? "bg-zinc-800 text-zinc-300" : "bg-zinc-200 text-zinc-700"
                        }`}>
                          {subjectNotes.length} {subjectNotes.length === 1 ? "file" : "files"}
                        </span>
                        {isOpen ? <ChevronUp className="w-4 h-4 opacity-60" /> : <ChevronDown className="w-4 h-4 opacity-60" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 border-t border-zinc-500/10 space-y-2">
                        {subjectNotes.map((note) => (
                          <div
                            key={note.id}
                            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                              darkMode
                                ? "bg-zinc-900/80 border-zinc-800"
                                : "bg-white border-zinc-200"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{note.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-flex items-center gap-1 text-xs text-rose-500 font-medium">
                                  <Heart className="w-3 h-3 fill-rose-500/20" />
                                  {note.likes || 0} Likes
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={note.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 transition-all"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                View
                              </a>

                              <button
                                onClick={() => setDeleteTarget(note)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                title="Delete Resource"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {notes.length === 0 && (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <FileText className={`w-10 h-10 ${subTextColor} opacity-40 mb-3`} />
                  <p className="font-semibold text-sm">No notes published yet</p>
                  <p className={`text-xs mt-1 ${subTextColor}`}>Upload notes to start building your repository</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* EXAM ROUTINE MODAL */}
      {showRoutineModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div
            className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${
              darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
            }`}
          >
            <div className="p-6 border-b border-zinc-500/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Exam Routine & Datesheet</h3>
                  <p className={`text-xs ${subTextColor}`}>Mid-Term Examination 2026</p>
                </div>
              </div>

              <button
                onClick={() => setShowRoutineModal(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {examRoutine.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                    darkMode
                      ? "bg-zinc-800/40 border-zinc-800"
                      : "bg-zinc-50 border-zinc-200"
                  }`}
                >
                  <div>
                    <p className="font-bold text-sm">{item.subject}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs opacity-70">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-500" />
                        {item.time}
                      </span>
                      <span>•</span>
                      <span>{item.room}</span>
                    </div>
                  </div>

                  <span className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-red-600/10 text-red-500 border border-red-500/20 shrink-0">
                    {item.date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`p-6 rounded-3xl w-full max-w-md border shadow-2xl ${
              darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
            }`}
          >
            <div className="flex flex-col items-center text-center">
              <div className="p-3 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold mb-1">Delete Material?</h3>
              <p className={`text-xs mb-4 ${subTextColor}`}>
                This action is irreversible. The document will be permanently removed.
              </p>

              <div className={`p-3 rounded-xl border w-full mb-4 text-xs font-medium ${
                darkMode ? "bg-zinc-800/50 border-zinc-700/50" : "bg-zinc-50 border-zinc-200"
              }`}>
                <p className="truncate">"{deleteTarget.title}"</p>
                <p className="text-red-500 font-semibold mt-1">-20 XP Penalty will be applied</p>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition ${
                    darkMode
                      ? "border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                      : "border-zinc-200 bg-zinc-100 hover:bg-zinc-200"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition shadow-lg shadow-red-600/20"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}