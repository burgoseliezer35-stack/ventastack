import Link from "next/link";
import { crearEmpresa } from "./actions";

export default function NuevaEmpresaPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink">
        Dar de alta un negocio nuevo
      </h1>

      <form
        action={crearEmpresa}
        className="flex flex-col gap-4 rounded-lg border border-linea bg-white p-6"
      >
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-ink">
            Nombre del negocio
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            required
            className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="correo_admin"
            className="block text-sm font-medium text-ink"
          >
            Correo del dueño/admin de ese negocio
          </label>
          <input
            id="correo_admin"
            name="correo_admin"
            type="email"
            required
            className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          />
          <p className="mt-1 text-xs text-ink/50">
            Le va a llegar un correo para que ponga su contraseña — igual
            que cuando invitas a alguien a tu propio equipo.
          </p>
        </div>

        <div>
          <label
            htmlFor="precio_mensual"
            className="block text-sm font-medium text-ink"
          >
            Precio mensual
          </label>
          <input
            id="precio_mensual"
            name="precio_mensual"
            type="number"
            step="0.01"
            min="0"
            defaultValue={0}
            className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          />
          <p className="mt-1 text-xs text-ink/50">Lo puedes cambiar después.</p>
        </div>

        <button
          type="submit"
          className="rounded-md bg-primario px-4 py-2 font-medium text-white transition hover:opacity-90"
        >
          Crear negocio e invitar
        </button>
      </form>

      <Link href="/reseller" className="text-sm text-primario hover:underline">
        Regresar
      </Link>
    </div>
  );
}
