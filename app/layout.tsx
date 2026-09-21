"use client";

import ThemedBody from "./ThemedBody";
import { ThemeProvider, useTheme } from "../src/context/ThemeContext";
import "./globals.css";
import Sidebar from "../components/Sidebar";
import PushNotificationManager from "../components/PushNotificationManager"; // 👈 Push Manager Import
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "../src/lib/supabase";                           // 👈 Sahi Supabase Path[cite: 1]

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { darkMode } = useTheme();
  const hideSidebar = pathname === "/" || pathname === "/upload-photo";
  const isMobilePage = pathname.startsWith("/mobile");
  const [collapsed, setCollapsed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // 1. Service Worker Auto-Registration
  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("✅ Service Worker Registered Successfully! Scope:", reg.scope);
        })
        .catch((err) => {
          console.error("❌ Service Worker Registration Failed:", err);
        });
    }
  }, []);

  // 2. Authenticated User Fetch Karein
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!isMobilePage) {
      setCollapsed(true);
    }
  }, [pathname, isMobilePage]);

  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";

  return (
    <ThemedBody>
      {/* Background Push Sync Component */}
      <PushNotificationManager userId={userId} />
        <div className="flex min-h-screen" style={{ background: bg }}>
          {!hideSidebar && !isMobilePage && (
            <div className="flex shrink-0">
              <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
            </div>
          )}

          <main
            className="flex-1 min-h-screen transition-[margin] duration-300"
            style={{
              marginLeft:
                hideSidebar || isMobilePage
                  ? "0"
                  : collapsed
                  ? "60px"
                  : "250px",
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >

            {children}
            <div style={{ height: "64px" }} />
          </main>
        </div>
   
    </ThemedBody>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ fontSize: "14px", fontFamily: "'DM Sans', sans-serif" }}>
      <body
        style={{
          overflowY: "auto",
          overflowX: "hidden",
          minHeight: "100vh",
          overscrollBehaviorY: "auto",
        }}
      >
        <ThemeProvider>
          <LayoutInner>{children}</LayoutInner>
        </ThemeProvider>
      </body>
    </html>
  );
}