import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("file_id");

  if (!fileId) {
    return NextResponse.json({ error: "File ID is required" }, { status: 400 });
  }

  const botToken = process.env.NEXT_PUBLIC_BOT_TOKEN;

  if (!botToken) {
    return NextResponse.json({ error: "Bot token not configured" }, { status: 500 });
  }

  try {
    // 1. Telegram se File Path fetch karein (Server-side par CORS blocked nahi hota)
    const fileInfoRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );
    const fileInfo = await fileInfoRes.json();

    if (!fileInfo.ok) {
      return NextResponse.json({ error: "File not found on Telegram" }, { status: 404 });
    }

    const filePath = fileInfo.result.file_path;
    const telegramFileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

    // 2. Original File ko stream/buffer karein
    const fileRes = await fetch(telegramFileUrl);
    if (!fileRes.ok) {
      return NextResponse.json({ error: "Failed to download file from Telegram" }, { status: 500 });
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const contentType = fileRes.headers.get("content-type") || "application/octet-stream";

    // 3. Client ko safely file response bheinjein
    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}