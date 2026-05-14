"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../src/lib/supabase";

export default function ProfileSetup() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [className, setClassName] = useState("");
  const [stream, setStream] = useState("");
  const [section, setSection] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }

      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single();

      // Profile already bani hai toh dashboard pe bhejo
      if (data?.full_name) {
        router.push("/dashboard");
      } else {
        setChecking(false);
      }
    }
    checkProfile();
  }, []);

  async function saveProfile() {
    // Compulsory fields check
    if (!fullName.trim()) return alert("Full Name");
    if (!className) return alert("Select Class");
    if (!stream) return alert("Stream");
    if (!section.trim()) return alert("Section");
    if (!rollNo.trim()) return alert("Roll No");

    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push("/");
      return;
    }

    const { error } = await supabase.from("profiles").insert({
      id: session.user.id,
      full_name: fullName,
      class_name: className,
      stream: stream,
      section: section,
      roll_no: rollNo,
    });

    if (error) {
      alert(error.message);
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  }

  if (checking) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      Loading...
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-zinc-900 p-8 rounded-2xl w-96">
        <h1 className="text-3xl font-bold mb-2 text-center">Setup Profile</h1>
        <p className="text-zinc-400 text-sm text-center mb-6">Please fill in your details to get started.</p>

        <input
          type="text"
          placeholder="Full Name *"
          className="w-full p-3 mb-4 rounded-lg bg-zinc-800 outline-none"
          onChange={(e) => setFullName(e.target.value)}
        />

        <select
          className="w-full p-3 mb-4 rounded-lg bg-zinc-700"
          onChange={(e) => setClassName(e.target.value)}
        >
          <option value="">Select Class *</option>
          <option value="XI">Class XI</option>
          <option value="XII">Class XII</option>
        </select>

        <select
          className="w-full p-3 mb-4 rounded-lg bg-zinc-700"
          onChange={(e) => setStream(e.target.value)}
        >
          <option value="">Select Stream *</option>
          <option value="Science">Science</option>
          <option value="Commerce">Commerce</option>
          <option value="Humanities">Humanities</option>
        </select>

        <input
          type="text"
          placeholder="Section (e.g. A, B, C) *"
          className="w-full p-3 mb-4 rounded-lg bg-zinc-800 outline-none"
          onChange={(e) => setSection(e.target.value)}
        />

        <input
          type="text"
          placeholder="Roll No *"
          className="w-full p-3 mb-6 rounded-lg bg-zinc-800 outline-none"
          onChange={(e) => setRollNo(e.target.value)}
        />

        <button
          onClick={saveProfile}
          className="w-full bg-blue-600 p-3 rounded-lg font-bold hover:bg-blue-700 transition"
        >
          {loading ? "Saving..." : "Save & Continue"}
        </button>
      </div>
    </div>
  );
}