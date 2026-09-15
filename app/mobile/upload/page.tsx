"use client";

import { useState } from "react";
import { supabase } from "../../../src/lib/supabase";
import { useRouter } from "next/navigation";
import useAuth from "../../../src/hooks/useAuth";
import { useTheme } from "../../../src/context/ThemeContext";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import MobileNavbar from "@/components/MobileNavbar";
import { motion, AnimatePresence } from "framer-motion";

export default function MobileUploadPage() {
  const { loading } = useAuth();
  const { darkMode } = useTheme();
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const bg = darkMode
    ? "radial-gradient(ellipse at top, #2d0606 0%, #0d0d11 100%)"
    : "radial-gradient(ellipse at top, #fff5f5 0%, #f8fafc 100%)";

  const textColor = darkMode ? "#f4f4f5" : "#0f172a";
  const subTextColor = darkMode ? "#a1a1aa" : "#64748b";

  const cardBg = darkMode
    ? "rgba(24, 24, 27, 0.75)"
    : "rgba(255, 255, 255, 0.85)";

  const border = darkMode
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.08)";

  const inputBg = darkMode
    ? "rgba(39, 39, 42, 0.6)"
    : "rgba(241, 245, 249, 0.8)";

  async function uploadNote() {
    setProgress(0);
    setUploading(true);

    const interval = setInterval(() => {
      setProgress((old) => (old >= 90 ? old : old + Math.random() * 10));
    }, 200);

    if (!file) {
      clearInterval(interval);
      setUploading(false);
      return alert("Please select a file to upload.");
    }
    if (!title) {
      clearInterval(interval);
      setUploading(false);
      return alert("Enter Note Title!");
    }
    if (!subject) {
      clearInterval(interval);
      setUploading(false);
      return alert("Select Subject!");
    }
    if (!category) {
      clearInterval(interval);
      setUploading(false);
      return alert("Select Category!");
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in first!");

      const { data: profile } = await supabase
        .from("profiles")
        .select("class_name, section")
        .eq("id", user.id)
        .single();

      const MAX_SIZE = 20 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        throw new Error(
          `File too large (${(file.size / 1024 / 1024).toFixed(
            1
          )}MB). Select file smaller than 20MB.`
        );
      }

      const form = new FormData();
      form.append("chat_id", "-1003724740509");
      form.append("document", file);
      form.append(
        "caption",
        `📚 New Note Uploaded!\n\n📌 Title: ${title}\n📘 Subject: ${subject}\n🏷️ Category: ${category}`
      );

      const tgRes = await fetch(
        `https://api.telegram.org/bot${process.env.NEXT_PUBLIC_BOT_TOKEN}/sendDocument`,
        { method: "POST", body: form }
      );
      const tgData = await tgRes.json();
      if (!tgData.ok)
        throw new Error(tgData.description || "Telegram upload failed");

      const file_id = tgData?.result?.document?.file_id || null;

      const { error: dbError } = await supabase.from("notes").insert([
        {
          title,
          subject,
          category,
          uploader_id: user.id,
          class_name: profile?.class_name,
          section: profile?.section,
          file_id,
        },
      ]);
      if (dbError) throw dbError;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("xp")
        .eq("id", user.id)
        .single();
      const newXp = (profileData?.xp || 0) + 20;
      await supabase.from("profiles").update({ xp: newXp }).eq("id", user.id);

      clearInterval(interval);
      setProgress(100);
      setTimeout(() => {
        router.push("/mobile/feed");
      }, 500);
    } catch (err: any) {
      clearInterval(interval);
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="min-h-screen pb-28 pt-6 px-4 transition-colors duration-300 max-w-lg mx-auto relative"
      style={{ background: bg, color: textColor }}
    >
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md bg-black/60">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-2" />
          <p className="text-xs font-semibold tracking-wide text-zinc-300">
            Initializing Studio...
          </p>
        </div>
      )}

      {/* Upload Progress Modal */}
      <AnimatePresence>
        {uploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black/75 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-6 rounded-3xl w-full max-w-xs text-center border shadow-2xl"
              style={{
                background: darkMode ? "#18181b" : "#ffffff",
                borderColor: border,
              }}
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <UploadCloud className="animate-bounce" size={28} />
              </div>
              <h3 className="text-sm font-bold mb-1">Uploading Notes</h3>
              <p
                className="text-xs mb-5 font-medium"
                style={{ color: subTextColor }}
              >
                Syncing with Cloud Repository...
              </p>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-zinc-500/10 rounded-full overflow-hidden mb-3">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #dc2626, #991b1b)",
                  }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
              <p className="text-xs font-extrabold text-red-500">
                {Math.floor(progress)}%
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-red-500/10 text-red-500 border border-red-500/20 mb-2">
          <Sparkles size={11} /> Community Repository
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Notes</h1>
        <p className="text-xs mt-1 font-medium" style={{ color: subTextColor }}>
          Share study material, class notes, and revision guides with peers.
        </p>
      </div>

      {/* Upload Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-3xl backdrop-blur-xl mb-6"
        style={{
          background: cardBg,
          border: `1px solid ${border}`,
          boxShadow: darkMode
            ? "0 10px 30px -10px rgba(0,0,0,0.5)"
            : "0 10px 25px -10px rgba(0,0,0,0.05)",
        }}
      >
        <div className="space-y-4">
          {/* Note Title */}
          <div>
            <label
              className="block mb-1.5 text-xs font-semibold"
              style={{ color: subTextColor }}
            >
              Note Title
            </label>
            <input
              type="text"
              placeholder="e.g. Chapter 4 — Thermodynamics"
              disabled={uploading}
              value={title}
              className="w-full p-3 rounded-2xl outline-none text-xs font-medium border transition-all placeholder:text-zinc-500 disabled:opacity-50"
              style={{
                background: inputBg,
                color: textColor,
                borderColor: border,
              }}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Subject Dropdown */}
          <div>
            <label
              className="block mb-1.5 text-xs font-semibold"
              style={{ color: subTextColor }}
            >
              Subject
            </label>
            <select
              disabled={uploading}
              value={subject}
              className="w-full p-3 rounded-2xl outline-none text-xs font-medium border transition-all disabled:opacity-50"
              style={{
                background: inputBg,
                color: textColor,
                borderColor: border,
              }}
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
          </div>

          {/* Category Dropdown */}
          <div>
            <label
              className="block mb-1.5 text-xs font-semibold"
              style={{ color: subTextColor }}
            >
              Category
            </label>
            <select
              disabled={uploading}
              value={category}
              className="w-full p-3 rounded-2xl outline-none text-xs font-medium border transition-all disabled:opacity-50"
              style={{
                background: inputBg,
                color: textColor,
                borderColor: border,
              }}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select Category</option>
              <option value="School Notes">School Notes</option>
              <option value="Extra Notes">Extra Notes</option>
              <option value="Projects">Projects</option>
            </select>
          </div>

          {/* File Upload Drop Zone */}
          <div>
            <label
              className="block mb-1.5 text-xs font-semibold"
              style={{ color: subTextColor }}
            >
              Attachment
            </label>
            {!file ? (
              <label
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                  uploading ? "opacity-50 cursor-not-allowed" : "hover:border-red-500/50"
                }`}
                style={{
                  background: inputBg,
                  borderColor: border,
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
                  <UploadCloud size={20} />
                </div>
                <span className="text-xs font-bold mb-0.5">
                  Tap to upload document
                </span>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: subTextColor }}
                >
                  PDF, PNG, JPG (Max 20MB)
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="application/pdf,image/*"
                  disabled={uploading}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            ) : (
              <div
                className="p-3.5 rounded-2xl border flex items-center justify-between"
                style={{
                  background: inputBg,
                  borderColor: border,
                }}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold truncate">{file.name}</p>
                    <p
                      className="text-[10px] font-semibold"
                      style={{ color: subTextColor }}
                    >
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setFile(null)}
                  disabled={uploading}
                  className="p-1 rounded-full text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={uploadNote}
            disabled={uploading}
            className="w-full mt-2 p-3.5 rounded-2xl font-bold text-xs tracking-wide text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #dc2626, #991b1b)",
              boxShadow: "0 4px 15px rgba(220, 38, 38, 0.3)",
            }}
          >
            <UploadCloud size={16} />
            Publish Note (+20 XP)
          </button>
        </div>
      </motion.div>

      <MobileNavbar
        darkMode={darkMode}
        subTextColor={subTextColor}
        border={border}
      />
    </div>
  );
}