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
    {
      href: "/mobile/dashboard",
      label: "Home",
      icon: LayoutDashboard,
    },
    {
      href: "/mobile/feed",
      label: "Notes",
      icon: BookOpen,
    },
    {
      href: "/mobile/upload",
      label: "Upload",
      icon: PlusSquare,
    },
    {
      href: "/mobile/chat",
      label: "Chat",
      icon: MessageCircle,
    },
    {
      href: "/mobile/profile",
      label: "Profile",
      icon: CircleUserRound,
    },
  ];

return (
  <div
    className="fixed bottom-4 left-4 right-4 z-50"
  >
    <div
      className="relative flex items-center justify-around rounded-[28px] p-2"
      style={{
        background: darkMode
          ? "rgba(20,0,0,0.65)"
          : "rgba(255,255,255,0.55)",
        backdropFilter: "blur(30px)",
        WebkitBackdropFilter: "blur(30px)",
        border,
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.15)",
      }}
    >
      {navItems.map((item) => {
        const active =
          pathname === item.href;

        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex flex-col items-center justify-center w-16 h-14"
          >
            {active && (
              <motion.div
                layoutId="liquid-pill"
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }}
                className="absolute inset-0 rounded-2xl"
                style={{
                background:
                darkMode
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(139,0,0,0.12)",
                                backdropFilter:
                    "blur(25px)",
                  WebkitBackdropFilter:
                    "blur(25px)",
                border:
                darkMode
                    ? "1px solid rgba(255,255,255,0.25)"
                    : "1px solid rgba(139,0,0,0.25)",
                }}
              />
            )}

            <motion.div
              animate={{
                scale: active
                  ? 1.15
                  : 1,
              }}
              transition={{
                duration: 0.2,
              }}
              className="relative z-10"
            >
              <Icon
                size={22}
                color={
                  active
                    ? "#ff6666"
                    : subTextColor
                }
              />
            </motion.div>

            <motion.span
              animate={{
                scale: active
                  ? 1.05
                  : 1,
              }}
              className="text-[10px] mt-1 relative z-10 font-medium"
              style={{
                color: active
                  ? "#ff6666"
                  : subTextColor,
              }}
            >
              {item.label}
            </motion.span>
          </Link>
        );
      })}
    </div>
  </div>
);
}