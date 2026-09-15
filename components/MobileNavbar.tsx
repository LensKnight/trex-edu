"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  PlusSquare,
  MessageCircle,
  CircleUserRound,
  Bot,
  Settings,
} from "lucide-react";

export default function MobileNavbar({
  darkMode,
  subTextColor,
  border,
}: {
  darkMode: boolean;
  subTextColor: string;
  border: string;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: "/mobile/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/mobile/feed", label: "Notes", icon: BookOpen },
    { href: "/mobile/ai-teacher", label: "AI", icon: Bot },
    { href: "/mobile/upload", label: "Upload", icon: PlusSquare },
    { href: "/mobile/chat", label: "Chat", icon: MessageCircle },
    { href: "/mobile/profile", label: "Profile", icon: CircleUserRound },
    { href: "/mobile/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 max-w-lg mx-auto">
      <nav
        className="relative flex items-center justify-between rounded-3xl px-3 py-2 transition-all duration-300"
        style={{
          background: darkMode
            ? "rgba(10, 10, 12, 0.75)"
            : "rgba(255, 255, 255, 0.75)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: darkMode
            ? "1px solid rgba(255, 255, 255, 0.1)"
            : "1px solid rgba(0, 0, 0, 0.08)",
          boxShadow: darkMode
            ? "0 20px 40px -15px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
            : "0 20px 40px -15px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
        }}
      >
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center flex-1 py-1.5 min-w-0 select-none outline-none"
            >
              {/* Active Pill Background & Glow */}
              {active && (
                <motion.div
                  layoutId="active-nav-glow"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30,
                  }}
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: darkMode
                      ? "linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.12) 100%)"
                      : "linear-gradient(135deg, rgba(254, 226, 226, 0.9) 0%, rgba(252, 165, 165, 0.4) 100%)",
                    border: darkMode
                      ? "1px solid rgba(248, 113, 113, 0.3)"
                      : "1px solid rgba(239, 68, 68, 0.25)",
                    boxShadow: darkMode
                      ? "0 0 16px rgba(239, 68, 68, 0.2)"
                      : "0 2px 10px rgba(239, 68, 68, 0.15)",
                  }}
                />
              )}

              {/* Icon Container with Micro-interactions */}
              <motion.div
                whileTap={{ scale: 0.85 }}
                animate={{
                  scale: active ? 1.1 : 1,
                  y: active ? -1 : 0,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="relative z-10 flex items-center justify-center"
              >
                <Icon
                  size={20}
                  className="transition-colors duration-200"
                  color={
                    active
                      ? darkMode
                        ? "#f87171"
                        : "#dc2626"
                      : subTextColor
                  }
                  strokeWidth={active ? 2.3 : 1.8}
                />
              </motion.div>

              {/* Dynamic Label */}
              <motion.span
                animate={{
                  opacity: active ? 1 : 0.7,
                  scale: active ? 1.02 : 1,
                }}
                className="text-[9px] mt-1 relative z-10 font-medium tracking-tight truncate max-w-full px-0.5"
                style={{
                  color: active
                    ? darkMode
                      ? "#f87171"
                      : "#dc2626"
                    : subTextColor,
                }}
              >
                {item.label}
              </motion.span>

              {/* Active Bottom Dot Indicator */}
              {active && (
                <motion.div
                  layoutId="active-dot"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="absolute -bottom-1 w-1 h-1 rounded-full z-10"
                  style={{
                    backgroundColor: darkMode ? "#f87171" : "#dc2626",
                    boxShadow: darkMode
                      ? "0 0 8px #f87171"
                      : "0 0 6px #dc2626",
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}