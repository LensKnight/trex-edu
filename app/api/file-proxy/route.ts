
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_SECOND_BOT_TOKEN!;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("file_id");

    // Only Telegram file_id is accepted
    if (!fileId) {
      return Response.json(
        { error: "Missing file_id" },
        { status: 400 }
      );
    }

    if (!TELEGRAM_BOT_TOKEN) {
      console.error("Telegram bot token is missing");
      return Response.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Resolve Telegram file
    const fileResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`,
      { cache: "no-store" }
    );

    const fileData = await fileResponse.json();

    if (!fileData.ok || !fileData.result?.file_path) {
      return Response.json(
        { error: "Telegram file not found" },
        { status: 404 }
      );
    }

    // Fetch actual file
    const telegramUrl =
      `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;

    const range = req.headers.get("range");

    const upstream = await fetch(telegramUrl, {
      headers: range ? { Range: range } : {},
      cache: "no-store",
    });

    if (!upstream.ok && upstream.status !== 206) {
      return new Response("Failed to fetch Telegram file", {
        status: 502,
      });
    }

    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "https://trexview.vercel.app");
    headers.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges, Content-Type");

    const ext = searchParams.get("ext")?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      bmp: "image/bmp",
    };

    headers.set(
      "Content-Type",
      mimeTypes[ext || ""] || "application/octet-stream"
    );
    headers.set("Content-Disposition", "inline");
    headers.set("Cache-Control", "private, no-store");
    headers.set(
      "Accept-Ranges",
      upstream.headers.get("accept-ranges") || "bytes"
    );

    const contentRange = upstream.headers.get("content-range");
    const contentLength = upstream.headers.get("content-length");

    if (contentRange) headers.set("Content-Range", contentRange);
    if (contentLength) headers.set("Content-Length", contentLength);

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.error("File proxy error:", error);

    return new Response("Internal proxy error", {
      status: 500,
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://trexview.vercel.app",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}