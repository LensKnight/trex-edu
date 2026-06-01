"use client";

import { useState } from "react";
import { supabase } from "../../../src/lib/supabase";
import { useRouter } from "next/navigation";
import useAuth from "../../../src/hooks/useAuth";
import { useTheme } from "../../../src/context/ThemeContext";
import {
  LayoutDashboard,
  BookOpen,
  PlusSquare,
  MessageCircle,
  CircleUserRound,
} from "lucide-react";

export default function MobileUploadPage() {
  const { loading } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";
  const textColor = darkMode ? "#ffffff" : "#1a0000";
  const subTextColor = darkMode ? "#a1a1aa" : "#8b0000";
  const cardBg = darkMode ? "#18181b" : "#ffcccc";
  const inputBg = darkMode ? "#3f3f46" : "#ffd0d0";
  const border = darkMode ? "1px solid #3f0000" : "1px solid #ffb3b3";

  async function uploadNote() {
    setProgress(0);
    setUploading(true);

    const interval = setInterval(() => {
      setProgress((old) => (old >= 90 ? old : old + Math.random() * 10));
    }, 200);

    if (!file) { clearInterval(interval); setUploading(false); return alert("Select file"); }
    if (!title) { clearInterval(interval); setUploading(false); return alert("Enter Title!"); }
    if (!subject) { clearInterval(interval); setUploading(false); return alert("Enter Subject!"); }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login karo pehle!");

      const { data: profile } = await supabase.from("profiles").select("class_name, section").eq("id", user.id).single();

      const MAX_SIZE = 20 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). select file smaller than 20MB.`);
      }

      const form = new FormData();
      form.append("chat_id", "-1003724740509");
      form.append("document", file);
      form.append("caption", `📚 New Note Uploaded!\n\n📌 Title: ${title}\n📘 Subject: ${subject}`);

      const tgRes = await fetch(`https://api.telegram.org/bot${process.env.NEXT_PUBLIC_BOT_TOKEN}/sendDocument`, { method: "POST", body: form });
      const tgData = await tgRes.json();
      if (!tgData.ok) throw new Error(tgData.description || "Telegram upload failed");

      const file_id = tgData?.result?.document?.file_id || null;

      const { error: dbError } = await supabase.from("notes").insert([{
        title, subject,
        uploader_id: user.id,
        class_name: profile?.class_name,
        section: profile?.section,
        file_id,
      }]);
      if (dbError) throw dbError;

      const { data: profileData } = await supabase.from("profiles").select("xp").eq("id", user.id).single();
      const newXp = (profileData?.xp || 0) + 20;
      await supabase.from("profiles").update({ xp: newXp }).eq("id", user.id);

      clearInterval(interval);
      setProgress(100);
      setTimeout(() => { router.push("/mobile/feed"); }, 500);

    } catch (err: any) {
      clearInterval(interval);
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return (
    <div className="loading-screen">
      <img src="/toggle-icon.png" className="loading-x" alt="loading" />
      <div className="loading-text">Loading</div>
    </div>
  );

  return (
    <div className="min-h-screen pb-24 transition-all duration-500" style={{background: bg, color: textColor}}>

      {uploading && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
          <img src="/toggle-icon.png" className="loading-x" alt="loading" />
          <div className="w-64 mt-6 bg-gray-700 rounded-full h-3 overflow-hidden">
            <div className="h-3 rounded-full transition-all duration-200" style={{width: `${progress}%`, background: "linear-gradient(90deg, #8b0000, #ff4444)"}} />
          </div>
          <div className="text-white mt-3 text-sm">Uploading... {Math.floor(progress)}%</div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-6">
        <div>
          <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{color: subTextColor}}>Share Your Note</p>
          <h1 className="text-2xl font-bold">Upload Notes</h1>
          <div className="mt-1 h-0.5 w-12 rounded-full" style={{background: "linear-gradient(90deg, #8b0000, transparent)"}} />
        </div>
      </div>

      {/* Form */}
      <div className="px-4 mt-4">
        <div className="p-5 rounded-3xl" style={{background: cardBg, border}}>

          <input
            type="text"
            placeholder="Title"
            disabled={uploading}
            className="w-full p-3 mb-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed outline-none"
            style={{background: inputBg, color: textColor, border}}
            onChange={(e) => setTitle(e.target.value)}
          />

          <select
            disabled={uploading}
            className="w-full p-3 mb-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed outline-none"
            style={{background: inputBg, color: textColor, border}}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="">Select Subject</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Computer Science">Computer Science</option>
            <option value="English">English</option>
            <option value="Physical Education">Physical Education</option>
          </select>

          <label className="block mb-4">
            <div className={`p-4 rounded-xl text-center transition-all duration-300 ${uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              style={{background: inputBg, border, color: subTextColor}}>
              Choose File
              <p className="text-xs mt-1">(PDF and images only)</p>
            </div>
            <input type="file" className="hidden" disabled={uploading} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>

          {file && (
            <p className="mb-4 text-sm" style={{color: "#22c55e"}}>✅ {file.name}</p>
          )}

          <button
            onClick={uploadNote}
            disabled={uploading}
            className="w-full p-3 rounded-2xl text-white font-bold transition-all duration-300"
            style={{background: "linear-gradient(135deg, #8b0000, #3d0000)"}}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>

      {/* Bottom Nav */}
      <div
        className="fixed bottom-4 left-4 right-4 flex items-center justify-around p-3 z-40 rounded-3xl glass"
        style={{
          background: darkMode
            ? "rgba(13,0,0,0.75)"
            : "rgba(255,245,245,0.7)",
          border,
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter:
            "blur(18px)",
        }}
      >
        <a
          href="/mobile/dashboard"
          className="flex flex-col items-center gap-1"
        >
          <span className="text-xl">
            <LayoutDashboard size={22} />
          </span>

          <span
            className="text-xs"
            style={{
              color: subTextColor,
            }}
          >
            Home
          </span>
        </a>

        <a
          href="/mobile/feed"
          className="flex flex-col items-center gap-1"
        >
          <span className="text-xl">
            <BookOpen size={22} />
          </span>

          <span
            className="text-xs"
            style={{
              color: subTextColor,
            }}
          >
            Notes
          </span>
        </a>

        <a
          href="/mobile/upload"
          className="flex flex-col items-center gap-1"
        >
          <span className="text-xl">
            <PlusSquare size={22} />
          </span>

          <span
            className="text-xs"
            style={{
              color: subTextColor,
            }}
          >
            Upload
          </span>
        </a>

        <a
          href="/mobile/chat"
          className="flex flex-col items-center gap-1"
        >
          <span className="text-xl">
            <MessageCircle size={22} />
          </span>

          <span
            className="text-xs"
            style={{
              color: subTextColor,
            }}
          >
            Chat
          </span>
        </a>

        <a
          href="/mobile/profile"
          className="flex flex-col items-center gap-1"
        >
          <span className="text-xl">
            <CircleUserRound size={22} />
          </span>

          <span
            className="text-xs"
            style={{
              color: subTextColor,
            }}
          >
            Profile
          </span>
        </a>
      </div>
    </div>
  );
}