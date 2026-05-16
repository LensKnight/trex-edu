"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import useAuth from "../../src/hooks/useAuth";
import { useTheme } from "../../src/context/ThemeContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

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

export default function DashboardPage() {
  const { session, loading } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const [notesCount, setNotesCount] = useState(0);
  const [xp, setXp] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [fullName, setFullName] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  const subjects = ["Physics","Chemistry","Mathematics","Computer Science","English","Physical Education"];

  const bg = darkMode ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)" : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";
  const textColor = darkMode ? "#ffffff" : "#1a0000";
  const subTextColor = darkMode ? "#a1a1aa" : "#8b0000";
  const cardBg = darkMode ? "linear-gradient(135deg, #6b1a1a, #2d0a0a)" : "linear-gradient(135deg, #ffcccc, #ffb3b3)";
  const cardBg2 = darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.10)";
  const noteBg = darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.08)";
  const border = darkMode ? "1px solid #3f0000" : "1px solid #ffb3b3";

  useEffect(() => {
    if (!loading && session) { fetchStats(); fetchLeaderboard(); }
  }, [loading, session]);

  async function fetchStats() {
    const { data: notesData } = await supabase.from("notes").select("*").eq("uploader_id", session!.user.id);
    if (notesData) {
      setNotes(notesData);
      setNotesCount(notesData.length);
      setTotalLikes(notesData.reduce((sum, n) => sum + (n.likes || 0), 0));
      setChartData(subjects.map((s) => ({ subject: s.split(" ")[0], notes: notesData.filter((n) => n.subject === s).length })).filter((s) => s.notes > 0));
    }
    const { data: profileData } = await supabase.from("profiles").select("xp, full_name").eq("id", session!.user.id).single();
    setXp(profileData?.xp || 0);
    setFullName((profileData?.full_name || "").split(" ")[0]);
  }

  async function fetchLeaderboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("section, class_name").eq("id", user.id).single();
    if (!profile) return;
    const { data } = await supabase.from("profiles").select("full_name, xp").eq("class_name", profile.class_name).eq("section", profile.section).order("xp", { ascending: false }).limit(5);
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
      const { error: dbError } = await supabase.from("notes").delete().eq("id", deleteTarget.id);
      if (dbError) return alert("Delete failed: " + dbError.message);
      const { data: profileData } = await supabase.from("profiles").select("xp").eq("id", session!.user.id).single();
      const newXp = Math.max((profileData?.xp || 0) - 20, 0);
      await supabase.from("profiles").update({ xp: newXp }).eq("id", session!.user.id);
      setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      setNotesCount((prev) => prev - 1);
      setTotalLikes((prev) => prev - (deleteTarget.likes || 0));
      setXp(newXp);
      setDeleteTarget(null);
    } catch (err) {
      alert("Something went wrong while deleting");
    }
  }

  if (loading) return (
    <div className="loading-screen">
      <img src="/toggle-icon.png" className="loading-x" alt="loading" />
      <div className="loading-text">Loading Dashboard</div>
    </div>
  );

  return (
    <div className="min-h-screen transition-all duration-500" style={{background: bg, color: textColor}}>
      <div className="p-4 md:p-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 md:mb-8">
          <div>
            <p className="text-xs md:text-sm font-medium tracking-widest uppercase mb-1" style={{color: subTextColor}}>Student Dashboard</p>
            <h1 className="text-3xl md:text-5xl font-bold">Welcome back, <span className="glow-text">{fullName}</span> 👋</h1>
            <div className="mt-2 h-0.5 w-16 md:w-24 rounded-full" style={{background: "linear-gradient(90deg, #8b0000, transparent)"}}></div>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-3 py-2 md:px-4 md:py-2 rounded-2xl font-bold transition-all duration-300 hover:scale-105 text-sm md:text-base"
            style={{background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", color: textColor}}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-8 md:mb-12">
          {[
            { label: "Notes", value: notesCount, icon: "📄" },
            { label: "XP", value: xp, icon: "⚡" },
            { label: "Likes", value: totalLikes, icon: "❤️" },
          ].map((stat) => (
            <div key={stat.label} className="shine-effect p-4 md:p-6 rounded-3xl hover:scale-103 transition-all duration-300" style={{background: cardBg}}>
              <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                <span className="text-sm md:text-base">{stat.icon}</span>
                <h2 className="text-xs md:text-sm" style={{color: subTextColor}}>{stat.label}</h2>
              </div>
              <p className="text-2xl md:text-4xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Leaderboard + Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-12">
          <div className="shine-effect p-4 md:p-6 rounded-3xl hover:scale-103 transition-all duration-300" style={{background: cardBg}}>
            <h2 className="text-xl md:text-2xl font-bold mb-2">🏆 Leaderboard</h2>
            <p className="text-xs mb-3" style={{color: subTextColor}}>ⓘ Points verified & updated regularly</p>
            <div className="space-y-2 md:space-y-3">
              {leaderboard.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-2 md:p-3 rounded-2xl" style={{background: noteBg}}>
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className="text-base md:text-lg font-bold" style={{color: index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : index === 2 ? "#CD7F32" : "#888"}}>#{index + 1}</span>
                    <span className="font-medium text-sm md:text-base">{user.full_name}</span>
                  </div>
                  <span className="font-bold text-sm md:text-base" style={{color: "#ff6666"}}>{user.xp} XP</span>
                </div>
              ))}
            </div>
          </div>

          <div className="shine-effect p-4 md:p-6 rounded-3xl hover:scale-103 transition-all duration-300" style={{background: cardBg}}>
            <h2 className="text-xl md:text-2xl font-bold mb-4">📊 Notes by Subject</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData}>
                  <XAxis dataKey="subject" tick={{fill: darkMode ? "#888" : "#8b0000", fontSize: 10}} />
                  <YAxis tick={{fill: darkMode ? "#888" : "#8b0000", fontSize: 10}} />
                  <Tooltip contentStyle={{background: darkMode ? "#1a0000" : "#fff5f5", border: "1px solid #8b0000", borderRadius: "12px", color: textColor}} />
                  <Bar dataKey="notes" fill={darkMode ? "#6b0000" : "#ff6666"} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm mt-4" style={{color: subTextColor}}>No notes available</p>
            )}
          </div>
        </div>

        {/* My Notes */}
        <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">My Notes :</h2>
        <div className="space-y-3 md:space-y-4">
          {subjects.map((subject) => {
            const subjectNotes = notes.filter((n) => n.subject === subject);
            if (subjectNotes.length === 0) return null;
            const isOpen = openSubject === subject;
            return (
              <div key={subject} className="rounded-3xl overflow-hidden transition-all duration-300 hover:scale-103" style={{background: cardBg2, border}}>
                <button onClick={() => setOpenSubject(isOpen ? null : subject)} className="w-full flex items-center justify-between p-4 md:p-5 transition hover:opacity-80">
                  <span className="text-base md:text-xl font-bold">{subject}</span>
                  <span className="text-xs md:text-sm" style={{color: subTextColor}}>{subjectNotes.length} notes {isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <div className="px-4 md:px-5 pb-4 md:pb-5 space-y-3">
                    {subjectNotes.map((note) => (
                      <div key={note.id} className="p-3 md:p-4 rounded-2xl flex items-center justify-between gap-2" style={{background: noteBg}}>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm md:text-base truncate">{note.title}</p>
                          <p className="text-xs mt-1" style={{color: subTextColor}}>❤️ {note.likes || 0} likes</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <a href={note.file_url} target="_blank" className="px-2 md:px-3 py-2 rounded-xl text-xs md:text-sm transition hover:scale-105" style={{background: darkMode ? "#1e3a5f" : "#dbeafe", color: darkMode ? "#fff" : "#1e3a5f"}}>Open</a>
                          <button onClick={() => setDeleteTarget(note)} className="bg-red-600 px-2 md:px-3 py-2 rounded-xl text-xs md:text-sm hover:bg-red-700 hover:scale-105 transition-all duration-300 text-white">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="p-6 md:p-8 rounded-3xl w-full max-w-sm text-center" style={{background: darkMode ? "#1a0000" : "#fff5f5", color: textColor}}>
            <p className="text-4xl mb-4">🗑️</p>
            <h2 className="text-xl md:text-2xl font-bold mb-2">Delete Note?</h2>
            <p className="mb-2 text-sm" style={{color: subTextColor}}>This will be deleted permanently</p>
            <p className="text-sm mb-2" style={{color: subTextColor}}>20XP will be deducted</p>
            <p className="font-bold mb-6 text-sm">"{deleteTarget.title}"</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 p-3 rounded-2xl hover:scale-105 transition-all duration-300 font-bold text-sm" style={{background: darkMode ? "#3f3f3f" : "#e5e5e5", color: textColor}}>Cancel</button>
              <button onClick={confirmDelete} className="flex-1 bg-red-600 p-3 rounded-2xl hover:bg-red-700 hover:scale-105 transition-all duration-300 font-bold text-white text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}