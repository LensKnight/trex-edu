import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";

const allowedExtensions = [
  "pdf", "jpg", "jpeg", "png", "webp", "gif", "bmp",
];

export async function POST(req: Request) {
  try {
    const token = req.headers
      .get("Authorization")
      ?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = String(formData.get("title") || "");
    const subject = String(formData.get("subject") || "");
    const category = String(formData.get("category") || "");

    if (!file || !title || !subject || !category) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (file.size > 30 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File must be smaller than 30MB" },
        { status: 400 }
      );
    }

    const fileType = file.name.split(".").pop()?.toLowerCase() || "";

    if (!allowedExtensions.includes(fileType)) {
      return NextResponse.json(
        { error: "Only PDF and image files are allowed" },
        { status: 400 }
      );
    }

    const chatId = process.env.TELEGRAM_CHAT_ID;
    const botToken = process.env.TELEGRAM_SECOND_BOT_TOKEN;

    if (!chatId || !botToken) {
      return NextResponse.json(
        { error: "Telegram configuration missing" },
        { status: 500 }
      );
    }

    const profile = await supabaseAdmin
      .from("profiles")
      .select("class_name, section")
      .eq("id", user.id)
      .single();

    if (profile.error) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const telegramForm = new FormData();
    telegramForm.append("chat_id", chatId);
    telegramForm.append("document", file, file.name);
    telegramForm.append(
      "caption",
      `Title: ${title}\nSubject: ${subject}\nCategory: ${category}\nClass: ${profile.data.class_name}\nSection: ${profile.data.section}`
    );

    const telegram = await fetch(
      `https://api.telegram.org/bot${botToken}/sendDocument`,
      {
        method: "POST",
        body: telegramForm,
      }
    );

    const result = await telegram.json();

    if (!telegram.ok || !result.ok) {
      return NextResponse.json(
        { error: "Telegram upload failed" },
        { status: 502 }
      );
    }

    const fileId = result.result?.document?.file_id;

    if (!fileId) {
      return NextResponse.json(
        { error: "Telegram file ID missing" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      file_id: fileId,
      file_type: fileType,
    });
  } catch (error) {
    console.error("Upload note error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}