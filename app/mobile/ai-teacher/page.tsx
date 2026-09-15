"use client";

import { useEffect, useState } from "react";
import { useTheme } from "../../../src/context/ThemeContext";
import MobileNavbar from "../../../components/MobileNavbar";
import MobilePageWrapper from "@/components/MobilePageWrapper";
import {
  Bot,
  Sparkles,
  BookOpen,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Loader2,
  BrainCircuit,
  ArrowRight,
} from "lucide-react";
import { supabase } from "../../../src/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

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
    ? "radial-gradient(ellipse at top, #2d0606 0%, #0d0d11 100%)"
    : "radial-gradient(ellipse at top, #fff5f5 0%, #f8fafc 100%)";

  const textColor = darkMode ? "#f4f4f5" : "#0f172a";
  const subTextColor = darkMode ? "#a1a1aa" : "#64748b";

  const cardBg = darkMode
    ? "rgba(24, 24, 27, 0.75)"
    : "rgba(255, 255, 255, 0.85)";

  const border = darkMode
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.08)";

  const inputBg = darkMode
    ? "rgba(39, 39, 42, 0.6)"
    : "rgba(241, 245, 249, 0.8)";

  useEffect(() => {
    if (!finished || quiz.length === 0) return;

    const target = Math.round((score / quiz.length) * 100);
    let curr = 0;

    const interval = setInterval(() => {
      curr++;
      if (curr >= target) {
        curr = target;
        clearInterval(interval);
      }
      setAnimatedPercent(curr);
    }, 15);

    return () => clearInterval(interval);
  }, [finished, score, quiz.length]);

  async function generateQuestions() {
    if (!topic.trim()) {
      alert("Please enter a topic to continue");
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

      if (!res.ok) {
        alert(data?.error?.error?.message || "API Error");
        setLoading(false);
        return;
      }

      if (mode === "Quiz") {
        const parsed = JSON.parse(data.result);
        setQuiz(Array.isArray(parsed.questions) ? parsed.questions : []);
        setCurrent(0);
        setScore(0);
        setSelected("");
        setFinished(false);
        setResults([]);
      } else {
        setQuestions(data.result);
      }
    } catch (err) {
      console.log(err);
      alert("Network error / server not running");
    }

    setLoading(false);
  }

  if (checkingAuth) {
    return (
      <MobilePageWrapper>
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="relative flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 animate-pulse">
              <Bot size={28} />
            </div>
          </div>
          <p className="text-xs font-semibold tracking-wider uppercase text-zinc-400">
            Initializing AI Teacher...
          </p>
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
        className="min-h-screen pb-28 pt-6 px-4 transition-colors duration-300 max-w-lg mx-auto"
        style={{ background: bg, color: textColor }}
      >
        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-red-500/10 text-red-500 border border-red-500/20 mb-2">
            <Sparkles size={11} /> AI Assessment Engine
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="text-red-500" size={26} /> AI Teacher
          </h1>
          <p className="text-xs mt-1 font-medium" style={{ color: subTextColor }}>
            Generate personalized practice sets, quizzes, and exam mocks instantly.
          </p>
        </div>

        {/* Configuration Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-3xl backdrop-blur-xl mb-6"
          style={{
            background: cardBg,
            border: `1px solid ${border}`,
            boxShadow: darkMode
              ? "0 10px 30px -10px rgba(0,0,0,0.5)"
              : "0 10px 25px -10px rgba(0,0,0,0.05)",
          }}
        >
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-500/10">
            <Sliders size={16} className="text-red-500" />
            <span className="text-xs font-bold tracking-wide uppercase">
              Configuration
            </span>
          </div>

          <div className="space-y-4">
            {/* Subject */}
            <div>
              <label
                className="block mb-1.5 text-xs font-semibold"
                style={{ color: subTextColor }}
              >
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-3 rounded-2xl outline-none text-xs font-medium border transition-all"
                style={{
                  background: inputBg,
                  color: textColor,
                  borderColor: border,
                }}
              >
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Computer Science">Computer Science</option>
                <option value="English">English</option>
              </select>
            </div>

            {/* Topic */}
            <div>
              <label
                className="block mb-1.5 text-xs font-semibold"
                style={{ color: subTextColor }}
              >
                Topic / Chapter
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Current Electricity, Matrices..."
                className="w-full p-3 rounded-2xl outline-none text-xs font-medium border transition-all placeholder:text-zinc-500"
                style={{
                  background: inputBg,
                  color: textColor,
                  borderColor: border,
                }}
              />
            </div>

            {/* Mode & Difficulty Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block mb-1.5 text-xs font-semibold"
                  style={{ color: subTextColor }}
                >
                  Mode
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full p-3 rounded-2xl outline-none text-xs font-medium border transition-all"
                  style={{
                    background: inputBg,
                    color: textColor,
                    borderColor: border,
                  }}
                >
                  <option value="Practice">Practice</option>
                  <option value="Quiz">Interactive Quiz</option>
                  <option value="Exam">Exam Mock</option>
                </select>
              </div>

              <div>
                <label
                  className="block mb-1.5 text-xs font-semibold"
                  style={{ color: subTextColor }}
                >
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full p-3 rounded-2xl outline-none text-xs font-medium border transition-all"
                  style={{
                    background: inputBg,
                    color: textColor,
                    borderColor: border,
                  }}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={generateQuestions}
              disabled={loading}
              className="w-full mt-2 p-3.5 rounded-2xl font-bold text-xs tracking-wide text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
              style={{
                background: "linear-gradient(135deg, #dc2626, #991b1b)",
                boxShadow: "0 4px 15px rgba(220, 38, 38, 0.3)",
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating Workspace...
                </>
              ) : (
                <>
                  <BrainCircuit size={16} />
                  Generate Questions
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* QUIZ INTERACTIVE MODE */}
        <AnimatePresence mode="wait">
          {mode === "Quiz" &&
            Array.isArray(quiz) &&
            quiz.length > 0 &&
            !finished && (
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-5 rounded-3xl backdrop-blur-xl mb-6 relative overflow-hidden"
                style={{
                  background: cardBg,
                  border: `1px solid ${border}`,
                }}
              >
                {/* Progress Bar */}
                <div className="flex items-center justify-between text-xs font-bold mb-3">
                  <span style={{ color: subTextColor }}>
                    Question {current + 1} of {quiz.length}
                  </span>
                  <span className="text-red-500 font-extrabold">
                    {Math.round(((current + 1) / quiz.length) * 100)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-500/10 rounded-full mb-5 overflow-hidden">
                  <motion.div
                    className="h-full bg-red-500"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${((current + 1) / quiz.length) * 100}%`,
                    }}
                  />
                </div>

                {/* Question */}
                <h2 className="text-sm font-bold mb-4 leading-relaxed">
                  {quiz[current].question}
                </h2>

                {/* Options List */}
                <div className="space-y-2.5">
                  {quiz[current].options.map((opt: string, i: number) => {
                    const isSelected = selected === opt;
                    return (
                      <button
                        key={i}
                        onClick={() => setSelected(opt)}
                        className="w-full p-3.5 rounded-2xl text-left text-xs font-medium transition-all flex items-start gap-3 border"
                        style={{
                          background: isSelected
                            ? darkMode
                              ? "rgba(220, 38, 38, 0.15)"
                              : "rgba(220, 38, 38, 0.08)"
                            : inputBg,
                          color: textColor,
                          borderColor: isSelected ? "#dc2626" : border,
                        }}
                      >
                        <span
                          className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                          style={{
                            borderColor: isSelected ? "#dc2626" : border,
                            background: isSelected ? "#dc2626" : "transparent",
                            color: isSelected ? "#ffffff" : subTextColor,
                          }}
                        >
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="flex-1 leading-snug">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Next Button */}
                <button
                  disabled={!selected}
                  className="w-full mt-5 p-3.5 rounded-2xl font-bold text-xs text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{
                    background: selected
                      ? "linear-gradient(135deg, #dc2626, #991b1b)"
                      : "rgba(255, 255, 255, 0.05)",
                    color: selected ? "#ffffff" : subTextColor,
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
                  {current + 1 === quiz.length ? (
                    "Finish Quiz"
                  ) : (
                    <>
                      Next Question <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </motion.div>
            )}
        </AnimatePresence>

        {/* QUIZ REPORT MODAL / VIEW */}
        <AnimatePresence>
          {mode === "Quiz" && finished && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-5 rounded-3xl backdrop-blur-xl mb-6 text-center"
              style={{
                background: cardBg,
                border: `1px solid ${border}`,
              }}
            >
              {/* Animated SVG Meter */}
              <div className="relative w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="52"
                    stroke={darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="52"
                    stroke="#22c55e"
                    strokeWidth="8"
                    strokeDasharray={326}
                    strokeDashoffset={326 - (326 * animatedPercent) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-300 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold">{animatedPercent}%</span>
                  <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: subTextColor }}>
                    Accuracy
                  </span>
                </div>
              </div>

              <h2 className="text-lg font-bold mb-1">Assessment Complete</h2>
              <p className="text-xs mb-5 font-medium" style={{ color: subTextColor }}>
                Score: <span className="text-emerald-500 font-bold">{score}</span> / {quiz.length} Correct
              </p>

              {/* Wrong Answers Accordion/List */}
              {results.filter((r) => !r.isCorrect).length > 0 && (
                <div className="text-left mt-4 pt-4 border-t border-zinc-500/10">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 text-red-500 flex items-center gap-1.5">
                    <XCircle size={14} /> Incorrect Answers Breakdown
                  </h3>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {results
                      .filter((r) => !r.isCorrect)
                      .map((r, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-2xl text-xs space-y-1"
                          style={{
                            background: darkMode
                              ? "rgba(255,255,255,0.03)"
                              : "rgba(0,0,0,0.03)",
                            border: `1px solid ${border}`,
                          }}
                        >
                          <p className="font-semibold leading-snug">{r.question}</p>
                          <p className="text-red-400 font-medium">
                            Your Choice: {r.selected || "Skipped"}
                          </p>
                          <p className="text-emerald-500 font-medium">
                            Correct: {r.correct}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <button
                className="mt-6 w-full p-3.5 rounded-2xl font-bold text-xs text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #dc2626, #991b1b)",
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
                <RotateCcw size={14} /> Start New Assessment
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OUTPUT FOR PRACTICE & EXAM MODES */}
        {questions && mode !== "Quiz" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-3xl backdrop-blur-xl"
            style={{
              background: cardBg,
              border: `1px solid ${border}`,
            }}
          >
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-500/10">
              <BookOpen size={16} className="text-red-500" />
              <h2 className="text-xs font-bold tracking-wide uppercase">
                Generated Questions ({mode})
              </h2>
            </div>

            <div className="space-y-3">
              {questions.split("\n\n").map((qBlock, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl text-xs leading-relaxed"
                  style={{
                    background: inputBg,
                    borderLeft: "3px solid #dc2626",
                  }}
                >
                  <p className="whitespace-pre-wrap font-medium">{qBlock}</p>
                </div>
              ))}
            </div>
          </motion.div>
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