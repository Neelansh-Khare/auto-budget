"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const resp = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
      headers: { "Content-Type": "application/json" },
    });
    if (resp.ok) {
      router.push("/");
    } else {
      const data = await resp.json();
      setError(data.error || "Login failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={submit} className="bg-white shadow p-6 rounded w-80 space-y-4">
        <h1 className="text-xl font-semibold">AutoBudgeter Login</h1>
        <input
          type="password"
          className="w-full border rounded px-3 py-2"
          placeholder="App password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded px-3 py-2 font-medium hover:bg-blue-700"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}

