"use client";

import { useEffect } from "react";
import { supabase } from "@/src/lib/supabase"; // Path adjust kar lein[cite: 1]

export default function PushNotificationManager({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (!userId || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    registerPush();

    async function registerPush() {
      try {
        // 1. Service worker register karein
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        // 2. Notification permission maangein
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // 3. Subscription fetch/create karein
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          });
        }

        // 4. Supabase DB mein subscription store karein
        await supabase.from('push_subscriptions').upsert(
          {
            user_id: userId,
            subscription: subscription.toJSON(),
          },
          { onConflict: 'user_id, subscription' }
        );
      } catch (err) {
        console.error("Push registration failed:", err);
      }
    }
  }, [userId]);

  return null;
}