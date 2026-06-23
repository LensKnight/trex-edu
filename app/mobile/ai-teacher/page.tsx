"use client";

import { useEffect, useState } from "react";
import { useTheme } from "../../../src/context/ThemeContext";
import MobileNavbar from "../../../components/MobileNavbar";
import MobilePageWrapper from "@/components/MobilePageWrapper";
import { Bot } from "lucide-react";
import { supabase } from "../../../src/lib/supabase";

export default function AITeacherPage() {

  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/";
        return;
      }

      setCheckingAuth(false);
    }

    checkUser();
  }, []);

  const { darkMode } = useTheme();
  const [subject, setSubject] = useState("Physics");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [questions, setQuestions] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("Practice");
  const [quiz, setQuiz] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState("");     
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState<
  {
      question: string;
      selected: string;
      correct: string;
      isCorrect: boolean;
    }[]
  >([]);

  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";

  const textColor = darkMode ? "#ffffff" : "#1a0000";
  const subTextColor = darkMode ? "#a1a1aa" : "#8b0000";

  const cardBg = darkMode
    ? "rgba(255,255,255,0.05)"
    : "rgba(255,255,255,0.7)";

  const border = darkMode
      ? "1px solid rgba(255,255,255,0.1)"
    : "1px solid rgba(0,0,0,0.1)";
  useEffect(() => {
    if (!finished || quiz.length === 0) return;

    const target = Math.round(
      (score / quiz.length) * 100
    );

    let current = 0;

    const interval = setInterval(() => {
      current++;

      if (current >= target) {
        current = target;
        clearInterval(interval);
      }

      setAnimatedPercent(current);
    }, 15);

    return () => clearInterval(interval);
  }, [finished, score, quiz.length]);


    async function generateQuestions() {    
    if (!topic.trim()) {
        alert("Enter a topic");
        return;
    }

    setLoading(true);

    try {
        const res = await fetch("/api/teacher", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            subject,
            topic,
            difficulty,
            mode,
        }),
        
        });

        const data = await res.json();

        console.log("API RESPONSE:", data);

        if (!res.ok) {
        alert(data?.error?.error?.message || "API Error");
        setLoading(false);
        return;
        }

        if (mode === "Quiz") {
        const parsed = JSON.parse(data.result);
        console.log("PARSED:", parsed);

        setQuiz(
          Array.isArray(parsed.questions)
            ? parsed.questions
            : []
        );
        setCurrent(0);
        setScore(0);
        setSelected("");
        setFinished(false);
        } else {
        setQuestions(data.result);
        }
    }   
        catch (err) {
        console.log(err);
        alert("Network error / server not running");
        }

    setLoading(false);
    }

    if (checkingAuth) {
      return (
        <MobilePageWrapper>
          <div className="loading-screen">
            <img
              src="/toggle-icon.png"
              className="loading-x"
              alt="loading"
            />
            <div className="loading-text">
              Loading AI-Teacher
            </div>
          </div>

          <MobileNavbar
            darkMode={darkMode}
            subTextColor={subTextColor}
            border={border}
          />
        </MobilePageWrapper>
      );
    }


  return (
    
   <MobilePageWrapper>
    <div
      className="min-h-screen p-4"
      style={{
        background: bg,
        color: textColor,
      }}
    >
      {/* HEADER */}

      <div className="mb-8">
        <p
          className="text-xs tracking-[0.25em] uppercase mb-2"
          style={{ color: subTextColor }}
        >
          Powered by OpenRouter
        </p>

        <h1 className="text-3xl font-bold">
          <Bot className="inline-block mr-2" />
          AI Teacher
        </h1>
        <div
          className="h-0.5 w-16 mt-2 rounded-full"
          style={{
            background:
              "linear-gradient(90deg,#8b0000,transparent)",
          }}
        />
      </div>

      {/* FORM */}

      <div
        className="p-4 rounded-3xl mb-6"
        style={{
          background: cardBg,
          border,
        }}
      >
        {/* SUBJECT */}

        <div className="mb-4">
          <label
            className="block mb-2 text-sm"
            style={{ color: subTextColor }}
          >
            Subject
          </label>

          <select
            value={subject}
            onChange={(e) =>
              setSubject(e.target.value)
            }
            className="w-full p-3 rounded-2xl outline-none"
            style={{
              background: cardBg,
              color: textColor,
              border,
            }}
          >
            <option>Physics</option>
            <option>Chemistry</option>
            <option>Mathematics</option>
            <option>Computer Science</option>
            <option>English</option>
          </select>
        </div>

        {/* TOPIC */}

        <div className="mb-4">
          <label
            className="block mb-2 text-sm"
            style={{ color: subTextColor }}
          >
            Topic
          </label>

          <input
            value={topic}
            onChange={(e) =>
              setTopic(e.target.value)
            }
            placeholder="Current Electricity"
            className="w-full p-3 rounded-2xl outline-none"
            style={{
              background: cardBg,
              color: textColor,
              border,
            }}
          />
        </div>

        {/* DIFFICULTY */}
        <div className="mb-5">
        <label
            className="block mb-2 text-sm"
            style={{ color: subTextColor }}
        >
            Mode
        </label>

        <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full p-3 rounded-2xl outline-none"
            style={{
            background: cardBg,
            color: textColor,
            border,
            }}
        >
            <option>Practice</option>
            <option>Quiz</option>
            <option>Exam</option>
        </select>
        </div>       

        <div className="mb-5">
          <label
            className="block mb-2 text-sm"
            style={{ color: subTextColor }}
          >
            Difficulty
          </label>

          <select
            value={difficulty}
            onChange={(e) =>
              setDifficulty(e.target.value)
            }
            className="w-full p-3 rounded-2xl outline-none"
            style={{
              background: cardBg,
              color: textColor,
              border,
            }}
          >
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>        
        </div>

        {/* BUTTON */}
        <button
          onClick={generateQuestions}
          disabled={loading}
          className={`w-full p-4 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
            loading ? "animate-pulse" : "hover:scale-[1.02]"
          }`}
          style={{
            background:
              "linear-gradient(135deg,#b30000,#3d0000)",
            color: "#fff",
          }}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Questions"
          )}
        </button>

      </div>

    {/* QUIZ MODE UI */}
    {mode === "Quiz" && Array.isArray(quiz) && quiz.length > 0 && !finished && (
    <div
        className="p-4 rounded-3xl mb-6"
        style={{ background: cardBg, border }}
    >
        {/* Progress */}
        <div className="mb-3 text-sm">
        Question {current + 1} / {quiz.length}
        </div>

        {/* Question */}
        <h2 className="text-lg font-bold mb-4">
        {quiz[current].question}
        </h2>

        {/* Options */}
        <div className="space-y-3">
        {quiz[current].options.map((opt: string, i: number) => (
            <button
            key={i}
            onClick={() => setSelected(opt)}
            className="w-full p-3 rounded-xl"
            style={{
                background: selected === opt ? "#8b0000" : cardBg,
                color: textColor,
                border,
            }}
            >
            {opt}
            </button>
        ))}
        </div>

        {/* NEXT */}
          <button
            disabled={!selected}
            className="w-full mt-5 p-3 rounded-xl font-bold"
            style={{
              background: selected
                ? "linear-gradient(135deg,#b30000,#3d0000)"
                : "rgba(255,255,255,0.1)",
              color: "#fff",
              cursor: selected ? "pointer" : "not-allowed",
            }}
            onClick={() => {
            const correct = selected === quiz[current].answer;

            if (correct) {
              setScore((prev) => prev + 1);
            }

            setResults((prev) => [
              ...prev,
              {
                question: quiz[current].question,
                selected,
                correct: quiz[current].answer,
                isCorrect: correct,
              },
            ]);

            setSelected("");

            if (current + 1 < quiz.length) {
            setCurrent(current + 1);
            } else {
            setFinished(true);
            }
        }}
        >
        {current + 1 === quiz.length
          ? "Finish Quiz"
          : "Next Question"}
        </button>
    </div>
    )}

    {/* QUIZ REPORT */}
    {mode === "Quiz" && finished && (
      <div
        className="p-5 rounded-3xl mb-6"
        style={{ background: cardBg, border }}
      >
        <div className="flex flex-col items-center">

          {/* Progress Circle */}
          <div
            className="relative w-36 h-36 rounded-full flex items-center justify-center mb-5"
            style={{
              background: `conic-gradient(
                #22c55e ${animatedPercent * 3.6}deg,
                rgba(255,255,255,0.08) 0deg
              )`,
              boxShadow:
                animatedPercent > 0
                  ? "0 0 30px rgba(34,197,94,0.45)"
                  : "none",
              transition: "all 0.15s linear",
            }}
          >
            <div
              className="absolute w-28 h-28 rounded-full flex flex-col items-center justify-center"
              style={{
                background: darkMode ? "#111" : "#fff",
              }}
            >
              <span className="text-3xl font-bold">
                {animatedPercent}%
              </span>

              <span
                className="text-xs mt-1"
                style={{ color: subTextColor }}
              >
                Accuracy
              </span>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2">
            Quiz Report
          </h2>

          <p style={{ color: subTextColor }}>
            Score {score} / {quiz.length}
          </p>
        </div>

        {/* Wrong Answers */}
        {results.filter((r) => !r.isCorrect).length > 0 && (
          <div className="mt-6">
            <h3 className="font-bold text-lg mb-3">
              Incorrect Answers
            </h3>

            <div className="space-y-3">
              {results
                .filter((r) => !r.isCorrect)
                .map((r, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl"
                    style={{
                      background: darkMode
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(0,0,0,0.04)",
                    }}
                  >
                    <p className="font-medium mb-2">
                      {r.question}
                    </p>

                    <p className="text-red-400 text-sm">
                      Your Answer: {r.selected || "Not Answered"}
                    </p>

                    <p className="text-green-500 text-sm">
                      Correct Answer: {r.correct}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        <button
          className="mt-6 w-full p-3 rounded-xl font-bold"
          style={{
            background:
              "linear-gradient(135deg,#b30000,#3d0000)",
            color: "#fff",
          }}
          onClick={() => {
            setQuiz([]);
            setFinished(false);
            setCurrent(0);
            setScore(0);
            setResults([]);
            setAnimatedPercent(0);
          }}
        >
          Start New Quiz
        </button>
      </div>
    )}

      {/* OUTPUT */}
      {questions && (
        <div
          className="p-4 rounded-3xl"
          style={{
            background: cardBg,
            border,
          }}
        >
          <h2 className="text-xl font-bold mb-4">
            Generated Questions
          </h2>

          <pre
            className="whitespace-pre-wrap text-sm leading-7"
            style={{
              fontFamily: "inherit",
              color: textColor,
            }}
          >
            {questions}
          </pre>
        </div>
      )}
    
    </div>
       <MobileNavbar
        darkMode={darkMode}
        subTextColor={subTextColor}
        border={border}
      />  
   </MobilePageWrapper>
   
  );
}