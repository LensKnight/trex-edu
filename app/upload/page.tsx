"use client";

import { useState } from "react";
import { supabase } from "../../src/lib/supabase";
import { useRouter } from "next/navigation";
import useAuth from "../../src/hooks/useAuth";

export default function UploadPage() {
  const { loading } = useAuth();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  async function uploadNote() {
    if (!file) return alert("Select file");
    if (!title) return alert("Title daalo!");
    if (!subject) return alert("Subject select karo!");

    setUploading(true);

    const fileName = `${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("materials")
      .upload(fileName, file);

    if (uploadError) {
      setUploading(false);
      return alert(uploadError.message);
    }

    const fileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/materials/${fileName}`;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return alert("Login karo pehle!");
    }

    const { error: dbError } = await supabase
      .from("notes")
      .insert([{ title, subject, file_url: fileUrl, uploader_id: user.id }]);

    if (dbError) {
      setUploading(false);
      return alert(dbError.message);
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("xp")
      .eq("id", user.id)
      .single();

    const newXp = (profileData?.xp || 0) + 20;
    await supabase.from("profiles").update({ xp: newXp }).eq("id", user.id);

    router.push("/feed");
  }

  if (loading) return (
    <div className="loading-screen">
      <img src="/toggle-icon.png" className="loading-x" alt="loading" />
      <div className="loading-text">Loading</div>
    </div>
  );

  return (
    <div className="min-h-screen text-white flex items-center justify-center relative" style={{background: "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"}}>

      {/* Upload hone pe overlay */}
      {uploading && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
          <img src="/toggle-icon.png" className="loading-x" alt="loading" />
          <div className="loading-text mt-4">Uploading...</div>
        </div>
      )}

      <div className="bg-zinc-900 p-8 rounded-2xl w-96">
        <h1 className="text-3xl font-bold mb-6">Upload Notes</h1>

        <input
          type="text"
          placeholder="Title"
          disabled={uploading}
          className="w-full p-3 mb-4 rounded-lg bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onChange={(e) => setTitle(e.target.value)}
        />

        <select
          disabled={uploading}
          className="w-full p-3 mb-4 rounded-lg bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className={`block bg-zinc-700 p-4 rounded-2xl transition-all duration-300 transform ${uploading ? "opacity-50 cursor-not-allowed" : "hover:bg-zinc-800 hover:scale-105 cursor-pointer"}`}>
            Choose File
          </div>
          <input
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {file && (
          <p className="text-green-400 mb-4">Selected: {file.name}</p>
        )}

        <button
          onClick={uploadNote}
          disabled={uploading}
          className="w-full p-3 rounded-2xl text-white font-bold transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(130deg, #9b0000, #3d0000)" }}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>
    </div>
  );
}