"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../src/lib/supabase";
import { useTheme } from "../../../src/context/ThemeContext";
import {
  LayoutDashboard,
  BookOpen,
  PlusSquare,
  MessageCircle,
  CircleUserRound,
} from "lucide-react";
import MobileNavbar from "@/components/MobileNavbar";
import { motion, AnimatePresence } from "framer-motion";

export default function MobileClassmatesPage() {
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


  return (
    <div className="min-h-screen pb-24 transition-all duration-500" style={{background: bg, color: textColor}}>
        {loading && (
          <div className="loading-screen">
            <img src="/toggle-icon.png" className="loading-x" alt="loading" />
            <div className="loading-text">Loading Classmates</div>
          </div>
        )}
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-6">
        <div>
          <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{color: subTextColor}}>Your Class</p>
          <h1 className="text-2xl font-bold">Classmates</h1>
          <div className="mt-1 h-0.5 w-12 rounded-full" style={{background: "linear-gradient(90deg, #8b0000, transparent)"}} />
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <input
          type="text"
          placeholder="Search classmates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 rounded-xl outline-none"
          style={{background: inputBg, color: textColor, border}}
        />
      </div>

      {/* List */}
      <div className="px-4 space-y-3">
        {classmates
          .filter((student) => student.full_name.toLowerCase().includes(search.toLowerCase()))
          .map((student) => (
            <div
              key={student.id}
              onClick={() => setSelectedStudent(student)}
              className="p-4 rounded-2xl flex items-center gap-3 cursor-pointer active:scale-95 transition-all duration-200"
              style={{background: cardBg, border}}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0" style={{background: "linear-gradient(135deg, #6b0000, #3d0000)"}}>
                {student.full_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-sm truncate">{student.full_name}</h2>
                <p className="text-xs mt-0.5" style={{color: subTextColor}}>Roll {student.roll_no} • Sec {student.section}</p>
              </div>
              <span className="text-xs" style={{color: subTextColor}}>›</span>
            </div>
          ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
      {selectedStudent && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center z-50"
          style={{background: "rgba(0,0,0,0.7)"}}
          onClick={() => setSelectedStudent(null)}
        >
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.8,
              y: 50,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.8,
              y: 50,
            }}
            transition={{
              duration: 0.25,
            }}
            className="w-[90%] max-w-sm p-6 rounded-3xl"
            style={{background: darkMode ? "#1a0000" : "#fff5f5", color: textColor, border}}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-2xl" style={{background: "linear-gradient(135deg, #6b0000, #3d0000)"}}>
                {selectedStudent.full_name?.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedStudent.full_name}</h2>
                <p className="text-xs" style={{color: subTextColor}}>{selectedStudent.stream}</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between p-3 rounded-xl" style={{background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}}>
                <span className="text-sm" style={{color: subTextColor}}>Class</span>
                <span className="text-sm font-bold">{selectedStudent.class_name}</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl" style={{background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}}>
                <span className="text-sm" style={{color: subTextColor}}>Section</span>
                <span className="text-sm font-bold">{selectedStudent.section}</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl" style={{background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}}>
                <span className="text-sm" style={{color: subTextColor}}>Roll No</span>
                <span className="text-sm font-bold">{selectedStudent.roll_no}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedStudent(null)}
              className="w-full py-3 rounded-2xl font-bold text-sm"
              style={{background: "linear-gradient(135deg, #6b0000, #3d0000)", color: "#fff"}}
            >
              Close
            </button>
          </motion.div>
          
        </motion.div>
      )}
      </AnimatePresence>

      <MobileNavbar
        darkMode={darkMode}
        subTextColor={subTextColor}
        border={border}
      />
    </div>
  );
}