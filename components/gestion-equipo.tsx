"use client";

import { useState } from "react";
import { Pencil, Trash2, X, Check } from "lucide-react";

type Miembro = {
  id: string;
  full_name: string | null;
  username: string | null;
  role: string;
};

export function GestionEquipo({
  equipo,
  companyId,
}: {
  equipo: Miembro[];
  companyId: string;
}) {
  const [lista, setLista] = useState<Miembro[]>(equipo);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("vendedor");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Miembro & { password: string }>>({});

  const crearUsuario = async () => {
    setError(null);
    setMensaje(null);
    if (!fullName.trim() || !username.trim() || password.length < 6) {
      setError("Completa todos los campos (contraseña mínimo 6 caracteres)");
      return;
    }
    setCargando(true);

    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName, username, password, role }),
    });

    const body = await res.json();
    setCargando(false);

    if (!res.ok) { setError(body.error); return; }

    const nuevo: Miembro = {
      id: crypto.randomUUID(),
      full_name: fullName.trim(),
      username: username.trim(),
      role,
    };
    setLista((prev) => [...prev, nuevo]);
    setFullName(""); setUsername(""); setPassword("");
    setMensaje(`Cuenta "${username}" creada. Comparte el usuario y la contraseña con esa persona.`);
  };

  const guardarEdicion = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    });
    const body = await res.json();
    if (!res.ok) { setError(body.error); return; }
    setLista((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, ...editData, full_name: editData.full_name ?? m.full_name, username: editData.username ?? m.username, role: editData.role ?? m.role }
          : m,
      ),
    );
    setEditandoId(null);
    setEditData({});
  };

  const borrar = async (id: string, nombre: string) => {
    if (!confirm(`¿Borrar la cuenta de "${nombre}"? Esta acción no se puede deshacer.`)) return;
    setError(null);
    const res = await fetch(`/api/usuarios/${id}`, { method: "DELETE" });
    const body = await res.json();
    if (!res.ok) { setError(body.error); return; }
    setLista((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Formulario de creación */}
      <div className="rounded-xl border border-linea bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-ink">Crear cuenta de empleado</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-ink/70">Nombre completo</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Pérez"
              className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/70">Nombre de usuario</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="juanperez"
              autoCapitalize="none"
              autoCorrect="off"
              className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/70">Contraseña</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/70">Puesto</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-sm text-ink focus:border-primario focus:outline-none"
            >
              <option value="vendedor">Vendedor (ruta)</option>
              <option value="cajero">Cajero (POS)</option>
            </select>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {mensaje && <p className="mt-3 text-sm text-verde">{mensaje}</p>}

        <button
          type="button"
          onClick={crearUsuario}
          disabled={cargando}
          className="mt-4 rounded-md bg-primario px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {cargando ? "Creando..." : "Crear cuenta"}
        </button>
      </div>

      {/* Tabla de empleados */}
      <div className="overflow-hidden rounded-xl border border-linea bg-white shadow-sm">
        <div className="border-b border-linea bg-primario-suave px-4 py-3">
          <h2 className="font-semibold text-ink">
            Tu equipo — {lista.length} persona{lista.length === 1 ? "" : "s"}
          </h2>
          <p className="text-xs text-ink/50 mt-0.5">
            Enlace de acceso para vendedores/cajeros:{" "}
            <span className="font-mono">/auth/vendedor?empresa={companyId}</span>
          </p>
        </div>

        {lista.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink/40">
            Todavía no tienes empleados. Crea el primero arriba.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primario text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-2.5">Nombre</th>
                <th className="px-4 py-2.5">Usuario</th>
                <th className="px-4 py-2.5">Puesto</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {lista.map((m, idx) =>
                editandoId === m.id ? (
                  <tr key={m.id} className="bg-primario-suave">
                    <td className="px-4 py-2">
                      <input
                        defaultValue={m.full_name ?? ""}
                        onChange={(e) => setEditData((p) => ({ ...p, full_name: e.target.value }))}
                        className="w-full rounded border border-linea px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        defaultValue={m.username ?? ""}
                        onChange={(e) => setEditData((p) => ({ ...p, username: e.target.value }))}
                        className="w-full rounded border border-linea px-2 py-1 text-sm"
                        autoCapitalize="none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        defaultValue={m.role}
                        onChange={(e) => setEditData((p) => ({ ...p, role: e.target.value }))}
                        className="rounded border border-linea px-2 py-1 text-sm"
                      >
                        <option value="vendedor">Vendedor</option>
                        <option value="cajero">Cajero</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => guardarEdicion(m.id)} className="text-verde hover:opacity-80"><Check size={16} /></button>
                        <button onClick={() => { setEditandoId(null); setEditData({}); }} className="text-ink/40 hover:text-ink"><X size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={m.id} className={idx % 2 === 1 ? "bg-paper/60" : ""}>
                    <td className="px-4 py-2.5 text-ink">{m.full_name ?? "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink/70">{m.username ?? "—"}</td>
                    <td className="px-4 py-2.5 capitalize text-ink/70">{m.role}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-3 justify-end text-ink/40">
                        <button onClick={() => { setEditandoId(m.id); setEditData({}); }} className="hover:text-primario"><Pencil size={15} /></button>
                        <button onClick={() => borrar(m.id, m.full_name ?? m.username ?? m.id)} className="hover:text-red-600"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
