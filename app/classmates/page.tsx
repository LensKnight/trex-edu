"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import { useTheme } from "../../src/context/ThemeContext";
import { Search, X, Hash, Layers3, School } from "lucide-react";

const ACCENTS = ["#f97316", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#eab308", "#ef4444", "#14b8a6"];

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getAccent(seed?: string) {
  if (!seed) return ACCENTS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return ACCENTS[Math.abs(hash) % ACCENTS.length];
}

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
  const cardBg = darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)";
  const border = darkMode ? "1px solid #3f0000" : "1px solid #ffb3b3";
  const inputBg = darkMode ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.7)";

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

  const filtered = classmates.filter((student) =>
    student.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 min-h-screen transition-all duration-500" style={{ background: bg, color: textColor }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs md:text-sm font-medium tracking-widest uppercase mb-1" style={{ color: subTextColor }}>
            Your Class
          </p>
          <h1 className="text-3xl md:text-5xl font-bold">Your Classmates</h1>
          <div
            className="h-0.5 w-16 md:w-24 rounded-full mt-2"
            style={{ background: "linear-gradient(90deg, #8b0000, transparent)" }}
          />
        </div>

        <div
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0"
          style={{ background: cardBg, border, color: subTextColor }}
        >
          {classmates.length} {classmates.length === 1 ? "Student" : "Students"}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: subTextColor }} />
        <input
          type="text"
          placeholder="Search classmates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl outline-none transition-all duration-300"
          style={{ background: inputBg, color: textColor, border }}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((student) => {
          const accent = getAccent(student.id || student.full_name);
          return (
            <div
              key={student.id}
              onClick={() => setSelectedStudent(student)}
              className="p-4 rounded-2xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 cursor-pointer relative overflow-hidden"
              style={{
                background: cardBg,
                border,
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                boxShadow: darkMode
                  ? "0 8px 24px -14px rgba(0,0,0,0.6)"
                  : "0 8px 24px -14px rgba(139,0,0,0.2)",
              }}
            >
              <div className="absolute inset-y-0 left-0 w-[3px]" style={{ background: accent }} />

              <div className="flex items-center gap-3 pl-1.5">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
                    boxShadow: `0 4px 14px -4px ${accent}88`,
                  }}
                >
                  {getInitials(student.full_name)}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold truncate">{student.full_name}</h2>
                  <p className="text-xs mt-0.5 truncate" style={{ color: subTextColor }}>
                    {student.class_name} • {student.section}
                  </p>
                </div>

                <span
                  className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg"
                  style={{ background: `${accent}1a`, color: accent }}
                >
                  #{student.roll_no}
                </span>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-20">
            <Search size={28} className="mx-auto mb-3 opacity-40" style={{ color: subTextColor }} />
            <p className="text-sm font-semibold" style={{ color: subTextColor }}>
              No classmates found for "{search}"
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedStudent && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-200"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="w-full max-w-sm p-6 rounded-3xl relative"
            style={{
              background: darkMode
                ? "linear-gradient(160deg, #1c1010 0%, #150505 100%)"
                : "#ffffff",
              border,
              color: textColor,
              boxShadow: "0 20px 50px -20px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedStudent(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full transition"
              style={{ background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}
            >
              <X size={16} />
            </button>

            <div className="flex flex-col items-center text-center mb-5">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl text-white mb-3"
                style={{
                  background: `linear-gradient(135deg, ${getAccent(selectedStudent.id || selectedStudent.full_name)}, ${getAccent(selectedStudent.id || selectedStudent.full_name)}99)`,
                  boxShadow: `0 8px 24px -6px ${getAccent(selectedStudent.id || selectedStudent.full_name)}88`,
                }}
              >
                {getInitials(selectedStudent.full_name)}
              </div>
              <h2 className="text-xl font-bold">{selectedStudent.full_name}</h2>
            </div>

            <div className="space-y-2.5">
              {[
                { label: "Class", value: selectedStudent.class_name, icon: <School size={16} /> },
                { label: "Section", value: selectedStudent.section, icon: <Layers3 size={16} /> },
                { label: "Roll Number", value: selectedStudent.roll_no, icon: <Hash size={16} /> },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}
                >
                  <span style={{ color: "#ff6666" }}>{row.icon}</span>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: subTextColor }}>
                      {row.label}
                    </p>
                    <p className="text-sm font-bold">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedStudent(null)}
              className="mt-5 w-full py-2.5 rounded-xl font-bold text-white transition-transform active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #8b0000, #4d0000)" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}