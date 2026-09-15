"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../src/lib/supabase";
import { useTheme } from "../../../src/context/ThemeContext";
import { Send, Sparkles, MessageSquare, Loader2, Users } from "lucide-react";
import MobileNavbar from "@/components/MobileNavbar";
import { motion, AnimatePresence } from "framer-motion";

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
  const { darkMode } = useTheme();

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
    ? "radial-gradient(ellipse at top, #180505 0%, #09090b 100%)"
    : "radial-gradient(ellipse at top, #fff5f5 0%, #f8fafc 100%)";

  const textColor = darkMode ? "#f4f4f5" : "#0f172a";
  const subTextColor = darkMode ? "#a1a1aa" : "#64748b";

  const inputBg = darkMode
    ? "rgba(39, 39, 42, 0.75)"
    : "rgba(241, 245, 249, 0.85)";

  const myMsgBg = darkMode
    ? "linear-gradient(135deg, #dc2626, #991b1b)"
    : "linear-gradient(135deg, #ef4444, #dc2626)";

  const otherMsgBg = darkMode
    ? "rgba(39, 39, 42, 0.8)"
    : "rgba(255, 255, 255, 0.9)";

  const border = darkMode
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.08)";

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

        if (typingTimeoutsRef.current[name]) {
          clearTimeout(typingTimeoutsRef.current[name]);
        }

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

    const { error } = await supabase.from("messages").insert({
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

  return (
    <div
      className="flex flex-col h-dvh max-w-lg mx-auto relative overflow-hidden"
      style={{ background: bg, color: textColor }}
    >
      {/* Loading Screen */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md bg-black/60">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-2" />
          <p className="text-xs font-semibold tracking-wide text-zinc-300">
            Connecting to Class Channel...
          </p>
        </div>
      )}

      {/* Modern Messenger Header */}
      <div
        className="shrink-0 px-4 pt-5 pb-3 backdrop-blur-xl z-20 border-b flex items-center justify-between"
        style={{
          background: darkMode ? "rgba(18, 18, 20, 0.8)" : "rgba(255, 255, 255, 0.8)",
          borderColor: border,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <Users size={20} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold tracking-tight">
                {profile ? `Class ${profile.class_name}-${profile.section}` : "Class Chat"}
              </h1>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[10px] font-medium" style={{ color: subTextColor }}>
              Real-time Peer Discussion
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-red-500/10 text-red-500 border border-red-500/20">
          <Sparkles size={10} /> Live
        </div>
      </div>

      {/* Messages Feed */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 pt-4 space-y-3 pb-36"
      >
        {messages.map((msg) => {
          const isMe = msg.user_id === userId;
          const senderName =
            msg.profiles?.[0]?.full_name ||
            profileCache[msg.user_id]?.full_name ||
            "Student";

          const formattedTime = new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[80%] px-3.5 py-2.5 shadow-sm border relative group"
                style={{
                  background: isMe ? myMsgBg : otherMsgBg,
                  color: isMe ? "#ffffff" : textColor,
                  borderColor: isMe ? "transparent" : border,
                  borderRadius: isMe
                    ? "20px 20px 4px 20px"
                    : "20px 20px 20px 4px",
                }}
              >
                {!isMe && (
                  <p
                    className="text-[10px] font-bold mb-0.5 text-red-400"
                  >
                    {senderName}
                  </p>
                )}

                <p className="text-xs leading-relaxed break-words font-medium">
                  {msg.message}
                </p>

                <div
                  className={`text-[9px] mt-1 text-right font-medium opacity-70 ${
                    isMe ? "text-zinc-100" : ""
                  }`}
                  style={{ color: isMe ? "#ffffff" : subTextColor }}
                >
                  {formattedTime}
                </div>
              </div>
            </motion.div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Dynamic Typing Indicator Overlay */}
      <AnimatePresence>
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed left-0 right-0 max-w-lg mx-auto px-4 z-30 bottom-36"
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold border backdrop-blur-md shadow-lg"
              style={{
                background: darkMode ? "rgba(24, 24, 27, 0.9)" : "rgba(255, 255, 255, 0.9)",
                borderColor: border,
                color: subTextColor,
              }}
            >
              <span className="text-red-500 font-bold">
                {typingUsers.length === 1
                  ? `${typingUsers[0]} is typing`
                  : `${typingUsers.join(", ")} are typing`}
              </span>
              <span className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Messenger Input Bar */}
      <div className="fixed left-0 right-0 max-w-lg mx-auto px-3 z-30 bottom-20">
        <div
          className="flex items-center gap-2 p-2 rounded-3xl backdrop-blur-2xl shadow-xl border"
          style={{
            background: darkMode
              ? "rgba(18, 18, 20, 0.85)"
              : "rgba(255, 255, 255, 0.85)",
            borderColor: border,
          }}
        >
          <input
            value={text}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Write a message..."
            className="flex-1 px-4 py-2.5 rounded-2xl outline-none text-xs font-medium placeholder:text-zinc-500 border-none bg-transparent"
            style={{
              color: textColor,
            }}
          />

          <button
            onClick={sendMessage}
            disabled={!text.trim()}
            className="w-10 h-10 rounded-2xl text-white font-bold transition-all active:scale-95 flex items-center justify-center shrink-0 disabled:opacity-40 disabled:scale-100 shadow-md"
            style={{
              background: "linear-gradient(135deg, #dc2626, #991b1b)",
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <MobileNavbar
        darkMode={darkMode}
        subTextColor={subTextColor}
        border={border}
      />
    </div>
  );
}