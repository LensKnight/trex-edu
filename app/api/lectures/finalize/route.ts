import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../src/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN!;

const TELEGRAM_CHAT_ID =
  process.env.TELEGRAM_LECTURE_CHAT_ID!;

export async function POST(req: Request) {
  try {
    // -----------------------------
    // 1. Authenticate user
    // -----------------------------

    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

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

    // -----------------------------
    // 2. Read request
    // -----------------------------

    const body = await req.json();

    const {
      title,
      subject,
      class_name,
      section,
      file_path,
      file_name,
      file_type,
      file_size,
      duration,
    } = body;

    if (
      !title ||
      !subject ||
      !class_name ||
      !section ||
      !file_path ||
      !file_name
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // -----------------------------
    // 3. Check profile
    // -----------------------------

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("class_name, section")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    if (
      profile.class_name !== class_name ||
      profile.section !== section
    ) {
      return NextResponse.json(
        { error: "Invalid class or section" },
        { status: 403 }
      );
    }

    // -----------------------------
    // 4. Download staging file
    // -----------------------------

    const { data: fileData, error: downloadError } =
      await supabaseAdmin.storage
        .from("lecture-staging")
        .download(file_path);

    if (downloadError || !fileData) {
      console.error(downloadError);

      return NextResponse.json(
        { error: "Could not download staging file" },
        { status: 500 }
      );
    }

    // -----------------------------
    // 5. Send to Telegram
    // -----------------------------

    const telegramForm = new FormData();

    telegramForm.append(
      "chat_id",
      TELEGRAM_CHAT_ID
    );

    telegramForm.append(
      "caption",
      `🎧 ${title}\n\n📚 Subject: ${subject}\n👤 Uploaded by: ${user.id}`
    );

    telegramForm.append(
      "audio",
      new Blob([await fileData.arrayBuffer()], {
        type: file_type || "audio/mpeg",
      }),
      file_name
    );

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendAudio`,
      {
        method: "POST",
        body: telegramForm,
      }
    );

    const telegramData =
      await telegramResponse.json();

    if (!telegramData.ok) {
      console.error(
        "Telegram error:",
        telegramData
      );

      return NextResponse.json(
        {
          error:
            telegramData.description ||
            "Telegram upload failed",
        },
        { status: 500 }
      );
    }

    // -----------------------------
    // 6. Extract Telegram file_id
    // -----------------------------

    const telegramFileId =
      telegramData.result?.audio?.file_id;

    if (!telegramFileId) {
      return NextResponse.json(
        { error: "Telegram file_id not received" },
        { status: 500 }
      );
    }

    // -----------------------------
    // 7. Save lecture in database
    // -----------------------------

    const { data: lecture, error: insertError } =
      await supabaseAdmin
        .from("lectures")
        .insert({
          title,
          subject,
          class_name,
          section,
          file_id: telegramFileId,
          file_name,
          file_type:
            file_type || "audio/mpeg",
          file_size: file_size || null,
          duration: duration || null,
          uploader_id: user.id,
        })
        .select()
        .single();

    if (insertError) {
      console.error(insertError);

      return NextResponse.json(
        {
          error:
            "Telegram upload succeeded but database save failed",
        },
        { status: 500 }
      );
    }

    // -----------------------------
    // 8. Delete staging file
    // -----------------------------

    const { error: deleteError } =
      await supabaseAdmin.storage
        .from("lecture-staging")
        .remove([file_path]);

    if (deleteError) {
      console.warn(
        "Could not delete staging file:",
        deleteError
      );
    }

    // -----------------------------
    // 9. Success
    // -----------------------------

    return NextResponse.json({
      success: true,
      lecture,
    });
  } catch (error) {
    console.error(
      "Lecture finalize error:",
      error
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}