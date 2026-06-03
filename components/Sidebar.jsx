"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../src/lib/supabase";
import { usePathname } from "next/navigation";
import { useTheme } from "../src/context/ThemeContext";
import {
  LayoutDashboard,
  Upload,
  BookOpen,
  Users,
  MessageCircle,
  Bell,
  LogOut,
  Settings,
  Bot,
} from "lucide-react";

export default function Sidebar({ collapsed, setCollapsed }) {
  const [profile, setProfile] = useState(null);
  const router = useRouter();
  const pathname = usePathname();
  const { darkMode } = useTheme();

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
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { href: "/upload", label: "Upload Notes", icon: <Upload size={20} /> },
    { href: "/ai-teacher", label: "AI Teacher", icon: <Bot size={20} /> },
    { href: "/feed", label: "Notes Feed", icon: <BookOpen size={20} /> },
    { href: "/classmates", label: "Classmates", icon: <Users size={20} /> },
    { href: "/chat", label: "Class Chat", icon: <MessageCircle size={20} /> },
    { href: "/announcements", label: "Announcements", icon: <Bell size={20} /> },
    { href: "/settings", label: "Settings", icon: <Settings size={20} /> },
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
      {/* Top — Logo */}
      <div className="flex items-center justify-between px-4 py-5 shrink-0">
        {!collapsed && (
          <img src="/toogle-trex.png" alt="TreX Edu" className="h-22 object-contain -mt-4" />
        )}
      </div>

      {/* Profile Card */}
      {!collapsed && (
        <div className="px-4 mb-4">
          {profile ? (
            <div className="p-4 rounded-2xl relative overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #3f0000" }}>
              <img src="/mvmlogo.png" alt="" className="absolute inset-0 w-full h-full object-contain opacity-10 pointer-events-none p-2" />
              <div className="flex items-center justify-between relative z-10">
                <a href="/profile" className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ background: "linear-gradient(135deg, #6b0000, #3d0000)" }}>
                    {profile.full_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold">{profile.full_name}</p>
                    <p className="text-zinc-400 text-xs">{profile.stream}</p>
                  </div>
                </a>
                <button
                  onClick={logout}
                  className="text-zinc-400 hover:text-red-400 ml-2 transition-all duration-200"
                  title="Logout"
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.2)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                  style={{transition: "transform 0.2s ease"}}
                >
                  <LogOut size={16} />
                </button>
              </div>
              <div className="mt-3 flex gap-2 relative z-10">
                <span className="text-xs px-2 py-1 rounded-lg text-red-300" style={{ background: "rgba(100,0,0,0.4)" }}>
                  {profile.class_name}
                </span>
                <span className="text-xs px-2 py-1 rounded-lg text-red-300" style={{ background: "rgba(100,0,0,0.4)" }}>
                  Sec {profile.section}
                </span>
              </div>
            </div>
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
      <div className="flex-1 px-2 space-y-1">
      {navItems.map((item) => {
        const active = pathname === item.href;

        return (
          <a
            key={item.href}
            href={item.href}
            className="relative flex items-center p-3 rounded-2xl transition-all duration-300"
            style={{
              justifyContent: collapsed
                ? "center"
                : "flex-start",
              gap: collapsed ? "0" : "12px",

              background: active
                ? darkMode
                  ? "linear-gradient(135deg, rgba(120,0,0,0.45), rgba(60,0,0,0.45))"
                  : "linear-gradient(135deg, rgba(255,220,220,0.95), rgba(255,190,190,0.95))"
                : darkMode
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(0,0,0,0.03)",

              border: active
                ? darkMode
                  ? "1px solid rgba(255,80,80,0.25)"
                  : "1px solid rgba(255,120,120,0.4)"
                : "1px solid transparent",

              color: active
                ? darkMode
                  ? "#ffffff"
                  : "#8b0000"
                : darkMode
                  ? "#a1a1aa"
                  : "#666666",

              boxShadow: active
                ? darkMode
                  ? "0 0 20px rgba(255,0,0,0.15)"
                  : "0 4px 20px rgba(255,100,100,0.25)"
                : "none",
            }}
            title={collapsed ? item.label : ""}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span className="font-medium text-sm">
              
            {item.label}</span>}
          </a>
        );

      })}
      </div>

      {/* Collapsed logout */}
      {collapsed && (
        <div className="p-3 mb-2">
          <button
            onClick={logout}
            className="w-full p-3 rounded-2xl flex items-center justify-center text-zinc-400 hover:text-red-400 transition-all duration-300 hover:scale-105"
            style={{ background: "rgba(100,0,0,0.2)" }}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      )}
    </div>
  );
}