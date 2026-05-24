"use client";

import { useState } from "react";
import { supabase } from "../../src/lib/supabase";
import { useRouter } from "next/navigation";
import useAuth from "../../src/hooks/useAuth";
import { useTheme } from "../../src/context/ThemeContext";

export default function UploadPage() {
  const { loading } = useAuth();
  const [progress, setProgress] = useState(0);
  const { darkMode, setDarkMode } = useTheme();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const bg = darkMode
    ? "linear-gradient(135deg, #3d0000 0%, #1a0000 30%, #000000 70%)"
    : "linear-gradient(135deg, #fff5f5 0%, #ffe4e4 40%, #ffffff 100%)";
  const textColor = darkMode ? "#ffffff" : "#1a0000";
  const subTextColor = darkMode ? "#a1a1aa" : "#8b0000";
  const cardBg = darkMode ? "#18181b" : "#ffcccc";
  const inputBg = darkMode ? "#3f3f46" : "#ffd0d0";
  const border = darkMode ? "1px solid #3f0000" : "1px solid #ffb3b3";

  async function compressPDF(file: File): Promise<File> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfjsLib: any = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();

      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      const jpegPages: Blob[] = [];
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.6 });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");

        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise<Blob>((res) =>
          canvas.toBlob((b) => res(b!), "image/jpeg", 0.3)
        );
        jpegPages.push(blob);
      }

      const { PDFDocument } = await import("pdf-lib");
      const newPdf = await PDFDocument.create();

      for (const blob of jpegPages) {
        const imgBytes = new Uint8Array(await blob.arrayBuffer());
        const img = await newPdf.embedJpg(imgBytes);
        const page = newPdf.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }

      const compressedBytes = await newPdf.save();
      const compressed = new File(
        [compressedBytes.buffer as ArrayBuffer],
        file.name,
        { type: "application/pdf" }
      );

      console.log(
        `PDF: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressed.size / 1024 / 1024).toFixed(2)}MB`
      );

      return compressed.size < file.size ? compressed : file;
    } catch (err) {
      console.log("PDF compression failed, using original:", err);
      return file;
    }
  }
  async function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 1920;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          const scale = MAX / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob || blob.size >= file.size) {
              resolve(file);
            } else {
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            }
          },
          "image/jpeg",
          0.75
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  async function uploadNote() {
    if (!file) return alert("Select file");
    if (!title) return alert("Enter Title!");
    if (!subject) return alert("Enter Subject!");

    setProgress(0);
    setUploading(true);

    const interval = setInterval(() => {
      setProgress((old) => (old >= 90 ? old : old + Math.random() * 10));
    }, 200);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login karo pehle!");

      const { data: profile } = await supabase
        .from("profiles")
        .select("class_name, section")
        .eq("id", user.id)
        .single();

      let finalFile = file;
      if (file.type === "application/pdf") {
        finalFile = await compressPDF(file);
      } else if (file.type.startsWith("image/")) {
        finalFile = await compressImage(file);
      }

      const MAX_SIZE = 10 * 1024 * 1024;
      if (finalFile.size > MAX_SIZE) {
        throw new Error(`File too large (${(finalFile.size / 1024 / 1024).toFixed(1)}MB). 10MB se chhota chahiye.`);
      }

      const form = new FormData();
      form.append("chat_id", "-1003724740509");
      form.append("document", finalFile);
      form.append(
        "caption",
        `📚 New Note Uploaded!\n\n📌 Title: ${title}\n📘 Subject: ${subject}`
      );

      const tgRes = await fetch(
        `https://api.telegram.org/bot${process.env.NEXT_PUBLIC_BOT_TOKEN}/sendDocument`,
        { method: "POST", body: form }
      );

      const tgData = await tgRes.json();
      if (!tgData.ok) throw new Error(tgData.description || "Telegram upload failed");

      const file_id = tgData?.result?.document?.file_id || null;

      const { error: dbError } = await supabase.from("notes").insert([{
        title,
        subject,
        uploader_id: user.id,
        class_name: profile?.class_name,
        section: profile?.section,
        file_id,
      }]);
      if (dbError) throw dbError;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("xp")
        .eq("id", user.id)
        .single();

      await supabase
        .from("profiles")
        .update({ xp: (profileData?.xp || 0) + 20 })
        .eq("id", user.id);

      clearInterval(interval);
      setProgress(100);
      setTimeout(() => router.push("/feed"), 500);

    } catch (err: any) {
      clearInterval(interval);
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return (
    <div className="loading-screen">
      <img src="/toggle-icon.png" className="loading-x" alt="loading" />
      <div className="loading-text">Loading</div>
    </div>
  );

  return (
    <div className="min-h-screen relative transition-all duration-500" style={{background: bg, color: textColor}}>

      <button
        onClick={() => setDarkMode(!darkMode)}
        className="px-4 py-2 rounded-2xl font-bold transition-all duration-300 hover:scale-105"
        style={{background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", color: textColor, top: "30px", right: "30px", position: "absolute", zIndex: 10}}
      >
        {darkMode ? "☀️" : "🌙"}
      </button>

      <div className="min-h-screen flex items-center justify-center">
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
            <img src="/toggle-icon.png" className="loading-x" alt="loading" />

            <div className="w-64 mt-6 bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-200"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #8b0000, #ff4444)"
                }}
              />
            </div>

            <div className="text-white mt-3 text-sm">
              Uploading... {Math.floor(progress)}%
            </div>
          </div>
        )}

        <div className="p-8 rounded-3xl w-96 transition-all duration-500" style={{background: cardBg, border}}>

          <div className="mb-6">
            <p className="text-sm font-medium tracking-widest uppercase mb-1" style={{color: subTextColor}}>Share Knowledge</p>
            <h1 className="text-3xl font-bold">Upload Notes</h1>
            <div className="mt-2 h-0.5 w-16 rounded-full" style={{background: "linear-gradient(90deg, #8b0000, transparent)"}}></div>
          </div>

          <input
            type="text"
            placeholder="Title"
            disabled={uploading}
            className="w-full p-3 mb-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed outline-none"
            style={{background: inputBg, color: textColor, border}}
            onChange={(e) => setTitle(e.target.value)}
          />

          <select
            disabled={uploading}
            className="w-full p-3 mb-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed outline-none"
            style={{background: inputBg, color: textColor, border}}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="">Select Subject</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Computer Science">Computer Science</option>
            <option value="English">English</option>
            <option value="Physical Education">Physical Education</option>
          </select>

          <label className="block mb-4">
            <div className={`p-4 rounded-xl transition-all duration-300 transform text-center ${uploading ? "opacity-50 cursor-not-allowed" : "hover:scale-105 cursor-pointer"}`}
              style={{background: inputBg, border, color: subTextColor}}>
              Choose File
              <p>(only PDF and images allowed!)</p>
            </div>
            <input type="file" className="hidden" disabled={uploading} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>

          {file && (
            <p className="mb-4 text-sm" style={{color: "#22c55e"}}>✅ Selected: {file.name}</p>
          )}

          <button
            onClick={uploadNote}
            disabled={uploading}
            className="w-full p-3 rounded-2xl text-white font-bold transition-all duration-300 hover:scale-105"
            style={{background: "linear-gradient(135deg, #8b0000, #3d0000)"}}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>

        </div>
      </div>
    </div>
  );
}