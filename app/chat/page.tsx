"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import { useTheme } from "../../src/context/ThemeContext";

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

export default function ChatPage() {
  const { darkMode, setDarkMode } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [profileCache, setProfileCache] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingChannelRef = useRef<any>(null);
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";
  const textColor = darkMode ? "#ffffff" : "#1a0000";
  const subTextColor = darkMode ? "#a1a1aa" : "#8b0000";
  const inputBg = darkMode ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.6)";
  const myMsgBg = darkMode ? "linear-gradient(135deg, #6b0000, #3d0000)" : "linear-gradient(135deg, #ff9999, #ff6666)";
  const otherMsgBg = darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const border = darkMode ? "1px solid #3f0000" : "1px solid #ffb3b3";

  useEffect(() => {
    init();

    const channel = supabase
      .channel("chat-room")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, {
            ...newMsg,
            profiles: profileCache[newMsg.user_id] || { full_name: "Student" },
          }]);
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profileCache]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("class_name, section, full_name, username")
      .eq("id", user.id)
      .single();

    if (!profileData) return;
    setProfile(profileData);

    const { data: allProfiles } = await supabase.from("profiles").select("id, full_name, username");
    const map: Record<string, any> = {};
    (allProfiles || []).forEach((p) => { map[p.id] = p; });
    setProfileCache(map);

    fetchMessages(profileData.class_name, profileData.section);

    // Typing channel — same name as mobile so dono sync rahein
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
      .select(`id, message, user_id, created_at, profiles (full_name, username)`)
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
    if (error) { alert(error.message); return; }
    setText("");
  }

  if (loading) return (
    <div className="loading-screen">
      <img src="/toggle-icon.png" className="loading-x" alt="loading" />
      <div className="loading-text">Loading Chat</div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen transition-all duration-500" style={{background: bg, color: textColor}}>

      {/* HEADER */}
      <div className="shrink-0 px-4 pb-2" style={{paddingTop: "20px"}}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs md:text-sm font-medium tracking-widest uppercase mb-1" style={{color: subTextColor}}>Real-time</p>
            <h1 className="text-3xl md:text-5xl font-bold">Class Chat</h1>
            <div className="h-0.5 w-16 rounded-full mt-2" style={{background: "linear-gradient(90deg, #8b0000, transparent)"}} />
          </div>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.user_id === userId;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[70%] px-4 py-2 shadow-md"
                style={{
                  background: isMe ? myMsgBg : otherMsgBg,
                  color: isMe ? "#fff" : textColor,
                  border,
                  borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                }}
              >
                {!isMe && (
                  <p className="text-xs mb-1 opacity-80" style={{color: subTextColor}}>
                    {msg.profiles?.[0]?.full_name || profileCache[msg.user_id]?.full_name || "Student"}
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
        <div className="px-4 py-1">
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
      <div className="shrink-0 flex gap-3 px-4 pb-6 pt-2">
        <input
          value={text}
          onChange={handleTyping}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type message..."
          className="flex-1 p-4 rounded-2xl outline-none transition-all duration-300"
          style={{background: inputBg, color: textColor, border}}
        />
        <button
          onClick={sendMessage}
          className="px-5 py-4 rounded-2xl text-white font-bold transition-all duration-300 hover:scale-105"
          style={{background: "linear-gradient(135deg, #9b0000, #3d0000)"}}
        >
          Send
        </button>
      </div>

    </div>
  );
}