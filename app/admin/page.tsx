"use client";

import { useState } from "react";
import { supabase } from "../../src/lib/supabase";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  function checkPassword() {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setAuthenticated(true);
    } else {
      alert("Wrong password!");
    }
  }

  async function sendAnnouncement() {
    if (!message.trim()) return alert("Message likho!");
    setSending(true);
    const { error } = await supabase.from("announcements").insert([{ message }]);
    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("Announcement sent! ✅");
      setMessage("");
    }
    setSending(false);
  }

  async function clearAnnouncements() {
    const { error } = await supabase.from("announcements").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) alert("Error: " + error.message);
    else alert("All announcements cleared! ✅");
  }

  if (!authenticated) return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-zinc-900 p-8 rounded-2xl w-80 text-center">
        <h1 className="text-2xl font-bold mb-6">🔒 Admin Access</h1>
        <input
          type="password"
          placeholder="Enter password"
          className="w-full p-3 mb-4 rounded-xl bg-zinc-800 outline-none"
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && checkPassword()}
        />
        <button
          onClick={checkPassword}
          className="w-full p-3 rounded-2xl text-white font-bold hover:scale-102 transition-all duration-300"
          style={{background: "linear-gradient(135deg, #9b0000, #3d0000)"}}
        >
          Login
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-2">📢 Admin Panel</h1>
      <p className="text-zinc-400 mb-8">TreX Edu Announcements</p>

      <div className="bg-zinc-900 p-6 rounded-3xl max-w-xl hover:scale-102 transition-all duration-300 mb-6">
        <h2 className="text-xl font-bold mb-4">New Announcement</h2>
        <textarea
          placeholder="Write your announcement..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="w-full p-3 mb-4 rounded-xl bg-zinc-800 outline-none resize-none"
        />
        <button
          onClick={sendAnnouncement}
          disabled={sending}
          className="w-full p-3 rounded-2xl text-white font-bold hover:scale-102 transition-all duration-300"
          style={{background: "linear-gradient(135deg, #9b0000, #3d0000)"}}
        >
          {sending ? "Sending..." : "Send Announcement 📢"}
        </button>
      </div>

      <div className="max-w-xl">
        <button
          onClick={clearAnnouncements}
          className="w-full p-3 rounded-2xl text-white font-bold hover:scale-102 transition-all duration-300 bg-zinc-700 hover:bg-zinc-600"
        >
          🗑️ Clear All Announcements
        </button>
      </div>
    </div>
  );
}