"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../src/lib/supabase";
import { useTheme } from "../../../src/context/ThemeContext";

type Message = {
  id: string;
  message: string;
  user_id: string;
  created_at: string;
  profiles?: {
    full_name: string;
    username: string;
  }[] | null;
};

export default function MobileChatPage() {
  const { darkMode, setDarkMode } = useTheme();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [profileCache, setProfileCache] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";

  const textColor = darkMode ? "#ffffff" : "#1a0000";
  const subTextColor = darkMode ? "#a1a1aa" : "#8b0000";

  const inputBg = darkMode
    ? "rgba(0,0,0,0.3)"
    : "rgba(255,255,255,0.6)";

  const myMsgBg = darkMode
    ? "linear-gradient(135deg, #6b0000, #3d0000)"
    : "linear-gradient(135deg, #ff9999, #ff6666)";

  const otherMsgBg = darkMode
    ? "rgba(255,255,255,0.06)"
    : "rgba(0,0,0,0.08)";

  const border = darkMode
    ? "1px solid #3f0000"
    : "1px solid #ffb3b3";

  useEffect(() => {
    init();

    const channel = supabase
      .channel("mobile-chat-room")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as Message;

          setMessages((prev) => [
            ...prev,
            {
              ...newMsg,
              profiles: profileCache[newMsg.user_id]
                ? [profileCache[newMsg.user_id]]
                : [{ full_name: "Student", username: "" }],
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileCache]);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = messagesContainerRef.current;

    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 120;

    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages]);

  async function init() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUserId(user.id);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("class_name, section, full_name, username")
      .eq("id", user.id)
      .single();

    if (!profileData) return;

    setProfile(profileData);

    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, username");

    const map: Record<string, any> = {};

    (allProfiles || []).forEach((p) => {
      map[p.id] = p;
    });

    setProfileCache(map);

    await fetchMessages(
      profileData.class_name,
      profileData.section
    );

    setLoading(false);
  }

  async function fetchMessages(
    className: string,
    section: string
  ) {
    const { data } = await supabase
      .from("messages")
      .select(`
        id,
        message,
        user_id,
        created_at,
        profiles (
          full_name,
          username
        )
      `)
      .eq("class_name", className)
      .eq("section", section)
      .order("created_at", { ascending: true });

    setMessages((data || []) as unknown as Message[]);
  }

  async function sendMessage() {
    if (!text.trim() || !profile || !userId) return;

    const { error } = await supabase
      .from("messages")
      .insert({
        user_id: userId,
        message: text,
        class_name: profile.class_name,
        section: profile.section,
      });

    if (error) {
      alert(error.message);
      return;
    }

    setText("");
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
          Loading Chat
        </div>
      </div>
    );

  return (
    <div
      className="flex flex-col h-screen transition-all duration-500"
      style={{
        background: bg,
        color: textColor,
      }}
    >
      {/* HEADER */}
      <div className="shrink-0 px-4 pt-5 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p
              className="text-[10px] font-medium tracking-[0.25em] uppercase mb-1"
              style={{ color: subTextColor }}
            >
              Real-time
            </p>

            <h1 className="text-2xl font-bold">
              Class Chat 💬
            </h1>

            <div
              className="h-0.5 w-12 rounded-full mt-2"
              style={{
                background:
                  "linear-gradient(90deg, #8b0000, transparent)",
              }}
            />
          </div>

          <button
            onClick={() =>
              setDarkMode(!darkMode)
            }
            className="p-2 rounded-xl text-sm transition-all duration-300"
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
      </div>

      {/* MESSAGES */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-3 pb-28 pt-1 space-y-3"
      >
        {messages.map((msg) => {
          const isMe = msg.user_id === userId;

          return (
            <div
              key={msg.id}
              className={`flex ${
                isMe
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className="max-w-[82%] px-3 py-2 shadow-md"
                style={{
                  background: isMe
                    ? myMsgBg
                    : otherMsgBg,
                  color: isMe
                    ? "#fff"
                    : textColor,
                  border,
                  borderRadius: isMe
                    ? "18px 18px 4px 18px"
                    : "18px 18px 18px 4px",
                }}
              >
                {!isMe && (
                  <p
                    className="text-[10px] mb-1 opacity-80"
                    style={{
                      color: subTextColor,
                    }}
                  >
                    {msg.profiles?.[0]
                      ?.full_name ||
                      profileCache[msg.user_id]
                        ?.full_name ||
                      "Student"}
                  </p>
                )}

                <p className="text-sm wrap-break-words">
                  {msg.message}
                </p>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div
        className="sticky bottom-22 px-3 z-40"
      >
        <div
          className="flex items-end gap-2 p-2 rounded-[28px] backdrop-blur-xl"
          style={{
            background: darkMode
              ? "rgba(15,0,0,0.72)"
              : "rgba(255,245,245,0.72)",
            border,
            WebkitBackdropFilter: "blur(20px)",
            backdropFilter: "blur(20px)",
            boxShadow: darkMode
              ? "0 8px 32px rgba(0,0,0,0.45)"
              : "0 8px 32px rgba(0,0,0,0.12)",
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && sendMessage()
            }
            placeholder="Type message..."
            className="flex-1 px-4 py-3 rounded-2xl outline-none text-sm"
            style={{
              background: inputBg,
              color: textColor,
              border,
              minHeight: "48px",
            }}
          />

          <button
            onClick={sendMessage}
            className="px-4 py-3 rounded-2xl text-white font-bold text-sm transition-all duration-300 active:scale-95"
            style={{
              background:
                "linear-gradient(135deg, #b30000, #3d0000)",
              minHeight: "48px",
            }}
          >
            ➤
          </button>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div
        className="fixed bottom-4 left-4 right-4 flex items-center justify-around p-3 z-50 rounded-3xl glass"
        style={{
          background: darkMode
            ? "#0d0000"
            : "#fff5f5",
          border,
        }}
      >
        <a
          href="/mobile/dashboard"
          className="flex flex-col items-center gap-1"
        >
          <span className="text-xl">🏠</span>
          <span
            className="text-[10px]"
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
          <span className="text-xl">📚</span>
          <span
            className="text-[10px]"
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
          <span className="text-xl">➕</span>
          <span
            className="text-[10px]"
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
          <span className="text-xl">💬</span>
          <span
            className="text-[10px]"
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
          <span className="text-xl">👤</span>
          <span
            className="text-[10px]"
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