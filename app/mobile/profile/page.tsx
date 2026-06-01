"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";

export default function MobileProfilePage() {
  const router = useRouter();
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

  if (loading || !profile)
    return (
      <div className="loading-screen">
        <img
          src="/toggle-icon.png"
          className="loading-x"
          alt="loading"
        />
        <div className="loading-text">Loading Profile</div>
      </div>
    );

  return (
    <div
      className="min-h-screen transition-all duration-500"
      style={{ background: bg, color: textColor }}
    >
      
      <div className="p-4 pb-24">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-4">
          <div>
            <p
              className="text-xs font-medium tracking-widest uppercase mb-1"
              style={{ color: subTextColor }}
            >
              Student Profile
            </p>

            <h1 className="text-2xl font-bold">
              My Profile
            </h1>

            <div
              className="mt-1 h-0.5 w-12 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, #8b0000, transparent)",
              }}
            />
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl text-sm"
            style={{
              background: darkMode
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.1)",
              color: textColor,
            }}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Top Card */}
        <div
          className="shine-effect p-5 rounded-3xl mb-6 text-center"
          style={{ background: cardBg }}
        >
          <div className="flex justify-center mb-3">

          </div>
          <img src="/mvmlogo.png" alt="" className="absolute inset-0 w-full h-full object-contain opacity-30 pointer-events-none p-2" />

          <h2 className="text-xl font-bold mb-1">
            {profile.full_name}
          </h2>

          <p
            className="text-sm"
            style={{ color: subTextColor }}
          >
            {profile.class_name} • {profile.section}
          </p>

          <div className="mt-4 flex items-center justify-center gap-3">
            <div
              className="px-4 py-2 rounded-2xl"
              style={{ background: sectionBg }}
            >
              <p className="text-lg font-bold">
                {profile.xp}
              </p>
              <p
                className="text-xs"
                style={{ color: subTextColor }}
              >
                XP
              </p>
            </div>

          </div>
        </div>

        {/* Details */}
        <div className="space-y-3">

          {[
            {
                label: "Class",
                value: profile.class_name,
                icon: <School size={22} />,
              },
              {
                label: "Stream",
                value: profile.stream,
                icon: <GraduationCap size={22} />,
              },
              {
                label: "Section",
                value: profile.section,
                icon: <Layers3 size={22} />,
              },
              {
                label: "Roll Number",
                value: profile.roll_no,
                icon: <Hash size={22} />,
              },
              {
                label: "XP Earned",
                value: `${profile.xp} XP`,
                icon: <Zap size={22} />,
              },
              {
                label: "What Describes You?",
                value:
                  profile.description ||
                  "MVM-IV Student",
                icon: <Sparkles size={22} />,
              },
          ].map((item) => (
            <div
              key={item.label}
              className="p-4 rounded-2xl"
              style={{
                background: sectionBg,
                border,
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="shrink-0"
                  style={{ color: "#ff6666" }}
                >
                  {item.icon}
                </div>

                <div>
                  <p
                    className="text-xs mb-1 uppercase tracking-wider"
                    style={{ color: subTextColor }}
                  >
                    {item.label}
                  </p>

                  <p className="font-bold text-sm wrap-break-words">
                    {item.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

       <a
          href="/mobile/classmates"
            className="w-full p-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2 mt-2"
            style={{background: "linear-gradient(135deg, #6b0000, #3d0000)"}}
          >
            <>
              <Users size={18} />
              View Classmates
            </>
        </a>

        <button
          onClick={logout}
          className="w-full p-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2 mt-4"
          style={{ background: "linear-gradient(135deg, #8b0000, #4d0000)" }}
        >
          <>
            <LogOut size={18} />
            Logout
          </>
        </button>
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