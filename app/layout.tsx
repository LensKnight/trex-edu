"use client";

import AnnouncementBanner from "../components/AnnouncementBanner";
import ThemedBody from "./ThemedBody";
import { ThemeProvider } from "../src/context/ThemeContext";
import "./globals.css";
import Sidebar from "../components/Sidebar";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/next";


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideSidebar = pathname === "/";
  const [collapsed, setCollapsed] = useState(false);

  // Page change hone pe collapse karo
  useEffect(() => {
    setCollapsed(true);
  }, [pathname]);

  return (
    <html lang="en" style={{fontSize: "14px", fontFamily: "'DM Sans', sans-serif"}}>
      <body>
        <ThemeProvider>
          <ThemedBody>
            <div className="flex">
              {!hideSidebar && (
                <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
              )}
              <main
                className="flex-1 min-h-screen transition-all duration-300"
                style={{ marginLeft: hideSidebar ? "0" : collapsed ? "60px" : "250px" }}
              >
                {children}
              </main>
            </div>
          </ThemedBody>
        </ThemeProvider>
        <Analytics />
      </body>
          </html>
  );
}