"use client";

import { useTheme } from "../../../../src/context/ThemeContext";
import { ArrowLeft, Info } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "../../../../src/hooks/useAuth";

export default function AboutPage() {
  const { darkMode } = useTheme();

  const bg = darkMode
    ? "linear-gradient(135deg,#3d0000 0%,#1a0000 30%,#000000 70%)"
    : "linear-gradient(135deg,#fff5f5 0%,#ffe4e4 40%,#ffffff 100%)";

  const textColor = darkMode ? "#fff" : "#1a0000";

  const cardBg = darkMode
    ? "rgba(255,255,255,0.04)"
    : "rgba(255,255,255,0.75)";

  const border = darkMode
    ? "1px solid #3f0000"
    : "1px solid #ffb3b3";

  const subText = darkMode ? "#a1a1aa" : "#8b0000";

  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      router.push("/");
    }
  }, [loading, session, router]);

  return (
    <div
      className="min-h-screen p-4"
      style={{ background: bg, color: textColor }}
    >
      <a href="/mobile/settings">
        <ArrowLeft size={24} />
      </a>

      <div
        className="mt-6 p-6 rounded-3xl"
        style={{ background: cardBg, border }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Info size={24} />
          <h1 className="text-2xl font-bold">
            About TreX Edu
          </h1>
        </div>

        <p style={{ color: subText }}>
          Version 1.0.0
        </p>

        <div className="mt-6 space-y-4 text-sm leading-7">
          <p>
            TreX Edu is a student-focused learning
            platform built to make sharing notes and
            collaborating with classmates simple.
          </p>

          <p>
            Students can upload notes, earn XP,
            compete on leaderboards, chat with
            classmates and stay updated through
            announcements.
          </p>

          <p>
            Our goal is to create a digital learning
            environment that encourages collaboration
            and knowledge sharing.
          </p>

          <p className="font-bold">
            Built by Vishal Das
          </p>
        </div>
      </div>
    </div>
  );
}