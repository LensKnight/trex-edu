const TELEGRAM_BOT_TOKEN =
  process.env.NEXT_PUBLIC_BOT_TOKEN!;

export async function GET(req: Request) {
  try {
    const searchParams = new URL(req.url).searchParams;

    const directUrl = searchParams.get("url");
    const fileId = searchParams.get("file_id");

    let telegramUrl = directUrl;

    // -----------------------------------------
    // Resolve Telegram file_id
    // -----------------------------------------
    if (!telegramUrl && fileId) {
      const fileResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(
          fileId
        )}`,
        {
          cache: "no-store",
        }
      );

      const fileData = await fileResponse.json();

      console.log("Telegram getFile response:", fileData);

      if (
        !fileData.ok ||
        !fileData.result?.file_path
      ) {
        return new Response(
          JSON.stringify({
            error: "Telegram file not found",
            telegram: fileData,
          }),
          {
            status: 404,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      telegramUrl =
        `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;
    }

    if (!telegramUrl) {
      return new Response(
        "Missing file_id or url",
        {
          status: 400,
        }
      );
    }

    // -----------------------------------------
    // Forward Range header
    // -----------------------------------------

    const range = req.headers.get("range");

    const upstream = await fetch(
      telegramUrl,
      {
        headers: range
          ? {
              Range: range,
            }
          : {},
        cache: "no-store",
      }
    );

    if (
      !upstream.ok &&
      upstream.status !== 206
    ) {
      console.error(
        "Telegram file fetch failed:",
        upstream.status,
        upstream.statusText
      );

      return new Response(
        "Failed to fetch Telegram file",
        {
          status: 502,
        }
      );
    }

    const headers = new Headers();

    headers.set(
      "Content-Type",
      upstream.headers.get(
        "content-type"
      ) || "audio/mpeg"
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

    // -----------------------------------------
    // Audio seeking
    // -----------------------------------------

    headers.set(
      "Accept-Ranges",
      upstream.headers.get(
        "accept-ranges"
      ) || "bytes"
    );

    const contentRange =
      upstream.headers.get(
        "content-range"
      );

    if (contentRange) {
      headers.set(
        "Content-Range",
        contentRange
      );
    }

    const contentLength =
      upstream.headers.get(
        "content-length"
      );

    if (contentLength) {
      headers.set(
        "Content-Length",
        contentLength
      );
    }

    return new Response(
      upstream.body,
      {
        status: upstream.status,
        headers,
      }
    );
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
      "Access-Control-Max-Age":
        "86400",
    },
  });
}