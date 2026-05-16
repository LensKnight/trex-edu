"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../src/lib/supabase";

type Student = {
  id: string;
  full_name: string;
  username?: string;
  class_name: string;
  section: string;
  stream: string;
  roll_no: string;
  xp: number;
};

type Note = {
  id: string;
  uploader_id: string;
  title: string;
  subject: string;
  likes: number;
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  const bg =
    "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)";

  useEffect(() => {
    if (!authenticated) return;

    fetchAllData();

    const channel = supabase
      .channel("admin-realtime")

      // profiles realtime
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        async () => {
          await fetchStudents();
        }
      )

      // notes realtime
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notes",
        },
        async () => {
          await fetchNotes();
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authenticated]);

  async function fetchAllData() {
    setLoading(true);

    await Promise.all([
      fetchStudents(),
      fetchNotes(),
    ]);

    setLoading(false);
  }

  async function fetchStudents() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("section", { ascending: true });

    if (data) setStudents(data);
  }

  async function fetchNotes() {
    const { data } = await supabase
      .from("notes")
      .select("*");

    if (data) setNotes(data);
  }

  function checkPassword() {
    if (
      password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD
    ) {
      setAuthenticated(true);
    } else {
      alert("Wrong password!");
    }
  }

  async function sendAnnouncement() {
    if (!message.trim()) {
      return alert("Write something!");
    }

    setSending(true);

    const { error } = await supabase
      .from("announcements")
      .insert([{ message }]);

    if (error) {
      alert(error.message);
    } else {
      alert("Announcement sent! ✅");
      setMessage("");
    }

    setSending(false);
  }

  async function clearAnnouncements() {
    const { error } = await supabase
      .from("announcements")
      .delete()
      .neq(
        "id",
        "00000000-0000-0000-0000-000000000000"
      );

    if (error) {
      alert(error.message);
    } else {
      alert("Announcements cleared ✅");
    }
  }

  async function updateXP(
    userId: string,
    currentXP: number,
    amount: number
  ) {
    const newXP = Math.max(currentXP + amount, 0);

    // realtime ui instantly
    setStudents((prev) =>
      prev.map((student) =>
        student.id === userId
          ? { ...student, xp: newXP }
          : student
      )
    );

    const { error } = await supabase
      .from("profiles")
      .update({ xp: newXP })
      .eq("id", userId);

    if (error) {
      alert("XP update failed!");
      fetchStudents();
    }
  }

  async function resetXP(userId: string) {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === userId
          ? { ...student, xp: 0 }
          : student
      )
    );

    const { error } = await supabase
      .from("profiles")
      .update({ xp: 0 })
      .eq("id", userId);

    if (error) {
      alert("Reset failed!");
      fetchStudents();
    }
  }

  async function confirmDeleteStudent() {
    if (!deleteStudentId) return;

    await supabase
      .from("notes")
      .delete()
      .eq("uploader_id", deleteStudentId);

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", deleteStudentId);

    if (error) {
      alert("Delete failed!");
    } else {
      setStudents((prev) =>
        prev.filter(
          (student) =>
            student.id !== deleteStudentId
        )
      );

      setNotes((prev) =>
        prev.filter(
          (note) =>
            note.uploader_id !== deleteStudentId
        )
      );
    }

    setDeleteStudentId(null);
  }

  async function confirmDeleteNote() {
    if (!deleteNoteId) return;

    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", deleteNoteId);

    if (error) {
      alert("Delete failed!");
    } else {
      setNotes((prev) =>
        prev.filter(
          (note) => note.id !== deleteNoteId
        )
      );
    }

    setDeleteNoteId(null);
  }

  const filteredStudents = useMemo(() => {
    return students.filter((student) =>
      student.full_name
        ?.toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [students, search]);

  const groupedStudents =
    filteredStudents.reduce(
      (
        acc: Record<string, Student[]>,
        student
      ) => {
        const key = `${student.class_name} - Section ${student.section}`;

        if (!acc[key]) {
          acc[key] = [];
        }

        acc[key].push(student);

        return acc;
      },
      {}
    );

  if (!authenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-white"
        style={{ background: bg }}
      >
        <div
          className="p-8 rounded-3xl w-80"
          style={{
            background:
              "rgba(255,255,255,0.05)",
            border: "1px solid #3f0000",
          }}
        >
          <h1 className="text-3xl font-bold mb-6 text-center">
            🔒 Admin Access
          </h1>

          <input
            type="password"
            placeholder="Enter password"
            className="w-full p-3 mb-4 rounded-2xl outline-none text-white"
            style={{
              background:
                "rgba(255,255,255,0.06)",
              border:
                "1px solid #3f0000",
            }}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            onKeyDown={(e) =>
              e.key === "Enter" &&
              checkPassword()
            }
          />

          <button
            onClick={checkPassword}
            className="w-full p-3 rounded-2xl font-bold hover:scale-105 transition-all duration-300"
            style={{
              background:
                "linear-gradient(135deg, #9b0000, #3d0000)",
            }}
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-white p-4 md:p-8"
      style={{ background: bg }}
    >
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm uppercase tracking-widest text-zinc-400 mb-2">
          TreX Edu
        </p>

        <h1 className="text-4xl md:text-5xl font-bold">
          📢 Admin Hub
        </h1>

        <div
          className="mt-3 h-0.5 w-24 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, #8b0000, transparent)",
          }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Students",
            value: students.length,
            icon: "👨‍🎓",
          },
          {
            label: "Notes",
            value: notes.length,
            icon: "📄",
          },
          {
            label: "Total XP",
            value: students.reduce(
              (a, b) => a + (b.xp || 0),
              0
            ),
            icon: "⚡",
          },
          {
            label: "Likes",
            value: notes.reduce(
              (a, b) => a + (b.likes || 0),
              0
            ),
            icon: "❤️",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="p-5 rounded-3xl"
            style={{
              background:
                "linear-gradient(135deg, #6b0000, #1a0000)",
              border:
                "1px solid #3f0000",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span>{item.icon}</span>
              <p className="text-zinc-400 text-sm">
                {item.label}
              </p>
            </div>

            <h2 className="text-3xl font-bold">
              {item.value}
            </h2>
          </div>
        ))}
      </div>

      {/* Announcement */}
      <div
        className="p-6 rounded-3xl mb-8"
        style={{
          background:
            "rgba(255,255,255,0.04)",
          border:
            "1px solid #3f0000",
        }}
      >
        <h2 className="text-2xl font-bold mb-4">
          📢 Announcement Center
        </h2>

        <textarea
          placeholder="Write announcement..."
          value={message}
          onChange={(e) =>
            setMessage(e.target.value)
          }
          rows={4}
          className="w-full p-4 mb-4 rounded-2xl outline-none resize-none text-white"
          style={{
            background:
              "rgba(255,255,255,0.06)",
            border:
              "1px solid #3f0000",
          }}
        />

        <div className="flex gap-4 flex-wrap">
          <button
            onClick={sendAnnouncement}
            disabled={sending}
            className="px-6 py-3 rounded-2xl font-bold hover:scale-105 transition-all duration-300"
            style={{
              background:
                "linear-gradient(135deg, #9b0000, #3d0000)",
            }}
          >
            {sending
              ? "Sending..."
              : "Send Announcement 📢"}
          </button>

          <button
            onClick={clearAnnouncements}
            className="px-6 py-3 rounded-2xl font-bold bg-zinc-800 hover:bg-zinc-700 transition-all duration-300"
          >
            🗑️ Clear Announcements
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="🔍 Search students..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="w-full p-4 rounded-2xl outline-none text-white"
          style={{
            background:
              "rgba(255,255,255,0.05)",
            border:
              "1px solid #3f0000",
          }}
        />
      </div>

      {/* Students */}
      <div className="space-y-10">
        {Object.entries(groupedStudents).map(
          ([section, sectionStudents]) => (
            <div
              key={section}
              className="rounded-3xl p-6"
              style={{
                background:
                  "rgba(255,255,255,0.04)",
                border:
                  "1px solid #3f0000",
              }}
            >
              <h2 className="text-3xl font-bold mb-6">
                📚 {section}
              </h2>

              {/* 3 pc 2 tablet 1 mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {sectionStudents.map((student) => {
                  const studentNotes =
                    notes.filter(
                      (n) =>
                        n.uploader_id ===
                        student.id
                    );

                  const likes =
                    studentNotes.reduce(
                      (a, b) =>
                        a + (b.likes || 0),
                      0
                    );

                  return (
                    <div
                      key={student.id}
                      className="p-5 rounded-3xl"
                      style={{
                        background:
                          "linear-gradient(135deg, #4a0000, #170000)",
                        border:
                          "1px solid #3f0000",
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-2xl font-bold">
                            {
                              student.full_name
                            }
                          </h3>

                          <p className="text-zinc-400 text-sm">
                            Roll No:{" "}
                            {
                              student.roll_no
                            }
                          </p>

                          <p className="text-zinc-400 text-sm">
                            {
                              student.stream
                            }
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-zinc-400 text-sm">
                            XP
                          </p>

                          <h2 className="text-3xl font-bold text-red-400">
                            {student.xp}
                          </h2>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div
                          className="p-3 rounded-2xl"
                          style={{
                            background:
                              "rgba(255,255,255,0.05)",
                          }}
                        >
                          <p className="text-zinc-400 text-sm">
                            Notes
                          </p>

                          <h2 className="text-2xl font-bold">
                            {
                              studentNotes.length
                            }
                          </h2>
                        </div>

                        <div
                          className="p-3 rounded-2xl"
                          style={{
                            background:
                              "rgba(255,255,255,0.05)",
                          }}
                        >
                          <p className="text-zinc-400 text-sm">
                            Likes
                          </p>

                          <h2 className="text-2xl font-bold">
                            {likes}
                          </h2>
                        </div>
                      </div>

                      {/* XP Buttons */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <button
                          onClick={() =>
                            updateXP(
                              student.id,
                              student.xp,
                              10
                            )
                          }
                          className="p-3 rounded-2xl font-bold bg-green-700 hover:scale-105 transition-all"
                        >
                          +10 XP
                        </button>

                        <button
                          onClick={() =>
                            updateXP(
                              student.id,
                              student.xp,
                              -10
                            )
                          }
                          className="p-3 rounded-2xl font-bold bg-yellow-700 hover:scale-105 transition-all"
                        >
                          -10 XP
                        </button>

                        <button
                          onClick={() =>
                            updateXP(
                              student.id,
                              student.xp,
                              50
                            )
                          }
                          className="p-3 rounded-2xl font-bold bg-blue-700 hover:scale-105 transition-all"
                        >
                          +50 XP
                        </button>

                        <button
                          onClick={() =>
                            resetXP(
                              student.id
                            )
                          }
                          className="p-3 rounded-2xl font-bold bg-red-700 hover:scale-105 transition-all"
                        >
                          Reset XP
                        </button>
                      </div>

                      {/* Notes */}
                      <div className="space-y-2 mb-4 max-h-44 overflow-y-auto pr-1">
                        {studentNotes.map((note) => (
                          <div
                            key={note.id}
                            className="p-3 rounded-2xl flex items-center justify-between gap-2"
                            style={{
                              background:
                                "rgba(255,255,255,0.05)",
                            }}
                          >
                            <div className="min-w-0">
                              <p className="font-bold truncate text-sm">
                                {note.title}
                              </p>

                              <p className="text-xs text-zinc-400">
                                {note.subject} • ❤️{" "}
                                {note.likes}
                              </p>
                            </div>

                            <button
                              onClick={() =>
                                setDeleteNoteId(
                                  note.id
                                )
                              }
                              className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Delete student */}
                      <button
                        onClick={() =>
                          setDeleteStudentId(
                            student.id
                          )
                        }
                        className="w-full p-3 rounded-2xl bg-red-600 hover:bg-red-700 font-bold transition-all duration-300"
                      >
                        Delete Student
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>

      {/* Delete Student Warning */}
      {deleteStudentId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md p-8 rounded-3xl"
            style={{
              background:
                "linear-gradient(135deg, #2a0000, #120000)",
              border:
                "1px solid #3f0000",
            }}
          >
            <div className="text-center">
              <p className="text-5xl mb-4">
                ⚠️
              </p>

              <h2 className="text-3xl font-bold mb-3">
                Delete Student?
              </h2>

              <p className="text-zinc-400 mb-6">
                This will permanently delete
                the student and all uploaded
                notes.
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() =>
                    setDeleteStudentId(null)
                  }
                  className="flex-1 p-3 rounded-2xl bg-zinc-700 hover:bg-zinc-600 font-bold"
                >
                  Cancel
                </button>

                <button
                  onClick={
                    confirmDeleteStudent
                  }
                  className="flex-1 p-3 rounded-2xl bg-red-600 hover:bg-red-700 font-bold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Note Warning */}
      {deleteNoteId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md p-8 rounded-3xl"
            style={{
              background:
                "linear-gradient(135deg, #2a0000, #120000)",
              border:
                "1px solid #3f0000",
            }}
          >
            <div className="text-center">
              <p className="text-5xl mb-4">
                🗑️
              </p>

              <h2 className="text-3xl font-bold mb-3">
                Delete Note?
              </h2>

              <p className="text-zinc-400 mb-6">
                This note will be permanently
                removed.
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() =>
                    setDeleteNoteId(null)
                  }
                  className="flex-1 p-3 rounded-2xl bg-zinc-700 hover:bg-zinc-600 font-bold"
                >
                  Cancel
                </button>

                <button
                  onClick={
                    confirmDeleteNote
                  }
                  className="flex-1 p-3 rounded-2xl bg-red-600 hover:bg-red-700 font-bold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}