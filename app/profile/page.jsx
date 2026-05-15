"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../src/lib/supabase";
import useAuth from "../../src/hooks/useAuth";

export default function ProfilePage() {
  const router = useRouter();
  const { loading } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!loading) loadProfile();
  }, [loading]);

  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/"); return; }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    setProfile(data);
  }

  if (loading || !profile) return (
    <div className="loading-screen">
      <img src="/toggle-icon.png" className="loading-x" alt="loading" />
      <div className="loading-text">Loading</div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-zinc-900 p-8 rounded-2xl w-96">
        <h1 className="text-3xl font-bold mb-6 text-center">My Profile</h1>

        <div className="space-y-4">
          <div className="bg-zinc-800 p-4 rounded-xl">
            <p className="text-zinc-400 text-xs mb-1">Full Name</p>
            <p className="text-white font-bold">{profile.full_name}</p>
          </div>
          <div className="bg-zinc-800 p-4 rounded-xl">
            <p className="text-zinc-400 text-xs mb-1">Class</p>
            <p className="text-white font-bold">{profile.class_name}</p>
          </div>
          <div className="bg-zinc-800 p-4 rounded-xl">
            <p className="text-zinc-400 text-xs mb-1">Stream</p>
            <p className="text-white font-bold">{profile.stream}</p>
          </div>
          <div className="bg-zinc-800 p-4 rounded-xl">
            <p className="text-zinc-400 text-xs mb-1">Section</p>
            <p className="text-white font-bold">{profile.section}</p>
          </div>
          <div className="bg-zinc-800 p-4 rounded-xl">
            <p className="text-zinc-400 text-xs mb-1">Roll No</p>
            <p className="text-white font-bold">{profile.roll_no}</p>
          </div>
          <div className="bg-zinc-800 p-4 rounded-xl">
            <p className="text-zinc-400 text-xs mb-1">XP Earned</p>
            <p className="text-white font-bold">{profile.xp} XP</p>
          </div>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          className="w-full p-3 rounded-2xl text-white font-bold transition-all duration-300 hover:scale-105 flex items-center justify-center mt-4"
          style={{ background: "linear-gradient(135deg, #9b0000, #3d0000)" }}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}