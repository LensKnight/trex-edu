import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const username = formData.get("username") as string;
    const photo = formData.get("photo") as File;

    if (!username || !photo) {
      return NextResponse.json(
        { error: "Missing data" },
        { status: 400 }
      );
    }

    const telegramForm = new FormData();

    telegramForm.append(
      "chat_id",
      process.env.TELEGRAM_CHAT_ID!
    );

    telegramForm.append(
      "caption",
      `📸 TREX EDU

Username: ${username}`
    );

    telegramForm.append(
      "photo",
      photo,
      photo.name
    );

    const telegram = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`,
      {
        method: "POST",
        body: telegramForm,
      }
    );

    const result = await telegram.json();

    if (!telegram.ok) {
      console.log(result);

      return NextResponse.json(
        { error: result },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });

  } catch (err) {

    console.log(err);

    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}