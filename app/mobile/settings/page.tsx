"use client";

import { useRouter } from "next/navigation";
import { supabase } from "../../../src/lib/supabase";
import { useTheme } from "../../../src/context/ThemeContext";
import {
  Moon,
  Sun,
  Bell,
  Shield,
  Info,
  MessageCircle,
  LogOut,
  ChevronRight,
  User,
} from "lucide-react";
import { useEffect } from "react";
import useAuth from "../../../src/hooks/useAuth";
import MobileNavbar from "@/components/MobileNavbar";
import MobilePageWrapper from "@/components/MobilePageWrapper";

export default function MobileSettingsPage() {
  const router = useRouter();
  const { darkMode, setDarkMode } = useTheme();

  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";

  const textColor = darkMode ? "#ffffff" : "#1a0000";

  const subTextColor = darkMode
    ? "#a1a1aa"
    : "#8b0000";

  const cardBg = darkMode
    ? "rgba(255,255,255,0.04)"
    : "rgba(0,0,0,0.06)";

  const border = darkMode
    ? "1px solid #3f0000"
    : "1px solid #ffb3b3";

  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      router.push("/");
    }
  }, [loading, session, router]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  function SettingItem({
    icon,
    title,
    subtitle,
    onClick,
  }: any) {
    return (
      <button
        onClick={onClick}
        className="
          w-full
          p-4
          rounded-2xl
          flex
          items-center
          justify-between
          transition-all
          duration-300
          hover:scale-[1.02]
          active:scale-95
        "
        style={{
          background: cardBg,
          border,
        }}
      >
        <div className="flex items-center gap-3">
          {icon}

          <div className="text-left">
            <p className="font-semibold text-sm">
              {title}
            </p>

            <p
              className="text-xs"
              style={{
                color: subTextColor,
              }}
            >
              {subtitle}
            </p>
          </div>
        </div>

        <ChevronRight size={18} />
      </button>
    );
  }

  return (
    <MobilePageWrapper>
      <div
        className="min-h-screen"
        style={{
          background: bg,
          color: textColor,
      }}
    >
      <div className="p-4 pb-24">

        {/* Header */}
        <div className="pt-4 mb-6">
          <p
            className="text-xs uppercase tracking-widest mb-1"
            style={{
              color: subTextColor,
            }}
          >
            Preferences
          </p>

          <h1 className="text-3xl font-bold">
            Settings
          </h1>

          <div
            className="mt-2 h-0.5 w-14 rounded-full"
            style={{
              background:
                "linear-gradient(90deg,#8b0000,transparent)",
            }}
          />
        </div>

        {/* Theme */}
        <div className="mb-6">
          <h2 className="font-bold mb-3">
            Appearance
          </h2>

          <button
            onClick={() =>
              setDarkMode(!darkMode)
            }
            className="
              w-full
              p-4
              rounded-2xl
              flex
              items-center
              justify-between
              transition-all
              duration-300
              hover:scale-[1.02]
              active:scale-95
            "
            style={{
              background: cardBg,
              border,
            }}
          >
            <div className="flex items-center gap-3">
              {darkMode ? (
                <Sun size={20} />
              ) : (
                <Moon size={20} />
              )}

              <div className="text-left">
                <p className="font-semibold">
                  Theme
                </p>

                <p
                  className="text-xs"
                  style={{
                    color: subTextColor,
                  }}
                >
                  Switch appearance
                </p>
              </div>
            </div>

            <span className="font-bold text-sm">
              {darkMode ? "Dark" : "Light"}
            </span>
          </button>
        </div>

        {/* General */}
        <div className="space-y-3 mb-6">

          <SettingItem
            icon={<Bell size={20} />}
            title="Notifications"
            subtitle="Manage alerts"
            onClick={() => router.push("/mobile/announcements")}
          />

          <SettingItem
            icon={<Shield size={20} />}
            title="Privacy Policy"
            subtitle="Read our policies"
            onClick={() => router.push("/mobile/settings/privacy")}
          />

          <SettingItem
            icon={<Info size={20} />}
            title="About TreX Edu"
            subtitle="Version & information"
            onClick={() => router.push("/mobile/settings/about")}
          />

          <SettingItem
            icon={<MessageCircle size={20} />}
            title="Contact Developer"
            subtitle="Report bugs or feedback"
            onClick={() => router.push("/mobile/settings/contact")}
          />
        </div>

        {/* App Info */}
        <div
          className="p-4 rounded-2xl mb-6"
          style={{
            background: cardBg,
            border,
          }}
        >
          <p className="font-bold mb-2">
            TreX Edu
          </p>

          <p
            className="text-sm"
            style={{
              color: subTextColor,
            }}
          >
            Student collaboration platform
            for sharing notes, chatting
            with classmates and earning XP.
          </p>

          <p
            className="text-xs mt-3"
            style={{
              color: subTextColor,
            }}
          >
            Version 1.0.0
          </p>
        </div>

        {/* Logout */}
        <button
          onClick={() => router.push("/mobile/profile")}
          className="
            w-full
            p-4
            rounded-2xl
            text-white
            font-bold
            flex
            items-center
            justify-center
            gap-2
            transition-all
            duration-300
            hover:scale-105
            active:scale-95
            mb-4
          "
          style={{
            background:
              "linear-gradient(135deg,#8b0000,#3d0000)",
          }}
        >
          <User size={18} />
          Profile
        </button>
        
        <button
          onClick={logout}
          className="
            w-full
            p-4
            rounded-2xl
            text-white
            font-bold
            flex
            items-center
            justify-center
            gap-2
            transition-all
            duration-300
            hover:scale-105
            active:scale-95
          "
          style={{
            background:
              "linear-gradient(135deg,#8b0000,#3d0000)",
          }}
        >
          <LogOut size={18} />
          Logout
        </button>
      
      </div>
          <MobileNavbar
            darkMode={darkMode}
            subTextColor={subTextColor}
            border={border}
          />
    </div>
   </MobilePageWrapper>

  );
}