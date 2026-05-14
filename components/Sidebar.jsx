"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../src/lib/supabase";

export default function Sidebar({ collapsed, setCollapsed }) {
  const [profile, setProfile] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      setProfile(data);
    }
    fetchProfile();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "⚡" },
    { href: "/upload", label: "Upload Notes", icon: "📤" },
    { href: "/feed", label: "Notes Feed", icon: "📚" },
  ];

  return (
    <div
      className="h-screen fixed left-0 top-0 flex flex-col transition-all duration-300 ease-in-out z-50"
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
      style={{
        width: collapsed ? "60px" : "250px",
        background: "linear-gradient(180deg, #1a0000 0%, #0d0000 50%, #000000 100%)",
        borderRight: "1px solid #3f0000",
        overflow: "hidden",
      }}
    >
      {/* Top — Logo + Toggle */}
      <div className="flex items-center justify-between px-4 py-5 shrink-0">
        {!collapsed && (
          <img src="/toogle-trex.png" alt="TreX Edu" className="h-22 object-contain -mt-4" />
        )}

      </div>

      {/* Profile Card */}
      {!collapsed && (
        <div className="px-4 mb-4">
          {profile ? (
            <a href="/profile" className="p-4 rounded-2xl block transition-all duration-300 hover:scale-105" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #3f0000" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ background: "linear-gradient(135deg, #6b0000, #3d0000)" }}>
                  {profile.full_name?.charAt(0)}
                </div>
                <div>
                  <p className="text-white text-sm font-bold">{profile.full_name}</p>
                  <p className="text-zinc-400 text-xs">{profile.stream}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="text-xs px-2 py-1 rounded-lg text-red-300" style={{ background: "rgba(100,0,0,0.4)" }}>
                  {profile.class_name}
                </span>
                <span className="text-xs px-2 py-1 rounded-lg text-red-300" style={{ background: "rgba(100,0,0,0.4)" }}>
                  Sec {profile.section}
                </span>
              </div>
            </a>
          ) : (
            <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-zinc-500 text-sm">Profile not set</p>
            </div>
          )}
        </div>
      )}

      {/* Collapsed profile avatar */}
      {collapsed && profile && (
        <div className="flex justify-center mb-4">
          <a href="/profile">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: "linear-gradient(135deg, #6b0000, #3d0000)" }}>
              {profile.full_name?.charAt(0)}
            </div>
          </a>
        </div>
      )}

      {/* Nav Links */}
      <div className="flex-1 px-2 space-y-2">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center p-3 rounded-2xl text-zinc-300 hover:text-white transition-all duration-300 hover:scale-105"
            style={{
              background: "rgba(255,255,255,0.03)",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: collapsed ? "0" : "12px",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(100,0,0,0.3)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
            title={collapsed ? item.label : ""}
          >
            <span className="text-xl">{item.icon}</span>
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </a>
        ))}
      </div>

      {/* Logout */}
      <div className="p-3 mt-4">
        <button
          onClick={logout}
          className="w-full p-3 rounded-2xl text-white font-bold transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #6b0000, #3d0000)" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "linear-gradient(135deg, #8b0000, #5d0000)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "linear-gradient(135deg, #6b0000, #3d0000)"}
        >
          {collapsed ? "🚪" : "Logout"}
        </button>
      </div>

    </div>
  );
}