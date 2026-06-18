"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function UsernameLoginForm({ companyId }: { companyId?: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Si no hay company_id fijo (la pantalla de /auth/login es
    // genérica), pedimos el company_id al usuario también.
    const cid = companyId;
    if (!cid) {
      setError("Esta pantalla necesita un enlace específico de tu empresa.");
      setIsLoading(false);
      return;
    }

    // Paso 1: convertir username → correo técnico
    const res = await fetch("/api/username-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), company_id: cid }),
    });

    const resBody = await res.json();

    if (!res.ok) {
      setError("Usuario o contraseña incorrectos");
      setIsLoading(false);
      return;
    }

    // Paso 2: autenticar con el correo técnico
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: resBody.email,
      password,
    });

    if (authError) {
      setError("Usuario o contraseña incorrectos");
      setIsLoading(false);
      return;
    }

    router.push("/protected");
    router.refresh();
  };

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-4">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-ink">
          Usuario
        </label>
        <input
          id="username"
          type="text"
          required
          autoCapitalize="none"
          autoCorrect="off"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-primario px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {isLoading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
