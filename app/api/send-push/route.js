import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabase } from '@/src/lib/supabase';

webpush.setVapidDetails(
  'mailto:admin@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function POST(req) {
  try {
    const bodyPayload = await req.json();

    // Supabase Webhook data (`record`) ya Direct Body Payload extract karein
    const record = bodyPayload.record || bodyPayload;
    const title = record.title || "Naya Announcement 📢";
    const body = record.message || record.body || "Aapke liye ek naya update aaya hai.";
    const link = record.link || "/mobile";

    // Subscriptions Table se saare active devices ka subscription token fetch karein
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('subscription');

    if (error || !subs || subs.length === 0) {
      return NextResponse.json({ message: 'No push subscriptions found.' });
    }

    const payload = JSON.stringify({ title, body, link });

    // Saare subscribed devices ko notification dispatch karein
    const notifications = subs.map((s) =>
      webpush.sendNotification(s.subscription, payload).catch((err) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Expired / Unsubscribed devices ko table se delete karein
          supabase
            .from('push_subscriptions')
            .delete()
            .eq('subscription', s.subscription);
        }
      })
    );

    await Promise.all(notifications);

    return NextResponse.json({ success: true, count: subs.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}