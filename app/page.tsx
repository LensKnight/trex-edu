"use client";

import { useState } from "react";
import { supabase } from "../src/lib/supabase";
import { useRouter } from "next/navigation";
import { redirect } from "next/navigation";


export default function AuthPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();


  async function login() {
    if (!username) return alert("Enter Username!");
    if (!password) return alert("Enter Password!");

    const fakeEmail = `${username}@trexedu.com`;

    const { error } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password,
    });

    if (error) {
      alert("Username or Password is incorrect!");
    } else {
      redirect("/mobile/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-zinc-900 p-8 rounded-2xl w-80">
        <img src="/toogle-trex.png" alt="TreX Edu" className="h-22 object-contain -mt-4 mx-auto" />
        <p className="text-zinc-400 text-sm text-center mb-6">Student Community Platform</p>

        <input
          type="text"
          placeholder="Username"
          className="w-full p-3 mb-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 outline-none"
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 mb-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 outline-none"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={login}
          className="w-full bg-red-600 p-3 rounded-lg hover:bg-green-700 hover:scale-105 transition-all duration-300 transform"
        >
          Login
        </button>
      </div>
    </div>
  );
}