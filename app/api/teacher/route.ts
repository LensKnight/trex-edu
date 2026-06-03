import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { subject, topic, difficulty, mode } = await req.json();

    const prompt =
    mode === "Quiz"
    ? `
    You are a quiz generator. 
    Questions must be in the context of Indian school curriculum of class 12.

    Subject: ${subject}
    Topic: ${topic}
    Difficulty: ${difficulty}

    Return ONLY valid JSON.

    Format:

    {
      "questions": [
        {
          "question": "Question text",
          "options": [
            "Option A",
            "Option B",
            "Option C",
            "Option D"
          ],
          "answer": "Correct Option"
        }
      ]
    }

    Rules:
    - Generate exactly 10 MCQs
    - Exactly 4 options
    - Include answer field
    - No markdown
    - No explanation
    - No extra text
    - JSON only
    `
    : mode === "Exam"
    ? `
    Create a full school exam paper.

    Subject: ${subject}
    Topic: ${topic}
    Difficulty: ${difficulty}

    Section A: 5 MCQ
    Section B: 5 Short Questions
    Section C: 3 Long Questions

    No answers.
    `
    : `
    You are an expert Indian teacher.

    Subject: ${subject}
    Topic: ${topic}
    Difficulty: ${difficulty}

    Generate 10 practice questions.

    Mix:
    - Theory
    - Numericals
    - Application based

    No answers.
    `;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "AI Teacher",
        },
          body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                mode === "Quiz"
                  ? "You must return only valid JSON."
                  : "You are an expert Indian school teacher.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.log("OPENROUTER ERROR:", data);

      return NextResponse.json(
        { error: data },
        { status: response.status }
      );
    }

    console.log("OPENROUTER RESPONSE:");
    console.log(JSON.stringify(data, null, 2));

    return NextResponse.json({
      result:
        data.choices?.[0]?.message?.content || "No response",
    });
  } catch (error) {
    console.log("SERVER ERROR:", error);

    return NextResponse.json(
      { error: "Server failed" },
      { status: 500 }
    );
  }
}