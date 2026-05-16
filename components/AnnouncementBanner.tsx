"use client";

import { useEffect, useState } from "react";
import { supabase } from "../src/lib/supabase";

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);
      if (data) setAnnouncements(data);
    }
    fetch();
  }, []);

  if (announcements.length === 0) return null;

  return (
    <div className="w-full px-4 py-3 text-white text-sm font-medium text-center" style={{background: "linear-gradient(90deg, #6b0000, #3d0000)"}}>
      📢 {announcements[0].message}
    </div>
  );
}