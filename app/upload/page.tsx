"use client";

import { useState } from "react";
import { supabase } from "../../src/lib/supabase";
import { useRouter } from "next/navigation";
import useAuth from "../../src/hooks/useAuth";
import { useTheme } from "../../src/context/ThemeContext";

export default function UploadPage() {
  const { loading } = useAuth();
  const [progress, setProgress] = useState(0);
  const { darkMode, setDarkMode } = useTheme();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";
  const textColor = darkMode ? "#ffffff" : "#1a0000";
  const subTextColor = darkMode ? "#a1a1aa" : "#8b0000";
  const cardBg = darkMode
    ? "linear-gradient(160deg, #1c1c1f 0%, #150505 100%)"
    : "linear-gradient(160deg, #ffffff 0%, #ffe0e0 100%)";
  const inputBg = darkMode ? "#1b1b1e" : "#ffd0d0";
  const border = darkMode ? "1px solid #3f0000" : "1px solid #ffb3b3";

  async function uploadNote() {
    if (!file) return alert("Select file");
    if (!title) return alert("Enter Title!");
    if (!subject) return alert("Enter Subject!");
    if (!category) return alert("Enter Category!");

    setProgress(0);
    setUploading(true);

    const interval = setInterval(() => {
      setProgress((old) => (old >= 90 ? old : old + Math.random() * 10));
    }, 200);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login first!");

      const { data: profile } = await supabase
        .from("profiles")
        .select("class_name, section")
        .eq("id", user.id)
        .single();

      const MAX_SIZE = 30 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). select file smaller than 30MB.`);
      }

      const form = new FormData();
      form.append("chat_id", "-1003724740509");
      form.append("document", file);
      form.append("caption", `📚 New Note Uploaded!\n\n📌 Title: ${title}\n📘 Subject: ${subject}\n🏷️ Category: ${category}`);

      const tgRes = await fetch(
        `https://api.telegram.org/bot${process.env.NEXT_PUBLIC_BOT_TOKEN}/sendDocument`,
        { method: "POST", body: form }
      );

      const tgData = await tgRes.json();
      if (!tgData.ok) throw new Error(tgData.description || "Telegram upload failed");

      const file_id = tgData?.result?.document?.file_id || null;

      const { error: dbError } = await supabase.from("notes").insert([{
        title,
        subject,
        category,
        uploader_id: user.id,
        class_name: profile?.class_name,
        section: profile?.section,
        file_id,
      }]);
      if (dbError) throw dbError;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("xp")
        .eq("id", user.id)
        .single();

      await supabase
        .from("profiles")
        .update({ xp: (profileData?.xp || 0) + 20 })
        .eq("id", user.id);

      clearInterval(interval);
      setProgress(100);
      setTimeout(() => router.push("/feed"), 500);

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
    <div className="min-h-screen relative transition-all duration-500" style={{background: bg, color: textColor}}>

      <div className="min-h-screen flex items-center justify-center px-4">
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
            <img src="/toggle-icon.png" className="loading-x" alt="loading" />
            <div className="w-64 mt-6 bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-200"
                style={{width: `${progress}%`, background: "linear-gradient(90deg, #8b0000, #ff4444)"}}
              />
            </div>
            <div className="text-white mt-3 text-sm">
              Uploading... {Math.floor(progress)}%
            </div>
          </div>
        )}

        <div
          className="p-8 rounded-3xl w-full max-w-md transition-all duration-500"
          style={{
            background: cardBg,
            border,
            boxShadow: darkMode
              ? "0 1px 2px rgba(0,0,0,0.3), 0 20px 40px -20px rgba(0,0,0,0.6)"
              : "0 1px 2px rgba(139,0,0,0.05), 0 20px 40px -20px rgba(139,0,0,0.25)",
          }}
        >
          <div className="mb-7">
            <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{color: subTextColor}}>Share Your Note</p>
            <h1 className="text-3xl font-bold">Upload Notes</h1>
            <div className="mt-2 h-0.5 w-16 rounded-full" style={{background: "linear-gradient(90deg, #8b0000, transparent)"}}></div>
          </div>

          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{color: subTextColor}}>
            Title
          </label>
          <input
            type="text"
            placeholder="e.g. Chapter 4 — Thermodynamics"
            disabled={uploading}
            className="w-full p-3 mb-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed outline-none transition-colors focus:border-transparent"
            style={{background: inputBg, color: textColor, border}}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{color: subTextColor}}>
            Subject
          </label>
          <select
            disabled={uploading}
            className="w-full p-3 mb-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed outline-none"
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

          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{color: subTextColor}}>
            Category
          </label>
          <select
            disabled={uploading}
            value={category}
            className="w-full p-3 mb-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed outline-none"
            style={{background: inputBg, color: textColor, border}}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select Category</option>
            <option value="School Notes">School Notes</option>
            <option value="Extra Notes">Extra Notes</option>
            <option value="Projects">Projects</option>
          </select>

          <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{color: subTextColor}}>
            File
          </label>
          <label className="block mb-2">
            <div className={`p-4 rounded-xl transition-all duration-300 text-center ${uploading ? "opacity-50 cursor-not-allowed" : "hover:brightness-110 cursor-pointer"}`}
              style={{background: inputBg, border, color: subTextColor}}>
              Choose File
              <p className="text-xs mt-1">(PDF and images, max 30MB)</p>
            </div>
            <input type="file" className="hidden" disabled={uploading} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>

          {file && (
            <p className="mb-4 text-sm" style={{color: "#22c55e"}}>✅ Selected: {file.name}</p>
          )}

          <button
            onClick={uploadNote}
            disabled={uploading}
            className="w-full p-3 mt-2 rounded-2xl text-white font-bold transition-all duration-300 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{background: "linear-gradient(135deg, #8b0000, #3d0000)"}}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}