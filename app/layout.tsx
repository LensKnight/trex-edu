"use client";

import ThemedBody from "./ThemedBody";
import { ThemeProvider, useTheme } from "../src/context/ThemeContext";
import "./globals.css";
import Sidebar from "../components/Sidebar";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { darkMode } = useTheme();
  const hideSidebar =
    pathname === "/" ||
    pathname === "/upload-photo";
  const isMobilePage = pathname.startsWith("/mobile");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isMobilePage) {
      setCollapsed(true);
    }
  }, [pathname, isMobilePage]);

  // Same maroon theme used across the pages — this is what the extra
  // bottom/top space now shows instead of black.
  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";

  return (
    <ThemedBody>

      {/* MOBILE LAYOUT */}
      {isMobilePage ? (
        <div className="w-full" style={{ background: bg, minHeight: "100vh" }}>
          {children}
          {/* Bottom breathing room — keeps content clear of the fixed MobileNavbar
              and gives scroll somewhere to settle instead of stopping flush at the edge */}
          <div style={{ height: "96px" }} />
        </div>
      ) : (

        /* DESKTOP LAYOUT */
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
            {/* Bottom breathing room on desktop too */}
            <div style={{ height: "64px" }} />
          </main>

        </div>
      )}
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