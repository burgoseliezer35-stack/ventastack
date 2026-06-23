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
          <label htmlFor="buscador_productos" className="block text-sm font-medium text-ink">
            Buscador de productos (por código de barras)
          </label>
          <select
            id="buscador_productos"
            name="buscador_productos"
            className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          >
            <option value="openfoodfacts">🥫 Open Food Facts — abarrotes, alimentos, bebidas</option>
            <option value="upcitemdb">📦 UPCitemdb — electrónicos, cables, productos en general</option>
            <option value="ambos">🔍 Ambos — busca primero en Food Facts, luego en UPCitemdb</option>
          </select>
          <p className="mt-1 text-xs text-ink/50">
            Define qué base de datos se consulta al escanear un código de barras en el catálogo.
          </p>
        </div>

        <div>
          <label htmlFor="tipo_negocio" className="block text-sm font-medium text-ink">
            Tipo de negocio
          </label>
          <select
            id="tipo_negocio"
            name="tipo_negocio"
            className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          >
            <option value="tienda">🏪 Tienda / Miscelánea / Abarrotes</option>
            <option value="distribuidor">🚚 Distribuidor / Ruta de ventas</option>
            <option value="restaurante">🍽️ Restaurante / Cafetería</option>
            <option value="taller">🔧 Taller / Servicio técnico</option>
          </select>
        </div>

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
            htmlFor="nombre_admin"
            className="block text-sm font-medium text-ink"
          >
            Nombre completo del dueño/admin
          </label>
          <input
            id="nombre_admin"
            name="nombre_admin"
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
        </div>

        <div>
          <label
            htmlFor="password_admin"
            className="block text-sm font-medium text-ink"
          >
            Contraseña que va a usar
          </label>
          <input
            id="password_admin"
            name="password_admin"
            type="text"
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            className="mt-1 w-full rounded-md border border-linea px-3 py-2 text-ink focus:border-primario focus:outline-none"
          />
          <p className="mt-1 text-xs text-ink/50">
            La cuenta queda lista de inmediato — compártele tú mismo el
            correo y esta contraseña, no se manda ningún correo.
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
