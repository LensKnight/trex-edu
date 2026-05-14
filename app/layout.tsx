"use client";

import "./globals.css";
import Sidebar from "../components/Sidebar";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";

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
      <body className="bg-black text-white">
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
      </body>
    </html>
  );
}