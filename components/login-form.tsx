"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    // No importa por cuál de las tres puertas entró (login, gpanel
    // o vendedor) — aquí decidimos a dónde va de verdad según quién
    // ES, no según por dónde tocó. Cada destino (reseller,
    // protected) vuelve a revisar el permiso por su cuenta, así que
    // esto es solo para llevarlo al lugar correcto, no es la
    // barrera de seguridad real.
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;

    if (userId) {
      const { data: perfil } = await supabase
        .from("profiles")
        .select("es_superadmin")
        .eq("id", userId)
        .single();

      if (perfil?.es_superadmin) {
        router.push("/reseller");
        router.refresh();
        return;
      }
    }

    router.push("/protected");
    router.refresh();
  };

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          Correo
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
