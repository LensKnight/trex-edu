import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../src/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
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

    // Users can only upload lectures for their own class/section
    if (
      profile.class_name !== class_name ||
      profile.section !== section
    ) {
      return NextResponse.json(
        { error: "Invalid class or section" },
        { status: 403 }
      );
    }

    // Verify that the staging file exists
    const folder = file_path.split("/").slice(0, -1).join("/");
    const fileNameOnly = file_path.split("/").pop();

    if (!fileNameOnly) {
      return NextResponse.json(
        { error: "Invalid file path" },
        { status: 400 }
      );
    }

    const { data: files, error: listError } =
      await supabaseAdmin.storage
        .from("lecture-staging")
        .list(folder);

    if (listError) {
      return NextResponse.json(
        { error: "Could not verify uploaded file" },
        { status: 500 }
      );
    }

    const exists = files?.some(
      (file) => file.name === fileNameOnly
    );

    if (!exists) {
      return NextResponse.json(
        { error: "Staging file not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Lecture upload verified",
      user_id: user.id,
      file_path,
      file_name,
      file_type: file_type || "audio/mpeg",
      file_size: file_size || null,
      duration: duration || null,
    });
  } catch (error) {
    console.error("Lecture upload API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}