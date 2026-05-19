"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import { useTheme } from "../../src/context/ThemeContext";

export default function ClassmatesPage() {
  const { darkMode, setDarkMode } = useTheme();
  const [classmates, setClassmates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";
  const textColor = darkMode ? "#ffffff" : "#1a0000";
  const subTextColor = darkMode ? "#a1a1aa" : "#8b0000";
  const cardBg = darkMode ? "linear-gradient(135deg, #6b1a1a, #2d0a0a)" : "linear-gradient(135deg, #ffcccc, #ffb3b3)";
  const border = darkMode ? "1px solid #3f0000" : "1px solid #ffb3b3";
  const inputBg = darkMode ? "#1b1b1e" : "#ffd0d0";

  useEffect(() => {
    async function fetchClassmates() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!profile) return;
      const { data } = await supabase.from("profiles").select("*").eq("class_name", profile.class_name).eq("section", profile.section);
      setClassmates(data || []);
      setLoading(false);
    }
    fetchClassmates();
  }, []);

  if (loading) return (
    <div className="loading-screen">
      <img src="/toggle-icon.png" className="loading-x" alt="loading" />
      <div className="loading-text">Loading Classmates</div>
    </div>
  );

  return (
    <div className="p-6 min-h-screen transition-all duration-500" style={{background: bg, color: textColor}}>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs md:text-sm font-medium tracking-widest uppercase mb-1" style={{color: subTextColor}}>Your Class</p>
          <h1 className="text-3xl md:text-5xl font-bold">Your Classmates</h1>
          <div className="h-0.5 w-16 md:w-24 rounded-full mt-2" style={{background: "linear-gradient(90deg, #8b0000, transparent)"}} />
        </div>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="px-3 py-2 rounded-2xl font-bold transition-all duration-300 hover:scale-105 text-sm"
          style={{background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", color: textColor}}
        >
          {darkMode ? "☀️" : "🌙"}
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search classmates..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-6 p-3 rounded-xl outline-none transition-all duration-300"
        style={{background: inputBg, color: textColor, border}}
      />

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classmates
          .filter((student) => student.full_name.toLowerCase().includes(search.toLowerCase()))
          .map((student) => (
            <div
              key={student.id}
              onClick={() => setSelectedStudent(student)}
              className="p-4 rounded-2xl hover:scale-103 transition-all duration-300 cursor-pointer"
              style={{background: cardBg, border}}
            >
              <h2 className="text-lg font-bold">🌐 {student.full_name}</h2>
              <p className="text-sm mt-1" style={{color: subTextColor}}>Class: {student.class_name}</p>
              <p className="text-sm" style={{color: subTextColor}}>Section: {student.section}</p>
              <p className="text-xs mt-2" style={{color: subTextColor}}>Roll No: {student.roll_no}</p>
            </div>
          ))}
      </div>

      {/* Modal */}
      {selectedStudent && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{background: "rgba(0,0,0,0.7)"}}
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="w-80 p-6 rounded-2xl"
            style={{background: cardBg, border, color: textColor}}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-3">{selectedStudent.full_name}</h2>
            <p className="text-sm mb-1" style={{color: subTextColor}}>Class: {selectedStudent.class_name}</p>
            <p className="text-sm mb-1" style={{color: subTextColor}}>Section: {selectedStudent.section}</p>
            <p className="text-sm" style={{color: subTextColor}}>Roll No: {selectedStudent.roll_no}</p>
            <button
              onClick={() => setSelectedStudent(null)}
              className="mt-4 w-full py-2 rounded-xl font-bold hover:scale-105 transition-all duration-300"
              style={{background: "rgba(0,0,0,0.3)", color: textColor, border}}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}