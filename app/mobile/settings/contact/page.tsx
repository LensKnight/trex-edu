"use client";

import { useTheme } from "../../../../src/context/ThemeContext";
import {
  ArrowLeft,
  Code2,
  Mail,
  MessageCircle,
} from "lucide-react";

export default function ContactPage() {
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
          <Code2 size={24} />
          <h1 className="text-2xl font-bold">
            Contact Developer
          </h1>
        </div>

        <p
          className="mb-6"
          style={{ color: subText }}
        >
          TreX Edu Support
        </p>

        <div className="space-y-4">

          <div
            className="p-4 rounded-2xl"
            style={{
              background:
                "rgba(255,255,255,0.04)",
            }}
          >
            <h3 className="font-bold">
              Developer
            </h3>

            <p>Vishal Das</p>
          </div>

          <div
            className="p-4 rounded-2xl flex items-center gap-3"
            style={{
              background:
                "rgba(255,255,255,0.04)",
            }}
          >
            <Mail size={20} />
            <span>
              trexitis.support@gmail.com
            </span>
          </div>

          <div
            className="p-4 rounded-2xl flex items-center gap-3"
            style={{
              background:
                "rgba(255,255,255,0.04)",
            }}
          >
            <MessageCircle size={20} />
            <span>
              Not Available Yet
            </span>
          </div>

        </div>

        <div className="mt-8 text-sm opacity-70">
          Version 1.0.0
        </div>
      </div>
    </div>
  );
}