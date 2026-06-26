"use client";

import { useState } from "react";
import { supabase } from "../../src/lib/supabase";

export default function PhotoUploadPage() {
  const [username, setUsername] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");

      async function fetchStudent(username: string) {
      if (username.length < 8) {
        setFullName("");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("username", username)
        .single();

      if (data) {
        setFullName(data.full_name);
      } else {
        setFullName("");
      }
    }    
  

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {

    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

    async function uploadPhoto() {
    if (!username)
        return alert("Enter Username");

    if (!file)
        return alert("Choose Photo");

    setLoading(true);

    const form = new FormData();
    
    form.append("username", username);
    form.append("photo", file);
    form.append("full_name", fullName);

    const res = await fetch(
        "/api/upload-photo",
        {
        method: "POST",
        body: form,
        }
    );

    const data = await res.json();

    setLoading(false);

    if (data.success) {
        alert("Photo Uploaded Successfully!");

        setUsername("");
        setFile(null);
        setPreview("");
        setFullName("");
    } else {
        alert("Upload Failed");
        console.log(data);
    }
    }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{
        background:
          "radial-gradient(circle at top,#3b0000,#000 55%)",
      }}
    >
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-xl p-8 shadow-2xl">

        <div className="text-center mb-8">
          <img
            src="/toogle-trex.png"
            className="h-24 mx-auto mb-4"
          />

          <h1 className="text-3xl font-bold text-white">
            Upload Your Photo
          </h1>

          <p className="text-zinc-400 mt-2 text-sm">
            Admin will soon add your image to your TreX Profile
          </p>
        </div>

        <input
          type="text"
          placeholder="Username (Example: MVM1234H)"
          value={username}
          onChange={async (e) => {
            const value = e.target.value.toUpperCase();

            setUsername(value);

            await fetchStudent(value);
          }}
          className="w-full mb-4 rounded-xl bg-zinc-900 border border-zinc-700 p-3 text-white outline-none focus:border-red-600"
        />
          {fullName && (
            <div className="mb-4 rounded-xl border border-green-700 bg-green-900/20 p-3">
              <p className="text-green-400 text-sm">
                👤 {fullName}
              </p>
            </div>
          )}
        <input
        id="photoInput"
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
        />

        <label
        htmlFor="photoInput"
        className="w-full flex items-center justify-center gap-2 cursor-pointer rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition-all duration-300 p-3 text-white font-medium"
        >
        📷 Choose Photo
        </label>

        {file && (
        <p className="text-center text-sm text-green-400 mt-3">
            ✅ {file.name}
        </p>
        )}

        {preview && (
          <div className="flex justify-center mb-6">
            <img
              src={preview}
              className="w-40 h-40 rounded-2xl object-cover border border-zinc-700"
            />
          </div>
        )}

        <div className="bg-zinc-900 rounded-2xl p-4 mb-6 text-sm text-zinc-300">

          <h2 className="font-semibold text-white mb-2">
            Requirements
          </h2>

          <ul className="space-y-1">
            <li>- Face clearly visible</li>
            <li>- JPG / PNG / WEBP</li>
            <li>- Maximum 5 MB</li>
            <li>- Good lighting</li>
          </ul>

        </div>

        <button
          onClick={uploadPhoto}
          disabled={loading || !fullName}
          className="w-full rounded-xl bg-red-700 hover:bg-red-600 disabled:bg-zinc-700 disabled:cursor-not-allowed transition p-3 font-semibold text-white"
        >
          {loading
            ? "Uploading..."
            : fullName
            ? "Upload Photo"
            : "Enter Valid Username"}
        </button>

        <p className="text-center text-zinc-500 text-xs mt-6">
          Your photo will only be used inside TreX EDU.
        </p>

      </div>
    </div>
  );
}