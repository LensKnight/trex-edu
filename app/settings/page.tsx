"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import { useTheme } from "../../src/context/ThemeContext";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";

import {
  Palette,
  User,
  Users,
  GraduationCap,
  BarChart3,
  Info,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  FileText,
  Heart,
  Zap,
} from "lucide-react";
import useAuth from "@/src/hooks/useAuth";

export default function SettingsPage() {
  const { darkMode, setDarkMode } = useTheme();
  const router = useRouter();
  const { loading } = useAuth();
  const [collapsed, setCollapsed] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [notesCount, setNotesCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);

  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";

  const textColor = darkMode ? "#fff" : "#1a0000";

  const cardBg = darkMode
    ? "rgba(255,255,255,0.04)"
    : "rgba(255,255,255,0.65)";

  const border = darkMode
    ? "1px solid #3f0000"
    : "1px solid #ffb3b3";

  const subTextColor = darkMode
    ? "#a1a1aa"
    : "#8b0000";

  useEffect(() => {
    loadData();
  }, []);

  

  async function loadData() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    setProfile(profileData);

    const { data: notes } = await supabase
      .from("notes")
      .select("*")
      .eq("uploader_id", session.user.id);

    setNotesCount(notes?.length || 0);

    const totalLikes =
      notes?.reduce(
        (sum, note) => sum + (note.likes || 0),
        0
      ) || 0;

    setLikesCount(totalLikes);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

    if (loading)
    return (
        <div className="loading-screen">
        <img
            src="/toggle-icon.png"
            className="loading-x"
            alt="loading"
        />
        <div className="loading-text">
            Loading Settings
        </div>
        </div>
    );

  return (
    <div
      className="min-h-screen"
      style={{
        background: bg,
        color: textColor,
      }}
    >
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <main
        className="transition-all duration-300 p-8"
        style={{
          marginLeft: collapsed
            ? "60px"
            : "250px",
        }}
      >
        {/* HEADER */}

        <div className="mb-8">
          <p
            className="uppercase text-xs tracking-[0.25em]"
            style={{
              color: subTextColor,
            }}
          >
            Preferences
          </p>

          <h1 className="text-4xl font-bold mt-2">
            Settings
          </h1>

          <div
            className="mt-3 h-0.5 w-16 rounded-full"
            style={{
              background:
                "linear-gradient(90deg,#8b0000,transparent)",
            }}
          />
        </div>

        {/* APPEARANCE */}

        <div
          className="p-6 rounded-3xl mb-6"
          style={{
            background: cardBg,
            border,
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Palette size={22} />
            <h2 className="font-bold text-xl">
              Appearance
            </h2>
          </div>

          <button
            onClick={() =>
              setDarkMode(!darkMode)
            }
            className="px-5 py-3 rounded-2xl flex items-center gap-3"
            style={{
              background: darkMode
                ? "#2d0000"
                : "#fff",
              border,
            }}
          >
            {darkMode ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}

            {darkMode
              ? "Light Mode"
              : "Dark Mode"}
          </button>
        </div>

        {/* PROFILE */}

        <div
          className="p-6 rounded-3xl mb-6"
          style={{
            background: cardBg,
            border,
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <User size={22} />
            <h2 className="font-bold text-xl">
              Profile
            </h2>
          </div>

          <div className="space-y-3">

            <a
              href="/profile"
              className="flex items-center justify-between p-4 rounded-2xl transition-all duration-300 hover:scale-102"
              style={{
                background:
                  "rgba(255,255,255,0.03)",
              }}
            >
              <span>View Profile</span>
              <ChevronRight size={18} />
            </a>

            <a
              href="/classmates"
              className="flex items-center justify-between p-4 rounded-2xl transition-all duration-300 hover:scale-102"
              style={{
                background:
                  "rgba(255,255,255,0.03)",
              }}
            >
              <span>View Classmates</span>
              <Users size={18} />
            </a>

          </div>
        </div>

        {/* ACADEMIC */}

        <div
          className="p-6 rounded-3xl mb-6"
          style={{
            background: cardBg,
            border,
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap size={22} />
            <h2 className="font-bold text-xl">
              Academic Information
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">

            <InfoCard
              title="Class"
              value={profile?.class_name}
            />

            <InfoCard
              title="Stream"
              value={profile?.stream}
            />

            <InfoCard
              title="Section"
              value={profile?.section}
            />

            <InfoCard
              title="Roll Number"
              value={profile?.roll_no}
            />

          </div>
        </div>

        {/* STATS */}

        <div
          className="p-6 rounded-3xl mb-6"
          style={{
            background: cardBg,
            border,
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 size={22} />
            <h2 className="font-bold text-xl">
              Statistics
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">

            <StatCard
              icon={<Zap size={20} />}
              label="XP"
              value={profile?.xp || 0}
            />

            <StatCard
              icon={<FileText size={20} />}
              label="Notes"
              value={notesCount}
            />

            <StatCard
              icon={<Heart size={20} />}
              label="Likes"
              value={likesCount}
            />

          </div>
        </div>

        {/* ABOUT */}

        <div
          className="p-6 rounded-3xl mb-6"
          style={{
            background: cardBg,
            border,
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <Info size={22} />
            <h2 className="font-bold text-xl">
              About TreX Edu
            </h2>
          </div>

          <p
            style={{
              color: subTextColor,
            }}
          >
            Version 1.0.0
          </p>

          <p className="mt-2">
            Built for students to share notes,
            collaborate and learn together.
          </p>
        </div>

        {/* LOGOUT */}

        <button
          onClick={logout}
          className="px-6 py-3 rounded-2xl flex items-center gap-3 text-white font-bold transition-all duration-300 hover:scale-105"
          style={{
            background:
              "linear-gradient(135deg,#8b0000,#3d0000)",
          }}
        >
          <LogOut size={18} />
          Logout
        </button>
      </main>
    </div>
  );
}

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: any;
}) {
  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        background:
          "rgba(255,255,255,0.04)",
      }}
    >
      <p className="text-xs opacity-70 mb-1">
        {title}
      </p>

      <p className="font-bold">
        {value || "-"}
      </p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: any) {
  return (
    <div
      className="p-5 rounded-2xl"
      style={{
        background:
          "rgba(255,255,255,0.04)",
      }}
    >
      <div className="mb-3">
        {icon}
      </div>

      <h3 className="text-2xl font-bold">
        {value}
      </h3>

      <p className="text-sm opacity-70">
        {label}
      </p>
    </div>
  );
}