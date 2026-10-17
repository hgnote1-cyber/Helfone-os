"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Não consegui entrar.");
        setLoading(false);
        return;
      }
      window.location.href = "/";
    } catch (e) {
      setError("Falha de conexão. Tente de novo.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div className="text-center mb-6">
          <h1 className="text-lg font-medium">Helfone</h1>
          <p className="text-xs text-zinc-500">Ordens de serviço</p>
        </div>
        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <input
          type="password"
          placeholder="Senha do app"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full bg-amber-500 text-zinc-950 text-sm font-medium py-2.5 rounded-lg disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
