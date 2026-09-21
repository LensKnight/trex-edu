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
  School,
  GraduationCap,
  Layers3,
  Hash,
  Zap,
  Users,
  LogOut,
  Settings,
  Megaphone,
  User,
  Loader2,
  ChevronRight,
  Quote,
  UploadCloud,
} from "lucide-react";
import MobileNavbar from "@/components/MobileNavbar";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/mobile/dashboard" },
  { label: "Notes Feed", icon: BookOpen, href: "/mobile/feed" },
  { label: "Announcements", icon: Megaphone, href: "/mobile/announcements" },
  { label: "Profile", icon: User, href: "/mobile/profile" },
];

const XP_PER_LEVEL = 100; // 5 uploads (+20 XP each) = 1 level

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function Skeleton({
  className = "",
  darkMode,
}: {
  className?: string;
  darkMode: boolean;
}) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{
        background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
      }}
    />
  );
}

export default function MobileProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { loading } = useAuth();
  const { darkMode } = useTheme();

  const [profile, setProfile] = useState<any>(null);

  /* ───────────── Theme colors ───────────── */

  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";

  const textColor = darkMode ? "#ffffff" : "#1a0000";
  const subTextColor = darkMode ? "#a1a1aa" : "#8b0000";

  const panelBg = darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.75)";
  const heroBg = darkMode ? "#160404" : "#ffffff";
  const border = darkMode ? "1px solid #3f0000" : "1px solid #ffb3b3";
  const divider = darkMode ? "rgba(255,255,255,0.07)" : "rgba(139,0,0,0.1)";

  const bannerBg = darkMode
    ? "linear-gradient(135deg, #8b0000 0%, #3d0000 55%, #1a0000 100%)"
    : "linear-gradient(135deg, #ff8080 0%, #ffb3b3 55%, #ffe4e4 100%)";

  const sidebarBg = darkMode
    ? "rgba(15, 0, 0, 0.9)"
    : "rgba(255, 255, 255, 0.9)";

  /* ───────────── Data ───────────── */

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

  /* ───────────── Derived values ───────────── */

  const ready = !!profile;

  const xp: number = profile?.xp ?? 0;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpInLevel = xp % XP_PER_LEVEL;
  const xpToNext = XP_PER_LEVEL - xpInLevel;
  const levelPct = (xpInLevel / XP_PER_LEVEL) * 100;

  const academicRows = [
    { label: "Class", value: profile?.class_name, icon: School },
    { label: "Stream", value: profile?.stream, icon: GraduationCap },
    { label: "Section", value: profile?.section, icon: Layers3 },
    { label: "Roll Number", value: profile?.roll_no, icon: Hash },
  ];

  const bio = profile?.description || "MVM-IV Student";

  /* ───────────── UI ───────────── */

  return (
    <div
      className="min-h-screen flex transition-all duration-500"
      style={{ background: bg, color: textColor }}
    >
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
                    border: isActive
                      ? "1px solid rgba(139, 0, 0, 0.4)"
                      : "1px solid transparent",
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
              <p className="font-bold leading-none truncate">
                {profile?.full_name || "Student"}
              </p>
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
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md bg-black/60">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-2" />
            <p className="text-xs font-semibold tracking-wide text-zinc-300">
              Loading your profile...
            </p>
          </div>
        )}

        {/* Mobile top bar */}
        <div
          className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b backdrop-blur-xl"
          style={{ background: sidebarBg, borderColor: "#3f0000" }}
        >
          <div className="flex items-center gap-2.5">
            <img
              src={darkMode ? "/toogle-trex.png" : "/trex-dark.png"}
              alt="TreX Edu"
              className="h-10 w-auto object-contain"
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
            <Settings size={18} />
          </a>
        </div>

        <div className="p-4 pb-28 md:pb-10 max-w-xl mx-auto">
          {/* Header (desktop only, mobile uses the sticky top bar above) */}
          <div className="hidden md:flex items-center justify-between mb-6 pt-4">
            <div>
              <p
                className="text-xs font-medium tracking-widest uppercase mb-1"
                style={{ color: subTextColor }}
              >
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

          <p
            className="md:hidden text-xs font-medium tracking-widest uppercase mb-3 pt-4"
            style={{ color: subTextColor }}
          >
            Student Profile
          </p>

          {/* ───────── Hero: banner + overlapping avatar ───────── */}
          <div
            className="shine-effect relative rounded-3xl mb-4 overflow-hidden"
            style={{
              background: heroBg,
              border,
              boxShadow: "0 16px 40px -20px rgba(139,0,0,0.5)",
            }}
          >
            {/* Banner */}
            <div className="relative h-28" style={{ background: bannerBg }}>
              <img
                src="/mvmlogo.png"
                alt=""
                className="absolute inset-0 w-full h-full object-contain opacity-20 pointer-events-none p-3"
              />
            </div>

            {/* Avatar + identity */}
            <div className="relative px-5 pb-6 -mt-11 flex flex-col items-center text-center">
              <div
                className="w-[88px] h-[88px] rounded-full flex items-center justify-center font-black text-2xl text-white"
                style={{
                  background: "linear-gradient(135deg, #ff6666, #8b0000)",
                  border: `4px solid ${heroBg}`,
                  boxShadow: "0 8px 24px -8px rgba(139,0,0,0.7)",
                }}
              >
                {ready ? getInitials(profile.full_name) : ""}
              </div>

              <div className="mt-3 w-full flex flex-col items-center">
                {ready ? (
                  <h2 className="text-xl font-bold">
                    {profile.full_name || "Student"}
                  </h2>
                ) : (
                  <Skeleton darkMode={darkMode} className="h-6 w-40" />
                )}

                <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
                  {ready ? (
                    <>
                      <span
                        className="px-3 py-1 rounded-full text-[11px] font-bold border"
                        style={{
                          background: "rgba(139,0,0,0.12)",
                          borderColor: "rgba(139,0,0,0.3)",
                          color: darkMode ? "#ff8080" : "#8b0000",
                        }}
                      >
                        {profile.class_name} • {profile.section}
                      </span>

                      {profile.roll_no && (
                        <span
                          className="px-3 py-1 rounded-full text-[11px] font-bold border"
                          style={{
                            background: panelBg,
                            borderColor: darkMode ? "#3f0000" : "#ffb3b3",
                            color: subTextColor,
                          }}
                        >
                          Roll {profile.roll_no}
                        </span>
                      )}
                    </>
                  ) : (
                    <Skeleton darkMode={darkMode} className="h-6 w-28" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ───────── XP + Level ───────── */}
          <div
            className="p-5 rounded-3xl mb-4"
            style={{ background: panelBg, border }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(245,158,11,0.15)" }}
                >
                  <Zap size={22} className="text-amber-400" />
                </div>
                <div>
                  {ready ? (
                    <p className="text-2xl font-extrabold leading-none">
                      {xp}
                      <span
                        className="text-xs font-bold ml-1"
                        style={{ color: subTextColor }}
                      >
                        XP
                      </span>
                    </p>
                  ) : (
                    <Skeleton darkMode={darkMode} className="h-7 w-20" />
                  )}
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider mt-1"
                    style={{ color: subTextColor }}
                  >
                    Experience Earned
                  </p>
                </div>
              </div>

              {ready && (
                <div
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold text-white"
                  style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)" }}
                >
                  LVL {level}
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div
              className="w-full h-2.5 rounded-full overflow-hidden"
              style={{ background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(139,0,0,0.1)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: ready ? `${levelPct}%` : "0%",
                  background: "linear-gradient(90deg, #f59e0b, #ef4444)",
                }}
              />
            </div>

            <div className="flex items-center justify-between mt-2.5">
              <p className="text-[10px] font-semibold" style={{ color: subTextColor }}>
                {ready
                  ? `${xpToNext} XP to Level ${level + 1}`
                  : "Loading progress..."}
              </p>

              <Link
                href="/mobile/upload"
                className="inline-flex items-center gap-1 text-[10px] font-bold"
                style={{ color: darkMode ? "#ff8080" : "#8b0000" }}
              >
                <UploadCloud size={12} /> Upload a note (+20 XP)
              </Link>
            </div>
          </div>

          {/* ───────── Academic details ───────── */}
          <div
            className="rounded-3xl mb-4 overflow-hidden"
            style={{ background: panelBg, border }}
          >
            <p
              className="px-5 pt-4 pb-2 text-[10px] font-bold uppercase tracking-widest"
              style={{ color: subTextColor }}
            >
              Academic Info
            </p>

            {academicRows.map((row, i) => (
              <div
                key={row.label}
                className="flex items-center gap-3 px-5 py-3.5"
                style={{ borderTop: i === 0 ? "none" : `1px solid ${divider}` }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(139,0,0,0.12)",
                    color: darkMode ? "#ff6666" : "#8b0000",
                  }}
                >
                  <row.icon size={17} />
                </div>

                <p className="text-xs font-medium flex-1" style={{ color: subTextColor }}>
                  {row.label}
                </p>

                {ready ? (
                  <p className="text-sm font-bold text-right break-words">
                    {row.value || "—"}
                  </p>
                ) : (
                  <Skeleton darkMode={darkMode} className="h-4 w-16" />
                )}
              </div>
            ))}
          </div>

          {/* ───────── Bio ───────── */}
          <div
            className="relative p-5 rounded-3xl mb-4 overflow-hidden"
            style={{ background: panelBg, border }}
          >
            <Quote
              size={56}
              className="absolute -top-1 right-3 opacity-[0.07] pointer-events-none"
            />
            <p
              className="text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ color: subTextColor }}
            >
              What Describes You?
            </p>
            {ready ? (
              <p className="text-sm font-semibold leading-relaxed italic break-words">
                “{bio}”
              </p>
            ) : (
              <Skeleton darkMode={darkMode} className="h-4 w-3/4" />
            )}
          </div>

          {/* ───────── Actions ───────── */}
          <Link
            href="/mobile/classmates"
            className="flex items-center gap-3 p-4 rounded-2xl mb-3 transition-transform active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #6b0000, #3d0000)" }}
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
              <Users size={19} />
            </div>
            <div className="flex-1 min-w-0 text-white">
              <p className="text-sm font-bold leading-tight">View Classmates</p>
              <p className="text-[10px] font-medium opacity-70 mt-0.5">
                See who's in your class
              </p>
            </div>
            <ChevronRight size={18} className="text-white/70 shrink-0" />
          </Link>

          <button
            onClick={logout}
            className="md:hidden w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl text-sm font-bold border transition-transform active:scale-[0.98]"
            style={{
              color: "#ff6666",
              borderColor: "rgba(255,102,102,0.35)",
              background: "transparent",
            }}
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </div>

      <div className="md:hidden">
        <MobileNavbar darkMode={darkMode} subTextColor={subTextColor} border={border} />
      </div>
    </div>
  );
}