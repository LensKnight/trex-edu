"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import useAuth from "../../src/hooks/useAuth";

type Note = {
  id: string;
  title: string;
  subject: string;
  file_url: string;
  likes: number;
  uploader_id: string;
};

export default function FeedPage() {
  const { session, loading } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [liking, setLiking] = useState<string | null>(null);
  const [likedNotes, setLikedNotes] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && session) {
      fetchNotes();
      fetchLikedNotes();
    }
  }, [loading, session]);

  async function fetchNotes() {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setNotes(data);
  }

  async function fetchLikedNotes() {
    const { data } = await supabase
      .from("note_likes")
      .select("note_id")
      .eq("user_id", session!.user.id);
    if (data) setLikedNotes(data.map((d) => d.note_id));
  }

  async function likeNote(note: Note) {
    if (!session) return;
    if (liking === note.id) return;

    if (note.uploader_id === session.user.id) {
      return alert("Apna note like nahi kar sakte! 😄");
    }

    if (likedNotes.includes(note.id)) {
      return alert("Ye note pehle se like kar chuke ho!");
    }

    setLiking(note.id);

    // note_likes table mein insert karo
    const { error: likeError } = await supabase
      .from("note_likes")
      .insert({ note_id: note.id, user_id: session.user.id });

    if (likeError) {
      setLiking(null);
      return alert("Like nahi hua, dobara try karo!");
    }

    // notes table mein likes count badhao
    const newLikes = (note.likes || 0) + 1;
    await supabase.from("notes").update({ likes: newLikes }).eq("id", note.id);

    // uploader ka XP badhao +5
    const { data: profileData } = await supabase
      .from("profiles")
      .select("xp")
      .eq("id", note.uploader_id)
      .single();
    const newXp = (profileData?.xp || 0) + 5;
    await supabase.from("profiles").update({ xp: newXp }).eq("id", note.uploader_id);

    // UI update karo
    setLikedNotes((prev) => [...prev, note.id]);
    setNotes((prev) =>
      prev.map((n) => n.id === note.id ? { ...n, likes: newLikes } : n)
    );
    setLiking(null);
  }

  const subjects = [
    "Physics",
    "Chemistry",
    "Mathematics",
    "Computer Science",
    "English",
    "Physical Education",
  ];

  if (loading) return (
    <div className="loading-screen">
      <img src="/toggle-icon.png" className="loading-x" alt="loading" />
      <div className="loading-text">Loading</div>
    </div>
  );

  return (
    <div className="text-white p-8 min-h-screen" style={{background: "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"}}>
      <h1 className="text-5xl font-bold mb-10">Notes Feed</h1>
      {subjects.map((subject) => {
        const filteredNotes = notes.filter((note) => note.subject === subject);
        if (filteredNotes.length === 0) return null;
        return (
          <div key={subject} className="mb-12">
            <h2 className="text-3xl font-bold mb-5">{subject}</h2>
            <div className="grid grid-cols-2 gap-5">
              {filteredNotes.map((note) => {
                const alreadyLiked = likedNotes.includes(note.id);
                const isOwn = note.uploader_id === session?.user.id;
                return (
                  <div key={note.id} className="bg-zinc-900 p-5 rounded-3xl">
                    <h3 className="text-2xl font-bold mb-2">{note.title}</h3>
                    <p className="text-zinc-400 mb-4">{note.subject}</p>
                    <div className="flex items-center gap-3">
                      <a href={note.file_url} target="_blank" className="bg-blue-600 px-4 py-2 rounded-xl inline-block hover:bg-blue-700 transition">
                        Open Note
                      </a>
                      <button
                        onClick={() => likeNote(note)}
                        disabled={liking === note.id || alreadyLiked || isOwn}
                        className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
                          alreadyLiked || isOwn
                            ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                            : "bg-zinc-800 hover:bg-zinc-700"
                        }`}
                      >
                        {alreadyLiked ? "❤️" : "🤍"} {note.likes || 0}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}