"use client";

export default function Navbar() {
  return (
    <div className="h-15 border-b border-zinc-800 bg-black flex items-center justify-between px-8 sticky top-0 z-40">

      <div>
        <h1 className="text-2xl font-bold text-white">
          TreX Edu
        </h1>
      </div>

      <div className="flex items-center gap-4">

        <input
          type="text"
          placeholder="Search notes..."
          className="bg-zinc-900 text-white px-4 py-2 rounded-2xl outline-none w-72"
        />

        <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">
          V
        </div>

      </div>

    </div>
  );
}