"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";

export default function ClassmatesPage() {
  const [classmates, setClassmates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  useEffect(() => {
    async function fetchClassmates() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("class_name", profile.class_name)
        .eq("section", profile.section);

      setClassmates(data || []);
      setLoading(false);
    }

    fetchClassmates();
  }, []);

  if (loading)
    return (
      <div className="loading-screen">
        <img src="/toggle-icon.png" className="loading-x" alt="loading" />
        <div className="loading-text">Loading Classmates</div>
      </div>
    );

  return (
    <div className="p-6 min-h-screen bg-black text-white">

      {/* Header */}
      <h1 className="text-5xl font-bold">Your Classmates</h1>

      <div
        className="h-0.5 w-16 rounded-full mb-4"
        style={{
          background: "linear-gradient(90deg, #8b0000, transparent)",
        }}
      />

      {/* Search */}
      <input
        type="text"
        placeholder="Search classmates..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-6 p-3 rounded-xl outline-none text-white"
        style={{
          background: "#1a1a1a",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      />

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classmates
          .filter((student) =>
            student.full_name
              .toLowerCase()
              .includes(search.toLowerCase())
          )
          .map((student) => (
            <div
              key={student.id}
              onClick={() => setSelectedStudent(student)}
              className="p-4 rounded-2xl shadow-lg hover:scale-102 transition-all duration-300 cursor-pointer"
              style={{
                background:
                  "linear-gradient(135deg, #9b0000, #3d0000, #1a0000)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <h2 className="text-lg font-bold text-white">
                🌐 {student.full_name}
              </h2>

              <p className="text-sm text-gray-200">
                Class: {student.class_name}
              </p>

              <p className="text-sm text-gray-300">
                Section: {student.section}
              </p>

              <p className="text-xs text-gray-400 mt-2">
                Roll No: {student.roll_no}
              </p>
            </div>
          ))}
      </div>

      {/* POPUP MODAL */}
      {selectedStudent && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="w-80 p-6 rounded-2xl text-white"
            style={{
              background:
                "linear-gradient(135deg, #9b0000, #3d0000, #1a0000)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-3">
              {selectedStudent.full_name}
            </h2>

            <p className="text-sm text-gray-200">
              Class: {selectedStudent.class_name}
            </p>

            <p className="text-sm text-gray-300">
              Section: {selectedStudent.section}
            </p>

            <p className="text-sm text-gray-300">
              Roll No: {selectedStudent.roll_no}
            </p>

            <button
              onClick={() => setSelectedStudent(null)}
              className="mt-4 w-full py-2 rounded-xl bg-black hover:scale-105 transition-all duration-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}