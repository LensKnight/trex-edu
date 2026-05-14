"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import useAuth from "../../src/hooks/useAuth";
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
  const [notesCount, setNotesCount] = useState(0);
  const [xp, setXp] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [fullName, setFullName] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  const subjects = [
    "Physics",
    "Chemistry",
    "Mathematics",
    "Computer Science",
    "English",
    "Physical Education",
  ];

  useEffect(() => {
    if (!loading && session) {
      fetchStats();
      fetchLeaderboard();
    }
  }, [loading, session]);

  async function fetchStats() {
    const { data: notesData } = await supabase
      .from("notes")
      .select("*")
      .eq("uploader_id", session!.user.id);

    if (notesData) {
      setNotes(notesData);
      setNotesCount(notesData.length);
      setTotalLikes(notesData.reduce((sum, n) => sum + (n.likes || 0), 0));

      // Chart data — subject wise notes count
      const subjectCount = subjects.map((s) => ({
        subject: s.split(" ")[0], // short naam
        notes: notesData.filter((n) => n.subject === s).length,
      })).filter((s) => s.notes > 0);
      setChartData(subjectCount);
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("xp, full_name")
      .eq("id", session!.user.id)
      .single();

    setXp(profileData?.xp || 0);
    const full = profileData?.full_name || "";
    setFullName(full.split(" ")[0]);
  }

  async function fetchLeaderboard() {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, xp")
      .order("xp", { ascending: false })
      .limit(5);

    if (data) setLeaderboard(data);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    const fileName = deleteTarget.file_url.split("/materials/")[1];
    const { error: storageError } = await supabase.storage.from("materials").remove([fileName]);
    console.log("storageError:", storageError);

    const { error: dbError } = await supabase.from("notes").delete().eq("id", deleteTarget.id);
    console.log("dbError:", dbError);

    const { data: profileData } = await supabase
      .from("profiles").select("xp").eq("id", session!.user.id).single();

    const newXp = Math.max((profileData?.xp || 0) - 20, 0);
    await supabase.from("profiles").update({ xp: newXp }).eq("id", session!.user.id);

    setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
    setNotesCount((prev) => prev - 1);
    setTotalLikes((prev) => prev - (deleteTarget.likes || 0));
    setXp(newXp);
    setDeleteTarget(null);
  }

  if (loading) return (
    <div className="loading-screen">
      <img src="/toggle-icon.png" className="loading-x" alt="loading" />
      <div className="loading-text">Loading</div>
    </div>
  );

  return (
    <div className="flex text-white min-h-screen" style={{background: "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"}}>
      <div className="flex-1 p-8">
        <h1 className="text-5xl font-bold mb-8">Welcome, <span className="glow-text">{fullName}</span> 👋</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="shine-effect p-6 rounded-3xl hover:scale-105 transition-all duration-300" style={{background: "linear-gradient(135deg, #6b1a1a, #2d0a0a)"}}>
            <h2 className="text-zinc-400 mb-2">Notes Uploaded</h2>
            <p className="text-4xl font-bold">{notesCount}</p>
          </div>
          <div className="shine-effect p-6 rounded-3xl hover:scale-105 transition-all duration-300" style={{background: "linear-gradient(135deg, #6b1a1a, #2d0a0a)"}}>
            <h2 className="text-zinc-400 mb-2">XP Earned</h2>
            <p className="text-4xl font-bold">{xp}</p>
          </div>
          <div className="shine-effect p-6 rounded-3xl hover:scale-105 transition-all duration-300" style={{background: "linear-gradient(135deg, #6b1a1a, #2d0a0a)"}}>
            <h2 className="text-zinc-400 mb-2">Total Likes</h2>
            <p className="text-4xl font-bold">{totalLikes}</p>
          </div>
        </div>

        {/* Leaderboard + Chart */}
        <div className="grid grid-cols-2 gap-6 mb-12">

          {/* Leaderboard */}
          <div className="bg-zinc-900 p-6 rounded-3xl hover:bg-zinc-800 hover:scale-105 transition-all duration-300">
            <h2 className="text-2xl font-bold mb-4">🏆 Leaderboard</h2>
            <div className="space-y-3">
              {leaderboard.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-2xl" style={{background: "rgba(255,255,255,0.03)"}}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold" style={{color: index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : index === 2 ? "#CD7F32" : "#888"}}>
                      #{index + 1}
                    </span>
                    <span className="font-medium">{user.full_name}</span>
                  </div>
                  <span className="text-red-400 font-bold">{user.xp} XP</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="bg-zinc-900 p-6 rounded-3xl hover:bg-zinc-800 hover:scale-105 transition-all duration-300">
            <h2 className="text-2xl font-bold mb-4">📊 Notes by Subject</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <XAxis dataKey="subject" tick={{fill: "#888", fontSize: 12}} />
                  <YAxis tick={{fill: "#888", fontSize: 12}} />
                  <Tooltip contentStyle={{background: "#1a0000", border: "1px solid #3f0000", borderRadius: "12px"}} />
                  <Bar dataKey="notes" fill="#6b0000" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-zinc-500 text-sm mt-4">No notes available</p>
            )}
          </div>
        </div>

        {/* My Notes */}
        <h2 className="text-3xl font-bold mb-6">My Notes :</h2>
        <div className="space-y-4">
          {subjects.map((subject) => {
            const subjectNotes = notes.filter((n) => n.subject === subject);
            if (subjectNotes.length === 0) return null;
            const isOpen = openSubject === subject;

            return (
              <div key={subject} className="bg-zinc-900 rounded-3xl overflow-hidden">
                <button
                  onClick={() => setOpenSubject(isOpen ? null : subject)}
                  className="w-full flex items-center justify-between p-5 hover:bg-zinc-800 transition"
                >
                  <span className="text-xl font-bold">{subject}</span>
                  <span className="text-zinc-400 text-sm">{subjectNotes.length} notes {isOpen ? "▲" : "▼"}</span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 space-y-3">
                    {subjectNotes.map((note) => (
                      <div key={note.id} className="bg-zinc-800 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="font-bold">{note.title}</p>
                          <p className="text-zinc-400 text-xs mt-1">❤️ {note.likes || 0} likes</p>
                        </div>
                        <div className="flex gap-3">
                          <a href={note.file_url} target="_blank" className="bg-blue-600 px-3 py-2 rounded-xl text-sm hover:bg-blue-700 scale-105 transition-all duration-300" >
                            Open
                          </a>
                          <button
                            onClick={() => setDeleteTarget(note)}
                            className="bg-red-600 px-3 py-2 rounded-xl text-sm hover:bg-red-700 hover:scale-105 transition-all duration-300">
                            Delete
                          </button>
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 p-8 rounded-3xl w-96 text-center">
            <p className="text-4xl mb-4">🗑️</p>
            <h2 className="text-2xl font-bold mb-2">Delete Note?</h2>
            <p className="text-zinc-400 mb-2">This will be deleted permanently</p>
            <p className="text-zinc-400 text-sm mb-2">20XP will be deducted</p>
            <p className="text-white font-bold mb-6">"{deleteTarget.title}"</p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-zinc-700 p-3 rounded-2xl hover:bg-zinc-600 hover:scale-105 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 p-3 rounded-2xl hover:bg-red-700 hover:scale-105 transition-all duration-300"
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