"use client";

import { useTheme } from "../../../../src/context/ThemeContext";
import { ArrowLeft, Shield } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "../../../../src/hooks/useAuth";

export default function PrivacyPage() {
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
          <Shield size={24} />
          <h1 className="text-2xl font-bold">
            Privacy Policy
          </h1>
        </div>

        <div className="space-y-4 text-sm leading-7">
          <p>
            TreX Edu only stores information
            required for educational purposes.
          </p>

          <p>
            Information stored may include:
          </p>

          <ul className="list-disc ml-6">
            <li>Full Name</li>
            <li>Class</li>
            <li>Section</li>
            <li>Stream</li>
            <li>Roll Number</li>
            <li>Uploaded Notes</li>
          </ul>

          <p>
            TreX Edu does not sell personal
            information to third parties.
          </p>

          <p>
            Uploaded notes are used only for
            educational collaboration within
            the platform.
          </p>

          <p>
            By using TreX Edu, you agree to this
            privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}