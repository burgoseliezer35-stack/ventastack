"use client";

import { useState, type FormEvent } from "react";

export function InviteForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("vendedor");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/invitar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, password, full_name: fullName }),
    });

    const body = await res.json();

    if (!res.ok) {
      setError(body.error ?? "No se pudo crear la cuenta");
      setIsLoading(false);
      return;
    }

    setMessage(
      `Listo. Cuenta creada para ${email} — comparte el correo y la contraseña con esa persona, ya puede entrar en /auth/login.`,
    );
    setFullName("");
    setEmail("");
    setPassword("");
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-ink">
          Nombre completo
        </label>
        <input
          id="fullName"
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          Correo de la persona
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
          Contraseña que va a usar
        </label>
        <input
          id="password"
          type="text"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
        />
        <p className="mt-1 text-xs text-ink/50">
          Sin texto oculto a propósito — la vas a compartir tú mismo con
          esa persona.
        </p>
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-ink">
          Puesto
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
        >
          <option value="vendedor">Vendedor (ruta)</option>
          <option value="cajero">Cajero (POS)</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-verde">{message}</p>}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-primario px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {isLoading ? "Creando..." : "Crear cuenta"}
      </button>
    </form>
  );
}
