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
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const typingChannelRef = useRef<any>(null);
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    const updateVH = () => {
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`
      );
    };

    updateVH();
    window.addEventListener("resize", updateVH);

    return () => window.removeEventListener("resize", updateVH);
  }, []);

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
    const container = messagesContainerRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages]);

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

    await fetchMessages(profileData.class_name, profileData.section);

    // Typing channel setup
    const tChannel = supabase.channel(
      `typing-${profileData.class_name}-${profileData.section}`
    );

    tChannel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.user_id === user.id) return;

        const name = payload.name as string;

        setTypingUsers((prev) =>
          prev.includes(name) ? prev : [...prev, name]
        );

        // Pehle wala timeout clear karo
        if (typingTimeoutsRef.current[name]) {
          clearTimeout(typingTimeoutsRef.current[name]);
        }

        // 2.5 second baad remove karo
        typingTimeoutsRef.current[name] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((n) => n !== name));
        }, 2500);
      })
      .subscribe();

    typingChannelRef.current = tChannel;

    setLoading(false);
  }

  async function fetchMessages(className: string, section: string) {
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

  function handleTyping(e: React.ChangeEvent<HTMLInputElement>) {
    setText(e.target.value);

    if (!typingChannelRef.current || !profile || !userId) return;

    typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: {
        user_id: userId,
        name: profile.full_name,
      },
    });
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
        <img src="/toggle-icon.png" className="loading-x" alt="loading" />
        <div className="loading-text">Loading Chat</div>
      </div>
    );

  return (
    <div
      className="flex flex-col h-dvh"
      style={{
        background: bg,
        color: textColor,
      }}
    >
      {/* HEADER */}
      <div className="shrink-0 px-4 pt-5 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-medium tracking-[0.25em] uppercase mb-1"
              style={{ color: subTextColor }}>
              Real-time
            </p>

            <h1 className="text-2xl font-bold">Class Chat 💬</h1>

            <div className="h-0.5 w-12 rounded-full mt-2"
              style={{
                background: "linear-gradient(90deg, #8b0000, transparent)",
              }}
            />
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl text-sm"
            style={{
              background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
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
        className="flex-1 overflow-y-auto px-3 pt-1 space-y-3 pb-35"
      >
        {messages.map((msg) => {
          const isMe = msg.user_id === userId;

          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[82%] px-3 py-2 shadow-md"
                style={{
                  background: isMe ? myMsgBg : otherMsgBg,
                  color: isMe ? "#fff" : textColor,
                  border,
                  borderRadius: isMe
                    ? "18px 18px 4px 18px"
                    : "18px 18px 18px 4px",
                }}
              >
                {!isMe && (
                  <p className="text-[10px] mb-1 opacity-80"
                    style={{ color: subTextColor }}>
                    {msg.profiles?.[0]?.full_name ||
                      profileCache[msg.user_id]?.full_name ||
                      "Student"}
                  </p>
                )}

                <p className="text-sm wrap-break-words">{msg.message}</p>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* TYPING INDICATOR */}
      {typingUsers.length > 0 && (
        <div className="fixed left-0 right-0 px-5 z-40 bottom-42">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl text-xs"
            style={{ background: otherMsgBg, color: subTextColor }}
          >
            <span>
              {typingUsers.length === 1
                ? `${typingUsers[0]} typing`
                : `${typingUsers.join(", ")} typing`}
            </span>
            <span className="flex gap-0.5 items-center">
              <span className="w-1 h-1 rounded-full animate-bounce" style={{ background: subTextColor, animationDelay: "0ms" }} />
              <span className="w-1 h-1 rounded-full animate-bounce" style={{ background: subTextColor, animationDelay: "150ms" }} />
              <span className="w-1 h-1 rounded-full animate-bounce" style={{ background: subTextColor, animationDelay: "300ms" }} />
            </span>
          </div>
        </div>
      )}

      {/* INPUT */}
      <div className="fixed left-0 right-0 px-3 z-40 bottom-24">
        <div
          className="flex items-end gap-2 p-2 rounded-[28px] backdrop-blur-xl"
          style={{
            background: darkMode
              ? "rgba(15,0,0,0.72)"
              : "rgba(255,245,245,0.72)",
            border,
          }}
        >
          <input
            value={text}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type message..."
            className="flex-1 px-4 py-3 rounded-2xl outline-none text-sm"
            style={{
              background: inputBg,
              color: textColor,
              border,
              bottom: "calc(64px + env(safe-area-inset-bottom) + var(--keyboard-offset, 0px) + 10px)",
              transition: "bottom 0.25s ease, transform 0.25s ease",
              transform: "translateY(calc(-1 * var(--keyboard-offset, 0px) * 0.15))"
            }}
          />

          <button
            onClick={sendMessage}
            className="px-4 py-3 rounded-2xl text-white font-bold text-sm"
            style={{
              background: "linear-gradient(135deg, #b30000, #3d0000)",
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
            ? "rgba(13,0,0,0.75)"
            : "rgba(255,245,245,0.7)",
          border,
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
        }}
      >
        <a href="/mobile/dashboard" className="flex flex-col items-center gap-1">
          <span className="text-xl">🏠</span>
          <span className="text-[10px]" style={{ color: subTextColor }}>Home</span>
        </a>

        <a href="/mobile/feed" className="flex flex-col items-center gap-1">
          <span className="text-xl">📚</span>
          <span className="text-[10px]" style={{ color: subTextColor }}>Notes</span>
        </a>

        <a href="/mobile/upload" className="flex flex-col items-center gap-1">
          <span className="text-xl">➕</span>
          <span className="text-[10px]" style={{ color: subTextColor }}>Upload</span>
        </a>

        <a href="/mobile/chat" className="flex flex-col items-center gap-1">
          <span className="text-xl">💬</span>
          <span className="text-[10px]" style={{ color: subTextColor }}>Chat</span>
        </a>

        <a href="/mobile/profile" className="flex flex-col items-center gap-1">
          <span className="text-xl">👤</span>
          <span className="text-[10px]" style={{ color: subTextColor }}>Profile</span>
        </a>
      </div>
    </div>
  );
}