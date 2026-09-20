"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../../src/lib/supabase";
import useAuth from "../../../src/hooks/useAuth";
import { useTheme } from "../../../src/context/ThemeContext";
import {
  LayoutDashboard,
  BookOpen,
  PlusSquare,
  MessageCircle,
  CircleUserRound,
  School,
  GraduationCap,
  Layers3,
  Hash,
  Zap,
  Sparkles,
  Users,
  LogOut,
  Settings,
  Megaphone,
  User,
} from "lucide-react";
import MobileNavbar from "@/components/MobileNavbar";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/mobile/dashboard" },
  { label: "Notes Feed", icon: BookOpen, href: "/mobile/feed" },
  { label: "Announcements", icon: Megaphone, href: "/mobile/announcements" },
  { label: "Profile", icon: User, href: "/mobile/profile" },
];

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function MobileProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { loading } = useAuth();
  const { darkMode, setDarkMode } = useTheme();

  const [profile, setProfile] = useState<any>(null);

  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";

  const textColor = darkMode ? "#ffffff" : "#1a0000";

  const subTextColor = darkMode ? "#a1a1aa" : "#8b0000";

  const cardBg = darkMode
    ? "linear-gradient(135deg, #6b1a1a, #2d0a0a)"
    : "linear-gradient(135deg, #ffcccc, #ffb3b3)";

  const sectionBg = darkMode
    ? "rgba(255,255,255,0.04)"
    : "rgba(0,0,0,0.08)";

  const border = darkMode
    ? "1px solid #3f0000"
    : "1px solid #ffb3b3";

  const sidebarBg = darkMode
    ? "rgba(15, 0, 0, 0.9)"
    : "rgba(255, 255, 255, 0.9)";

  useEffect(() => {
    if (!loading) loadProfile();
  }, [loading]);

  async function loadProfile() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    setProfile(data);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const details = [
    {
      label: "Class",
      value: profile?.class_name,
      icon: <School size={20} />,
    },
    {
      label: "Stream",
      value: profile?.stream,
      icon: <GraduationCap size={20} />,
    },
    {
      label: "Section",
      value: profile?.section,
      icon: <Layers3 size={20} />,
    },
    {
      label: "Roll Number",
      value: profile?.roll_no,
      icon: <Hash size={20} />,
    },
    {
      label: "XP Earned",
      value: `${profile?.xp} XP`,
      icon: <Zap size={20} />,
    },
    {
      label: "What Describes You?",
      value: profile?.description || "MVM-IV Student",
      icon: <Sparkles size={20} />,
    },
  ];

  return (
    <div className="min-h-screen flex transition-all duration-500" style={{ background: bg, color: textColor }}>
      {/* Desktop sidebar */}
      <aside
        className="w-64 hidden md:flex flex-col justify-between p-4 sticky top-0 h-screen border-r backdrop-blur-xl shrink-0"
        style={{ background: sidebarBg, borderColor: "#3f0000" }}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-3 py-2">

            <span className="font-extrabold text-lg tracking-tight">TreX Edu</span>
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: isActive ? "rgba(139, 0, 0, 0.25)" : "transparent",
                    color: isActive ? "#ff6666" : subTextColor,
                    border: isActive ? "1px solid rgba(139, 0, 0, 0.4)" : "1px solid transparent",
                  }}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t pt-4 px-2 space-y-2" style={{ borderColor: "#3f0000" }}>
          <div className="flex items-center gap-2 px-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
              style={{ background: "linear-gradient(135deg, #ff6666, #8b0000)" }}
            >
              {getInitials(profile?.full_name)}
            </div>
            <div className="text-xs min-w-0">
              <p className="font-bold leading-none truncate">{profile?.full_name || "Student"}</p>
              <p className="text-[10px] mt-0.5" style={{ color: subTextColor }}>
                {profile?.class_name} • {profile?.section}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold"
            style={{ color: "#ff6666" }}
          >
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0">
        {loading && (
          <div className="loading-screen">
            <img src="/toggle-icon.png" className="loading-x" alt="loading" />
            <div className="loading-text">Loading Profile</div>
          </div>
        )}

        {/* Mobile top bar */}
        <div
          className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b backdrop-blur-xl"
          style={{ background: sidebarBg, borderColor: "#3f0000" }}
        >
          <div className="flex items-center gap-2.5">

            <span className="font-extrabold text-base tracking-tight">TreX Edu</span>
          </div>

          <a
            href="/mobile/settings"
            className="p-2 rounded-xl"
            style={{
              background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              color: textColor,
            }}
          >
            <Settings size={18} />
          </a>
        </div>

        <div className="p-4 pb-24 md:pb-10 max-w-3xl mx-auto">
          {/* Header (desktop only, mobile uses the sticky top bar above) */}
          <div className="hidden md:flex items-center justify-between mb-6 pt-4">
            <div>
              <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: subTextColor }}>
                Student Profile
              </p>
              <h1 className="text-2xl font-bold">My Profile</h1>
              <div
                className="mt-1 h-0.5 w-12 rounded-full"
                style={{ background: "linear-gradient(90deg, #8b0000, transparent)" }}
              />
            </div>
            <a
              href="/mobile/settings"
              className="p-2 rounded-xl"
              style={{
                background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                color: textColor,
              }}
            >
              <Settings size={20} />
            </a>
          </div>

          <p className="md:hidden text-xs font-medium tracking-widest uppercase mb-3 pt-4" style={{ color: subTextColor }}>
            Student Profile
          </p>

          {/* Top Card */}
          <div
            className="shine-effect relative p-6 rounded-3xl mb-6 text-center overflow-hidden"
            style={{ background: cardBg, boxShadow: "0 16px 40px -20px rgba(139,0,0,0.5)" }}
          >
            <img
              src="/mvmlogo.png"
              alt=""
              className="absolute inset-0 w-full h-full object-contain opacity-20 pointer-events-none p-2"
            />

            <div className="relative flex flex-col items-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center font-black text-2xl text-white mb-3"
                style={{
                  background: "linear-gradient(135deg, #ff6666, #8b0000)",
                  boxShadow: "0 8px 24px -8px rgba(139,0,0,0.7)",
                  border: "3px solid rgba(255,255,255,0.25)",
                }}
              >
                {getInitials(profile?.full_name)}
              </div>

              <h2 className="text-xl font-bold mb-1">{profile?.full_name}</h2>

              <p className="text-sm" style={{ color: subTextColor }}>
                {profile?.class_name} • {profile?.section}
              </p>

              <div className="mt-4 flex items-center justify-center gap-3">
                <div
                  className="px-5 py-2.5 rounded-2xl flex items-center gap-2"
                  style={{ background: sectionBg }}
                >
                  <Zap size={16} className="text-amber-400" />
                  <div className="text-left">
                    <p className="text-lg font-bold leading-none">{profile?.xp}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: subTextColor }}>
                      XP
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {details.map((item) => (
              <div
                key={item.label}
                className="p-4 rounded-2xl transition-all hover:scale-[1.01]"
                style={{ background: sectionBg, border }}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0" style={{ color: "#ff6666" }}>
                    {item.icon}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs mb-1 uppercase tracking-wider" style={{ color: subTextColor }}>
                      {item.label}
                    </p>
                    <p className="font-bold text-sm break-words">{item.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-3 mt-4">
            <a
              href="/mobile/classmates"
              className="flex-1 p-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #6b0000, #3d0000)" }}
            >
              <Users size={18} />
              View Classmates
            </a>

            <button
              onClick={logout}
              className="flex-1 p-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2 md:hidden transition-transform active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #8b0000, #4d0000)" }}
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="md:hidden">
        <MobileNavbar darkMode={darkMode} subTextColor={subTextColor} border={border} />
      </div>
    </div>
  );
}