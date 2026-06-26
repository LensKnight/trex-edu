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

  return (
    <html lang="en" style={{fontSize: "14px", fontFamily: "'DM Sans', sans-serif"}}>
      <body style={{overflowY: "auto", overflowX: "hidden", minHeight: "100vh"}}>
        <ThemeProvider>
          <ThemedBody>

            {/* MOBILE LAYOUT */}
            {isMobilePage ? (
              <div className="w-full">
                {children}
              </div>
            ) : (

              /* DESKTOP LAYOUT */
              <div className="flex min-h-screen">

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
                </main>

              </div>
            )}
          </ThemedBody>
        </ThemeProvider>
      </body>
    </html>
  );
}