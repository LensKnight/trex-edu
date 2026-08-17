import { NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

export async function GET(req: Request) {
  try {
    const searchParams = new URL(req.url).searchParams;

    const directUrl = searchParams.get("url");
    const fileId = searchParams.get("file_id");

    let telegramUrl = directUrl;

    // ------------------------------------------------
    // If file_id is provided, resolve Telegram file path
    // server-side so bot token never reaches browser
    // ------------------------------------------------
    if (!telegramUrl && fileId) {
      const fileResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(
          fileId
        )}`
      );

      const fileData = await fileResponse.json();

      if (!fileData.ok || !fileData.result?.file_path) {
        return new Response("Telegram file not found", {
          status: 404,
        });
      }

      telegramUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;
    }

    if (!telegramUrl) {
      return new Response("Missing file_id or url", {
        status: 400,
      });
    }

    // ------------------------------------------------
    // Forward Range header for audio seeking
    // ------------------------------------------------

    const range = req.headers.get("range");

    const upstream = await fetch(telegramUrl, {
      headers: range
        ? {
            Range: range,
          }
        : {},
    });

    if (!upstream.ok && upstream.status !== 206) {
      return new Response("Failed to fetch file", {
        status: 502,
      });
    }

    const headers = new Headers();

    headers.set(
      "Content-Type",
      upstream.headers.get("content-type") ||
        "audio/mpeg"
    );

    headers.set(
      "Access-Control-Allow-Origin",
      "*"
    );

    headers.set(
      "Access-Control-Expose-Headers",
      "Content-Range, Accept-Ranges, Content-Length"
    );

    headers.set(
      "Cache-Control",
      "public, max-age=3600"
    );

    // ------------------------------------------------
    // Important for audio seeking
    // ------------------------------------------------

    const acceptRanges =
      upstream.headers.get("accept-ranges");

    if (acceptRanges) {
      headers.set("Accept-Ranges", acceptRanges);
    } else {
      headers.set("Accept-Ranges", "bytes");
    }

    const contentRange =
      upstream.headers.get("content-range");

    if (contentRange) {
      headers.set(
        "Content-Range",
        contentRange
      );
    }

    const contentLength =
      upstream.headers.get("content-length");

    if (contentLength) {
      headers.set(
        "Content-Length",
        contentLength
      );
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.error(
      "File proxy error:",
      error
    );

    return new Response(
      "Internal proxy error",
      {
        status: 500,
      }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods":
        "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers":
        "Range",
      "Access-Control-Max-Age": "86400",
    },
  });
}