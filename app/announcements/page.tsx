"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";

type Announcement = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<
    Announcement[]
  >([]);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  async function fetchAnnouncements() {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setAnnouncements(data);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">

      <h1 className="text-4xl font-bold mb-8 text-red-500">
        📢 Announcements
      </h1>

      <div className="space-y-6">
        {announcements.map((item) => (
          <div
            key={item.id}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg"
          >
            <h2 className="text-2xl font-bold mb-2">
              {item.title}
            </h2>

            <p className="text-zinc-300 mb-4">
              {item.message}
            </p>

            <p className="text-xs text-zinc-500">
              {new Date(
                item.created_at
              ).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}