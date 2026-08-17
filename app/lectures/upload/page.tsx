"use client";

import { Baloo_2 } from "next/font/google";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  BookOpen,
  Upload,
  Music,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  X,
} from "lucide-react";

import { supabase } from "../../../src/lib/supabase";
import useAuth from "../../../src/hooks/useAuth";
import { useTheme } from "../../../src/context/ThemeContext";

const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const SUBJECTS = [
  "Physics",
  "Chemistry",
  "Mathematics",
  "Computer Science",
  "English",
  "Physical Education",
];

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0:00";

  const total = Math.floor(seconds);

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(
    2,
    "0"
  )}`;
}

function formatFileSize(bytes: number) {
  if (!bytes) return "0 KB";

  const mb = bytes / (1024 * 1024);

  if (mb < 1) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${mb.toFixed(2)} MB`;
}

export default function LectureUploadPage() {
  const router = useRouter();

  const { session, loading } = useAuth();
  const { darkMode } = useTheme();

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [duration, setDuration] =
    useState<number>(0);

  const [uploading, setUploading] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [profile, setProfile] =
    useState<{
      class_name: string;
      section: string;
    } | null>(null);

  // ------------------------------------------------
  // THEME
  // ------------------------------------------------

  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";

  const textColor = darkMode
    ? "#ffffff"
    : "#1a0000";

  const subTextColor = darkMode
    ? "#a1a1aa"
    : "#8b0000";

  const cardBg = darkMode
    ? "linear-gradient(160deg, #1c1c1f 0%, #150505 100%)"
    : "linear-gradient(160deg, #ffe0e0 0%, #ffc9c9 100%)";

  const border = darkMode
    ? "1px solid #3f0000"
    : "1px solid #ffb3b3";

  const inputBg = darkMode
    ? "#1b1b1e"
    : "#ffd0d0";

  // ------------------------------------------------
  // AUTH + PROFILE
  // ------------------------------------------------

  useEffect(() => {
    if (!loading && !session) {
      router.push("/login");
      return;
    }

    if (!session) return;

    fetchProfile();
  }, [loading, session]);

  async function fetchProfile() {
    if (!session) return;

    const { data, error } =
      await supabase
        .from("profiles")
        .select("class_name, section")
        .eq("id", session.user.id)
        .single();

    if (error || !data) {
      setError(
        "Could not load your class information."
      );
      return;
    }

    setProfile(data);
  }

  // ------------------------------------------------
  // FILE SELECT
  // ------------------------------------------------

  function handleFileSelect(
    file: File | undefined
  ) {
    setError("");
    setSuccess(false);

    if (!file) return;

    // Only audio
    if (!file.type.startsWith("audio/")) {
      setSelectedFile(null);
      setDuration(0);

      setError(
        "Please select a valid audio file."
      );

      return;
    }

    // File size
    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setDuration(0);

      setError(
        "Audio file must be smaller than 200 MB."
      );

      return;
    }

    setSelectedFile(file);

    // Detect duration
    const audio =
      document.createElement("audio");

    const objectUrl =
      URL.createObjectURL(file);

    audio.preload = "metadata";

    audio.onloadedmetadata = () => {
      const detectedDuration =
        audio.duration;

      setDuration(
        Number.isFinite(
          detectedDuration
        )
          ? detectedDuration
          : 0
      );

      URL.revokeObjectURL(
        objectUrl
      );
    };

    audio.onerror = () => {
      URL.revokeObjectURL(
        objectUrl
      );

      setDuration(0);
    };

    audio.src = objectUrl;
  }

  function removeFile() {
    setSelectedFile(null);
    setDuration(0);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // ------------------------------------------------
  // UPLOAD
  // ------------------------------------------------

  async function handleUpload() {
    setError("");
    setSuccess(false);

    if (!session) {
      setError(
        "You must be logged in to upload."
      );
      return;
    }

    if (!profile) {
      setError(
        "Your class information is not available."
      );
      return;
    }

    if (!title.trim()) {
      setError(
        "Please enter a lecture title."
      );
      return;
    }

    if (!subject) {
      setError(
        "Please select a subject."
      );
      return;
    }

    if (!selectedFile) {
      setError(
        "Please select an audio file."
      );
      return;
    }

    setUploading(true);
    setProgress(5);

    try {
      // --------------------------------------------
      // Generate unique staging path
      // --------------------------------------------

      const extension =
        selectedFile.name.includes(".")
          ? selectedFile.name
              .split(".")
              .pop()
              ?.toLowerCase()
          : "mp3";

      const safeFileName =
        selectedFile.name
          .replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          )
          .replace(/\s+/g, "_");

      const filePath = `${session.user.id}/${Date.now()}-${safeFileName}`;

      setProgress(15);

      // --------------------------------------------
      // Upload to Supabase staging bucket
      // --------------------------------------------

      const { error: uploadError } =
        await supabase.storage
          .from("lecture-staging")
          .upload(
            filePath,
            selectedFile,
            {
              cacheControl: "3600",
              upsert: false,
              contentType:
                selectedFile.type ||
                "audio/mpeg",
            }
          );

      if (uploadError) {
        console.error(
          "Storage upload error:",
          uploadError
        );

        throw new Error(
          uploadError.message ||
            "Failed to upload audio."
        );
      }

      setProgress(60);

      // --------------------------------------------
      // Get current access token
      // --------------------------------------------

      const {
        data: {
          session: currentSession,
        },
      } = await supabase.auth.getSession();

      if (!currentSession?.access_token) {
        throw new Error(
          "Your session has expired. Please login again."
        );
      }

      setProgress(70);

      // --------------------------------------------
      // Finalize
      // Supabase staging -> Telegram -> DB
      // --------------------------------------------

      const response = await fetch(
        "/api/lectures/finalize",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization: `Bearer ${currentSession.access_token}`,
          },

          body: JSON.stringify({
            title: title.trim(),

            subject,

            class_name:
              profile.class_name,

            section:
              profile.section,

            file_path: filePath,

            file_name:
              selectedFile.name,

            file_type:
              selectedFile.type ||
              "audio/mpeg",

            file_size:
              selectedFile.size,

            duration:
              duration || null,
          }),
        }
      );

      setProgress(85);

      const result =
        await response.json();

      if (!response.ok) {
        console.error(
          "Finalize error:",
          result
        );

        throw new Error(
          result.error ||
            "Failed to finalize lecture."
        );
      }

      setProgress(100);
      setSuccess(true);

      // --------------------------------------------
      // Clear form
      // --------------------------------------------

      setTitle("");
      setSubject("");
      setSelectedFile(null);
      setDuration(0);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // --------------------------------------------
      // Redirect after success
      // --------------------------------------------

      setTimeout(() => {
        router.push("/lectures");
      }, 1500);
    } catch (err: any) {
      console.error(
        "Lecture upload error:",
        err
      );

      setError(
        err?.message ||
          "Something went wrong while uploading."
      );
    } finally {
      setUploading(false);
    }
  }

  // ------------------------------------------------
  // LOADING
  // ------------------------------------------------

  if (loading) {
    return (
      <div className="loading-screen">
        <img
          src="/toggle-icon.png"
          className="loading-x"
          alt="loading"
        />

        <div className="loading-text">
          Loading Lecture Upload
        </div>
      </div>
    );
  }

  // ------------------------------------------------
  // PAGE
  // ------------------------------------------------

  return (
    <div
      className="p-4 md:p-8 min-h-screen transition-all duration-500"
      style={{
        background: bg,
        color: textColor,
      }}
    >
      {/* ------------------------------------------ */}
      {/* HEADER */}
      {/* ------------------------------------------ */}

      <div className="flex items-start gap-4 mb-8 md:mb-10">
        <button
          onClick={() =>
            router.push("/lectures")
          }
          className="mt-1 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
          style={{
            background: inputBg,
            border,
          }}
        >
          <ArrowLeft size={18} />
        </button>

        <div>
          <p
            className="text-xs md:text-sm font-medium tracking-widest uppercase mb-1"
            style={{
              color: subTextColor,
            }}
          >
            Community Learning
          </p>

          <h1
            className={`${baloo.className} text-3xl md:text-5xl`}
            style={{
              fontWeight: 800,
            }}
          >
            Upload Lecture
          </h1>

          <div
            className="mt-2 h-0.5 w-16 md:w-24 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, #8b0000, transparent)",
            }}
          />

          <p
            className="mt-3 text-sm"
            style={{
              color: subTextColor,
            }}
          >
            Share an audio lecture with
            your class.
          </p>
        </div>
      </div>

      {/* ------------------------------------------ */}
      {/* MAIN CARD */}
      {/* ------------------------------------------ */}

      <div className="max-w-3xl mx-auto">
        <div
          className="rounded-3xl p-5 md:p-8"
          style={{
            background: cardBg,
            border,
            boxShadow:
              darkMode
                ? "0 12px 35px -15px rgba(0,0,0,0.6)"
                : "0 12px 35px -15px rgba(139,0,0,0.25)",
          }}
        >
          {/* -------------------------------------- */}
          {/* TITLE */}
          {/* -------------------------------------- */}

          <div className="mb-6">
            <label
              className="block text-sm font-semibold mb-2"
              style={{
                color: textColor,
              }}
            >
              Lecture Title
            </label>

            <input
              type="text"
              placeholder="e.g. Electrostatics - Electric Field"
              value={title}
              onChange={(e) =>
                setTitle(
                  e.target.value
                )
              }
              disabled={uploading}
              className="w-full p-3.5 md:p-4 rounded-2xl outline-none transition-all duration-300 focus:scale-[1.01]"
              style={{
                background: inputBg,
                color: textColor,
                border,
              }}
            />
          </div>

          {/* -------------------------------------- */}
          {/* SUBJECT */}
          {/* -------------------------------------- */}

          <div className="mb-6">
            <label
              className="block text-sm font-semibold mb-2"
              style={{
                color: textColor,
              }}
            >
              Subject
            </label>

            <select
              value={subject}
              onChange={(e) =>
                setSubject(
                  e.target.value
                )
              }
              disabled={uploading}
              className="w-full p-3.5 md:p-4 rounded-2xl outline-none appearance-none"
              style={{
                background: inputBg,
                color: subject
                  ? textColor
                  : subTextColor,
                border,
              }}
            >
              <option value="">
                Select subject
              </option>

              {SUBJECTS.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>
          </div>

          {/* -------------------------------------- */}
          {/* CLASS INFO */}
          {/* -------------------------------------- */}

          {profile && (
            <div
              className="mb-6 flex items-center gap-3 rounded-2xl p-4"
              style={{
                background:
                  darkMode
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(139,0,0,0.05)",
                border,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    "rgba(139,0,0,0.12)",
                  color: "#8b0000",
                }}
              >
                <BookOpen
                  size={18}
                />
              </div>

              <div>
                <p className="text-xs font-semibold">
                  Uploading for
                </p>

                <p
                  className="text-sm font-bold"
                  style={{
                    color:
                      subTextColor,
                  }}
                >
                  Class{" "}
                  {profile.class_name}{" "}
                  • Section{" "}
                  {profile.section}
                </p>
              </div>
            </div>
          )}

          {/* -------------------------------------- */}
          {/* AUDIO FILE */}
          {/* -------------------------------------- */}

          <div className="mb-6">
            <label
              className="block text-sm font-semibold mb-2"
              style={{
                color: textColor,
              }}
            >
              Audio Lecture
            </label>

            {!selectedFile ? (
              <button
                type="button"
                disabled={uploading}
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="w-full rounded-2xl p-8 md:p-12 border-dashed transition-all duration-300 hover:scale-[1.01]"
                style={{
                  background:
                    darkMode
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(255,255,255,0.3)",
                  border: darkMode
                    ? "2px dashed #4b1a1a"
                    : "2px dashed #d98f8f",
                }}
              >
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{
                    background:
                      "rgba(139,0,0,0.12)",
                    color: "#8b0000",
                  }}
                >
                  <Upload
                    size={28}
                  />
                </div>

                <p
                  className={`${baloo.className} text-lg md:text-xl font-bold`}
                >
                  Choose Audio File
                </p>

                <p
                  className="text-xs md:text-sm mt-1"
                  style={{
                    color:
                      subTextColor,
                  }}
                >
                  MP3, M4A, WAV, OGG and
                  other audio formats
                </p>

                <p
                  className="text-[11px] mt-2"
                  style={{
                    color:
                      subTextColor,
                  }}
                >
                  Maximum size: 200 MB
                </p>
              </button>
            ) : (
              <div
                className="rounded-2xl p-4 md:p-5"
                style={{
                  background:
                    darkMode
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(255,255,255,0.35)",
                  border,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background:
                        "#8b0000",
                      color:
                        "#ffffff",
                    }}
                  >
                    <FileAudio
                      size={22}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">
                      {
                        selectedFile.name
                      }
                    </p>

                    <div
                      className="flex flex-wrap gap-3 text-xs mt-1"
                      style={{
                        color:
                          subTextColor,
                      }}
                    >
                      <span>
                        {formatFileSize(
                          selectedFile.size
                        )}
                      </span>

                      <span>
                        {formatDuration(
                          duration
                        )}
                      </span>

                      <span>
                        {
                          selectedFile.type ||
                          "Audio"
                        }
                      </span>
                    </div>
                  </div>

                  {!uploading && (
                    <button
                      type="button"
                      onClick={
                        removeFile
                      }
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background:
                          darkMode
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.05)",
                      }}
                    >
                      <X
                        size={16}
                      />
                    </button>
                  )}
                </div>

                {/* Preview */}

                <audio
                  controls
                  preload="metadata"
                  className="w-full mt-4 h-10"
                  src={URL.createObjectURL(
                    selectedFile
                  )}
                />
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) =>
                handleFileSelect(
                  e.target.files?.[0]
                )
              }
            />
          </div>

          {/* -------------------------------------- */}
          {/* ERROR */}
          {/* -------------------------------------- */}

          {error && (
            <div
              className="mb-5 flex items-start gap-3 p-4 rounded-2xl"
              style={{
                background:
                  "rgba(220,38,38,0.10)",
                border:
                  "1px solid rgba(220,38,38,0.25)",
                color: "#ef4444",
              }}
            >
              <AlertCircle
                size={18}
                className="shrink-0 mt-0.5"
              />

              <p className="text-sm font-medium">
                {error}
              </p>
            </div>
          )}

          {/* -------------------------------------- */}
          {/* SUCCESS */}
          {/* -------------------------------------- */}

          {success && (
            <div
              className="mb-5 flex items-start gap-3 p-4 rounded-2xl"
              style={{
                background:
                  "rgba(34,197,94,0.10)",
                border:
                  "1px solid rgba(34,197,94,0.25)",
                color: "#22c55e",
              }}
            >
              <CheckCircle2
                size={18}
                className="shrink-0"
              />

              <div>
                <p className="text-sm font-bold">
                  Lecture uploaded
                  successfully!
                </p>

                <p className="text-xs mt-1">
                  Redirecting to
                  lectures...
                </p>
              </div>
            </div>
          )}

          {/* -------------------------------------- */}
          {/* PROGRESS */}
          {/* -------------------------------------- */}

          {uploading && (
            <div className="mb-5">
              <div className="flex justify-between mb-2">
                <span
                  className="text-xs font-semibold"
                  style={{
                    color:
                      subTextColor,
                  }}
                >
                  Uploading lecture...
                </span>

                <span
                  className="text-xs font-bold"
                  style={{
                    color:
                      subTextColor,
                  }}
                >
                  {progress}%
                </span>
              </div>

              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{
                  background:
                    darkMode
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(139,0,0,0.08)",
                }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    background:
                      "#8b0000",
                  }}
                />
              </div>

              <p
                className="text-[11px] mt-2"
                style={{
                  color:
                    subTextColor,
                }}
              >
                {progress < 60
                  ? "Uploading audio..."
                  : progress < 85
                  ? "Sending lecture to Telegram..."
                  : "Saving lecture..."}
              </p>
            </div>
          )}

          {/* -------------------------------------- */}
          {/* SUBMIT */}
          {/* -------------------------------------- */}

          <button
            type="button"
            onClick={handleUpload}
            disabled={
              uploading ||
              !title.trim() ||
              !subject ||
              !selectedFile ||
              !profile
            }
            className="w-full py-3.5 md:py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.01]"
            style={{
              background:
                uploading ||
                !title.trim() ||
                !subject ||
                !selectedFile ||
                !profile
                  ? darkMode
                    ? "#3a1717"
                    : "#e5b5b5"
                  : "#8b0000",

              color:
                uploading ||
                !title.trim() ||
                !subject ||
                !selectedFile ||
                !profile
                  ? darkMode
                    ? "#8f6666"
                    : "#a66b6b"
                  : "#ffffff",

              cursor:
                uploading ||
                !title.trim() ||
                !subject ||
                !selectedFile ||
                !profile
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {uploading ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />

                Uploading...
              </>
            ) : (
              <>
                <Upload
                  size={18}
                />

                Upload Lecture
              </>
            )}
          </button>

          {/* -------------------------------------- */}
          {/* INFO */}
          {/* -------------------------------------- */}

          <div
            className="mt-5 text-center text-[11px] leading-relaxed"
            style={{
              color:
                subTextColor,
            }}
          >
            Your audio will be securely
            transferred to TreX's lecture
            storage and made available to
            your class.
          </div>
        </div>
      </div>
    </div>
  );
}