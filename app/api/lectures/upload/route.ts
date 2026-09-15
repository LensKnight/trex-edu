import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../../../../src/lib/supabaseAdmin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

export async function POST(req: Request) {
  try {
    // =========================================================
    // 1. AUTHENTICATE USER
    // =========================================================

    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

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

    // =========================================================
    // 2. READ FORM DATA
    // =========================================================

    const formData = await req.formData();

    const file = formData.get("file");
    const title = formData.get("title")?.toString().trim();
    const subject = formData.get("subject")?.toString().trim();

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "Lecture title is required" },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { error: "Subject is required" },
        { status: 400 }
      );
    }

    // =========================================================
    // 3. CHECK PROFILE
    // =========================================================

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("class_name, section, full_name")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
      console.error("Profile error:", profileError);

      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // =========================================================
    // 4. VALIDATE AUDIO FILE
    // =========================================================

    const fileName = file.name || "lecture.mp3";

    const extension =
      fileName
        .split(".")
        .pop()
        ?.toLowerCase() || "";

    const allowedExtensions = [
      "mp3",
      "m4a",
      "wav",
      "ogg",
      "oga",
      "aac",
      "flac",
      "webm",
    ];

    if (!allowedExtensions.includes(extension)) {
      return NextResponse.json(
        {
          error:
            "Unsupported audio format. Please upload MP3, M4A, WAV, OGG, AAC, FLAC or WEBM.",
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 5. DETERMINE CORRECT MIME TYPE
    // =========================================================
    //
    // Browser MIME type kabhi-kabhi unreliable hota hai.
    // Isliye extension ke basis par fallback rakha hai.
    //

    const mimeTypes: Record<string, string> = {
      mp3: "audio/mpeg",
      m4a: "audio/mp4",
      wav: "audio/vnd.wave",
      ogg: "audio/ogg",
      oga: "audio/ogg",
      aac: "audio/aac",
      flac: "audio/flac",
      webm: "audio/webm",
    };

    const mimeType =
      mimeTypes[extension] ||
      file.type ||
      "audio/mpeg";

    // =========================================================
    // 6. CREATE AUDIO BLOB
    // =========================================================
    //
    // Explicit MIME type Telegram ko diya jayega.
    //

    const fileBuffer = await file.arrayBuffer();

    const audioBlob = new Blob(
      [fileBuffer],
      {
        type: mimeType,
      }
    );

    // =========================================================
    // 7. SEND AUDIO DIRECTLY TO TELEGRAM
    // =========================================================

    const telegramForm = new FormData();

    telegramForm.append(
      "chat_id",
      TELEGRAM_CHAT_ID
    );

    telegramForm.append(
      "title",
      title
    );

    telegramForm.append(
      "performer",
      profile.full_name || "TreX Edu"
    );

    telegramForm.append(
      "caption",
      `🎧 ${title}

📚 Subject: ${subject}
🏫 Class: ${profile.class_name} - ${profile.section}
👤 Uploaded by: ${profile.full_name || "Unknown"}` 
    );

    telegramForm.append(
      "audio",
      audioBlob,
      fileName
    );

    console.log(
      "Uploading lecture to Telegram:",
      {
        fileName,
        mimeType,
        size: file.size,
        title,
        subject,
      }
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

    // =========================================================
    // 8. CHECK TELEGRAM RESPONSE
    // =========================================================

    if (!telegramData.ok) {
      console.error(
        "Telegram upload failed:",
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

    // =========================================================
    // 9. EXTRACT AUDIO OBJECT
    // =========================================================

    const audio =
      telegramData.result?.audio;

    if (!audio) {
      console.error(
        "Telegram response did not contain audio:",
        telegramData
      );

      return NextResponse.json(
        {
          error:
            "Telegram did not return an audio object",
        },
        { status: 500 }
      );
    }

    // =========================================================
    // 10. GET TELEGRAM FILE ID
    // =========================================================

    const telegramFileId =
      audio.file_id;

    if (!telegramFileId) {
      return NextResponse.json(
        {
          error:
            "Telegram file_id was not received",
        },
        { status: 500 }
      );
    }

    // =========================================================
    // 11. SAVE METADATA IN SUPABASE
    // =========================================================

    const { data: lecture, error: insertError } =
      await supabaseAdmin
        .from("lectures")
        .insert({
          title,
          subject,

          class_name:
            profile.class_name,

          section:
            profile.section,

          file_id:
            telegramFileId,

          file_name:
            fileName,

          file_type:
            mimeType,

          file_size:
            file.size,

          duration:
            audio.duration || null,

          uploader_id:
            user.id,
        })
        .select()
        .single();

    if (insertError) {
      console.error(
        "Lecture database error:",
        insertError
      );

      return NextResponse.json(
        {
          error:
            "Lecture uploaded to Telegram, but database save failed",
          telegram_file_id:
            telegramFileId,
        },
        { status: 500 }
      );
    }

    // =========================================================
    // 12. SUCCESS
    // =========================================================

    console.log(
      "Lecture uploaded successfully:",
      {
        lectureId: lecture.id,
        telegramFileId,
      }
    );

    return NextResponse.json({
      success: true,

      lecture,

      telegram: {
        file_id:
          telegramFileId,

        file_name:
          fileName,

        mime_type:
          mimeType,

        duration:
          audio.duration || null,
      },
    });

  } catch (error: any) {
    console.error("========== LECTURE UPLOAD ERROR ==========");
    console.error(error);
    console.error("Message:", error?.message);
    console.error("Stack:", error?.stack);
    console.error("==========================================");

    return NextResponse.json(
      {
        error: error?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}