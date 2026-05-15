"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../src/lib/supabase";

type Message = {
  id: string;
  message: string;
  user_id: string;
  created_at: string;
  profiles?: {
    full_name: string;
    username: string;
  };
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [profileCache, setProfileCache] = useState<Record<string, any>>({});

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ---------------- INIT ----------------
  useEffect(() => {
    init();

    const channel = supabase
      .channel("chat-room")
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
              profiles: profileCache[newMsg.user_id] || {
                full_name: "Student",
              },
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileCache]);

  // ---------------- AUTO SCROLL ----------------
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---------------- INIT CHAT ----------------
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

    // 👉 cache ALL profiles for realtime name fix
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, username");

    const map: Record<string, any> = {};
    (allProfiles || []).forEach((p) => {
      map[p.id] = p;
    });

    setProfileCache(map);

    fetchMessages(profileData.class_name, profileData.section);
  }

  // ---------------- FETCH MESSAGES ----------------
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

    setMessages((data as Message[]) || []);
  }

  // ---------------- SEND MESSAGE ----------------
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

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen flex flex-col text-white relative overflow-hidden">

      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-linear-to-br from-black via-red-950 to-black opacity-95" />

      <div className="relative z-10 flex flex-col h-screen p-4">

        {/* HEADER */}
        <div className="mb-4">
          <h1 className="text-5xl font-bold">Class Chat💬 </h1>
          <div
        className="h-0.5 w-16 rounded-full mb-4"
        style={{
          background: "linear-gradient(90deg, #8b0000, transparent)",
        }}
      />
          <div className="h-0.5 w-20 bg-red-700 mt-1 rounded-full" />
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto space-y-3 px-1">

          {messages.map((msg) => {
            const isMe = msg.user_id === userId;

            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] px-4 py-2 rounded-2xl shadow-md border backdrop-blur-md
                  ${isMe
                    ? "bg-linear-to-r from-red-900/50 to-black/40 rounded-br-md"
                    : "bg-linear-to-r from-black/40 to-red-950/40 rounded-bl-md"
                  }`}
                >

                  {/* NAME */}
                  {!isMe && (
                    <p className="text-xs text-gray-300 mb-1 opacity-80">
                      {msg.profiles?.full_name ||
                        profileCache[msg.user_id]?.full_name ||
                        "Student"}
                    </p>
                  )}

                  {/* MESSAGE */}
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
        <div className="flex gap-4 mb-6">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type message..."
            className="flex-1 p-4 rounded-2xl outline-none transition-all duration-300 border border-red-900/40 hover:border-red-600 focus:border-red-500 focus:shadow-[0_0_10px_rgba(139,0,0,0.5)]"
          />

          <button
            onClick={sendMessage}
            className="px-5 py-4 rounded-2xl text-white font-bold transition-all duration-300 hover:scale-105"
          style={{background: "linear-gradient(135deg, #9b0000, #3d0000)"}}          >
            Send
          </button>
        </div>

      </div>
    </div>
  );
}