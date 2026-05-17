"use client";

import ThemedBody from "./ThemedBody";
import { ThemeProvider } from "../src/context/ThemeContext";
import "./globals.css";
import Sidebar from "../components/Sidebar";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Homepage pe sidebar hide
  const hideSidebar = pathname === "/";

  // Mobile pages detect
  const isMobilePage = pathname.startsWith("/mobile");

  const [collapsed, setCollapsed] = useState(false);

  // Desktop pe page change hone pe collapse
  useEffect(() => {
    if (!isMobilePage) {
      setCollapsed(true);
    }
  }, [pathname, isMobilePage]);

  return (
    <html
      lang="en"
      style={{
        fontSize: "14px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <body>
        <ThemeProvider>
          <ThemedBody>

            {/* MOBILE LAYOUT */}
            {isMobilePage ? (
              <div className="w-full overflow-x-hidden">
                {children}
              </div>
            ) : (

              /* DESKTOP LAYOUT */
              <div className="flex min-h-screen relative">

                {/* Sidebar */}
                {!hideSidebar && (
                  <div className="hidden md:block">
                    <Sidebar
                      collapsed={collapsed}
                      setCollapsed={setCollapsed}
                    />
                  </div>
                )}

                {/* Main Content */}
                <main
                  className="min-h-screen transition-all duration-300"
                  style={{
                    marginLeft: hideSidebar ? "0px" : collapsed ? "80px" : "256px",
                  }}
                >
                  {children}
                </main>

              </div>
            )}
          </ThemedBody>
        </ThemeProvider>
      </body>
    </html>
  );
}