"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../src/lib/supabase";
import { useTheme } from "../../../src/context/ThemeContext";
import { Send, Sparkles, Loader2, Users, Reply, X, ChevronDown } from "lucide-react";
import MobileNavbar from "@/components/MobileNavbar";
import { motion, AnimatePresence } from "framer-motion";

/* ───────────── Types ───────────── */

type ReplyRef = { id: string; message: string; sender: string };

type ProfileLite = { id?: string; full_name: string; username: string };

type Profile = {
  class_name: string;
  section: string;
  full_name: string;
  username: string;
};

type Message = {
  id: string;
  message: string;
  user_id: string;
  class_name?: string;
  section?: string;
  created_at: string;
  reply_to?: ReplyRef | null;
  profiles?: ProfileLite | ProfileLite[] | null;
};

type DayGroup = { key: string; label: string; messages: Message[] };

/* ───────────── Constants ───────────── */

const NEAR_BOTTOM_PX = 120; // counts as "at the bottom" (auto-follow new messages)
const SHOW_BUTTON_PX = 200; // show the scroll-down button after this distance
const TYPING_THROTTLE_MS = 1500;
const TYPING_HIDE_MS = 2500;

/* ───────────── Date helpers (WhatsApp style) ───────────── */

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Today → Yesterday → weekday name (last week) → full date
function getDayLabel(iso: string) {
  const date = new Date(iso);
  const diffDays = Math.round(
    (startOfDay(new Date()).getTime() - startOfDay(date).getTime()) / 86400000
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString("en-GB", { weekday: "long" });
  }
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ───────────── Component ───────────── */

export default function MobileChatPage() {
  const { darkMode } = useTheme();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<ReplyRef | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const typingChannelRef = useRef<any>(null);
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastTypingSentRef = useRef(0);
  const profileCacheRef = useRef<Record<string, ProfileLite>>({});
  const isNearBottomRef = useRef(true);
  const pendingScrollRef = useRef<"none" | "instant" | "smooth">("none");

  /* ───────────── Theme colors ───────────── */

  const bg = darkMode
    ? "radial-gradient(ellipse at top, #180505 0%, #09090b 100%)"
    : "radial-gradient(ellipse at top, #fff5f5 0%, #f8fafc 100%)";

  const textColor = darkMode ? "#f4f4f5" : "#0f172a";
  const subTextColor = darkMode ? "#a1a1aa" : "#64748b";

  const myMsgBg = darkMode
    ? "linear-gradient(135deg, #dc2626, #991b1b)"
    : "linear-gradient(135deg, #ef4444, #dc2626)";

  const otherMsgBg = darkMode
    ? "rgba(39, 39, 42, 0.8)"
    : "rgba(255, 255, 255, 0.9)";

  const border = darkMode
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.08)";

  const chipBg = darkMode
    ? "rgba(24, 24, 27, 0.85)"
    : "rgba(255, 255, 255, 0.9)";

  /* ───────────── Scroll logic ───────────── */

  const scrollToBottom = useCallback((smooth = true) => {
    const c = messagesContainerRef.current;
    if (!c) return;
    c.scrollTo({ top: c.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const handleScroll = useCallback(() => {
    const c = messagesContainerRef.current;
    if (!c) return;

    const distance = c.scrollHeight - c.scrollTop - c.clientHeight;
    isNearBottomRef.current = distance < NEAR_BOTTOM_PX;
    setShowScrollBtn(distance > SHOW_BUTTON_PX);

    if (distance < NEAR_BOTTOM_PX) setUnreadCount(0);
  }, []);

  // Runs after every messages change:
  // scroll if a scroll was requested, otherwise just refresh the button state
  useEffect(() => {
    if (pendingScrollRef.current !== "none") {
      scrollToBottom(pendingScrollRef.current === "smooth");
      pendingScrollRef.current = "none";
    } else {
      handleScroll();
    }
  }, [messages, scrollToBottom, handleScroll]);

  /* ───────────── Initial load (runs once) ───────────── */

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        setUserId(user.id);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("class_name, section, full_name, username")
          .eq("id", user.id)
          .single();
        if (!profileData || cancelled) return;

        setProfile(profileData as Profile);

        // Only classmates, used for sender names on realtime messages
        const { data: classmates } = await supabase
          .from("profiles")
          .select("id, full_name, username")
          .eq("class_name", profileData.class_name)
          .eq("section", profileData.section);

        (classmates || []).forEach((p) => {
          profileCacheRef.current[p.id] = p;
        });

        const { data } = await supabase
          .from("messages")
          .select(
            `
            id,
            message,
            user_id,
            created_at,
            reply_to,
            profiles (
              full_name,
              username
            )
          `
          )
          .eq("class_name", profileData.class_name)
          .eq("section", profileData.section)
          .order("created_at", { ascending: true });

        if (cancelled) return;

        const fetched = (data || []) as unknown as Message[];
        const fetchedIds = new Set(fetched.map((m) => m.id));

        pendingScrollRef.current = "instant"; // open the chat at the latest message
        setMessages((prev) => [
          ...fetched,
          ...prev.filter((m) => !fetchedIds.has(m.id)),
        ]);

        // Typing indicator channel
        const tChannel = supabase
          .channel(`typing-${profileData.class_name}-${profileData.section}`)
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
            }, TYPING_HIDE_MS);
          })
          .subscribe();

        typingChannelRef.current = tChannel;
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;

      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
      }

      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
    };
  }, []);

  /* ───────────── Realtime new messages ───────────── */

  useEffect(() => {
    if (!profile || !userId) return;

    const channel = supabase
      .channel(`messages-${profile.class_name}-${profile.section}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as Message;

          // Ignore messages from other classes / sections
          if (
            String(newMsg.class_name) !== String(profile.class_name) ||
            String(newMsg.section) !== String(profile.section)
          ) {
            return;
          }

          const isMine = newMsg.user_id === userId;

          // Decide BEFORE the new message changes the scroll height
          if (isMine || isNearBottomRef.current) {
            pendingScrollRef.current = "smooth";
          } else {
            setUnreadCount((n) => n + 1);
          }

          setMessages((prev) =>
            prev.some((m) => m.id === newMsg.id)
              ? prev
              : [
                  ...prev,
                  {
                    ...newMsg,
                    profiles: profileCacheRef.current[newMsg.user_id] ?? null,
                  },
                ]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, userId]);

  /* ───────────── Actions ───────────── */

  function handleTyping(e: React.ChangeEvent<HTMLInputElement>) {
    setText(e.target.value);

    if (!typingChannelRef.current || !profile || !userId) return;

    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_THROTTLE_MS) return;
    lastTypingSentRef.current = now;

    typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId, name: profile.full_name },
    });
  }

  async function sendMessage() {
    const body = text.trim();
    if (!body || !profile || !userId) return;

    const { error } = await supabase.from("messages").insert({
      user_id: userId,
      message: body,
      class_name: profile.class_name,
      section: profile.section,
      reply_to: replyingTo ?? null,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setText("");
    setReplyingTo(null);
  }

  function getSender(msg: Message) {
    const p = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles;
    return (
      p?.full_name || profileCacheRef.current[msg.user_id]?.full_name || "Student"
    );
  }

  /* ───────────── Group messages by day ───────────── */

  const dayGroups = useMemo<DayGroup[]>(() => {
    const groups: DayGroup[] = [];

    for (const msg of messages) {
      const key = dayKey(new Date(msg.created_at));
      const last = groups[groups.length - 1];

      if (last && last.key === key) {
        last.messages.push(msg);
      } else {
        groups.push({ key, label: getDayLabel(msg.created_at), messages: [msg] });
      }
    }

    return groups;
  }, [messages]);

  /* ───────────── UI ───────────── */

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

      {/* Header */}
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
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 pt-4 space-y-3 pb-40"
      >
        {dayGroups.map((group) => (
          <div key={group.key} className="space-y-3">
            {/* Day separator (sticks to the top while scrolling that day) */}
            <div className="sticky top-2 z-10 flex justify-center pointer-events-none">
              <span
                className="px-3 py-1 rounded-full text-[10px] font-semibold border backdrop-blur-md shadow-sm"
                style={{ background: chipBg, borderColor: border, color: subTextColor }}
              >
                {group.label}
              </span>
            </div>

            {group.messages.map((msg, i) => {
              const isMe = msg.user_id === userId;
              const senderName = getSender(msg);
              const prev = group.messages[i - 1];
              const showName = !isMe && (!prev || prev.user_id !== msg.user_id);

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
                    onClick={() =>
                      setReplyingTo({
                        id: msg.id,
                        message: msg.message,
                        sender: senderName,
                      })
                    }
                    className="max-w-[80%] px-3.5 py-2.5 shadow-sm border relative group cursor-pointer active:opacity-80 transition-opacity"
                    style={{
                      background: isMe ? myMsgBg : otherMsgBg,
                      color: isMe ? "#ffffff" : textColor,
                      borderColor: isMe ? "transparent" : border,
                      borderRadius: isMe
                        ? "20px 20px 4px 20px"
                        : "20px 20px 20px 4px",
                    }}
                  >
                    {showName && (
                      <p className="text-[10px] font-bold mb-0.5 text-red-400">
                        {senderName}
                      </p>
                    )}

                    {/* Quoted reply */}
                    {msg.reply_to && (
                      <div
                        className="mb-1.5 p-1.5 rounded-lg border-l-2 bg-black/10 text-[10px]"
                        style={{ borderColor: isMe ? "#ffffff" : "#ef4444" }}
                      >
                        <p className="font-bold opacity-90">{msg.reply_to.sender}</p>
                        <p className="truncate opacity-75">{msg.reply_to.message}</p>
                      </div>
                    )}

                    <p className="text-xs leading-relaxed break-words font-medium">
                      {msg.message}
                    </p>

                    <div
                      className="text-[9px] mt-1 text-right font-medium opacity-70"
                      style={{ color: isMe ? "#ffffff" : subTextColor }}
                    >
                      {formattedTime}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Typing Indicator */}
      <AnimatePresence>
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`fixed left-0 right-0 max-w-lg mx-auto px-4 z-30 pointer-events-none ${
              replyingTo ? "bottom-52" : "bottom-36"
            }`}
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

      {/* Scroll To Bottom Button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`fixed left-0 right-0 max-w-lg mx-auto px-4 z-30 flex justify-end pointer-events-none ${
              replyingTo ? "bottom-52" : "bottom-36"
            }`}
          >
            <button
              onClick={() => scrollToBottom(true)}
              className="pointer-events-auto relative w-10 h-10 rounded-full flex items-center justify-center border shadow-lg backdrop-blur-xl active:scale-95 transition-transform"
              style={{
                background: darkMode ? "rgba(39, 39, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
                borderColor: border,
                color: textColor,
              }}
            >
              <ChevronDown size={20} />

              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Section & Reply Preview */}
      <div className="fixed left-0 right-0 max-w-lg mx-auto px-3 z-30 bottom-20">
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="mb-1.5 p-2 rounded-2xl border flex items-center justify-between backdrop-blur-2xl shadow-md"
              style={{
                background: darkMode ? "rgba(18, 18, 20, 0.9)" : "rgba(255, 255, 255, 0.9)",
                borderColor: border,
              }}
            >
              <div className="flex items-center gap-2 overflow-hidden text-xs">
                <Reply size={14} className="text-red-500 shrink-0 ml-1" />
                <div className="truncate">
                  <span className="font-bold text-red-500 block text-[10px]">
                    Replying to {replyingTo.sender}
                  </span>
                  <span className="truncate block opacity-80" style={{ color: textColor }}>
                    {replyingTo.message}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="p-1 text-zinc-400 hover:text-zinc-200"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className="flex items-center gap-2 p-2 rounded-3xl backdrop-blur-2xl shadow-xl border"
          style={{
            background: darkMode ? "rgba(18, 18, 20, 0.85)" : "rgba(255, 255, 255, 0.85)",
            borderColor: border,
          }}
        >
          <input
            value={text}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={replyingTo ? "Type your reply..." : "Write a message..."}
            className="flex-1 px-4 py-2.5 rounded-2xl outline-none text-xs font-medium placeholder:text-zinc-500 border-none bg-transparent"
            style={{ color: textColor }}
          />

          <button
            onClick={sendMessage}
            disabled={!text.trim()}
            className="w-10 h-10 rounded-2xl text-white font-bold transition-all active:scale-95 flex items-center justify-center shrink-0 disabled:opacity-40 disabled:scale-100 shadow-md"
            style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)" }}
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