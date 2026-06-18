import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  Users,
  UserPlus,
  ShoppingCart,
  Building2,
} from "lucide-react";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const userId = data.claims.sub as string;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role, es_superadmin, company_id")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <h1 className="text-xl font-bold text-ink">No pudimos cargar tu perfil</h1>
        <p className="max-w-sm text-sm text-ink/60">
          {profileError?.message ??
            "No encontramos una fila de perfil para esta cuenta."}
        </p>
        <p className="max-w-sm text-xs text-ink/40">ID de usuario: {userId}</p>
      </div>
    );
  }

  const { data: empresa } = await supabase
    .from("companies")
    .select("name")
    .eq("id", profile.company_id)
    .single();

  const esAdmin = profile.role === "admin";

  // Contadores para las tarjetas — cada uno ya viene filtrado solo
  // a lo que este usuario puede ver, gracias al RLS de siempre.
  const { count: productosCount } = await supabase
    .from("productos")
    .select("*", { count: "exact", head: true })
    .eq("activo", true);

  const { count: clientesCount } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true });

  const { count: ventasCount } = await supabase
    .from("pedidos")
    .select("*", { count: "exact", head: true });

  const { count: equipoCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center gap-2 text-ink">
          <LayoutDashboard size={26} />
          <h1 className="text-2xl font-bold">DASHBOARD</h1>
        </div>
        <p className="mt-2 max-w-md text-sm text-ink/60">
          ¡Bienvenido <strong>{profile.full_name ?? "usuario"}</strong>! Este
          es el panel de {empresa?.name ?? "tu negocio"}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tarjeta
          etiqueta="Catálogo"
          conteo={productosCount ?? 0}
          unidad="Registrados"
          Icono={Package}
          href="/protected/productos"
        />
        <Tarjeta
          etiqueta="Clientes"
          conteo={clientesCount ?? 0}
          unidad="Registrados"
          Icono={Users}
          href={esAdmin ? "/protected/clientes" : "/protected/mis-clientes"}
        />
        <Tarjeta
          etiqueta="Ventas"
          conteo={ventasCount ?? 0}
          unidad="Registradas"
          Icono={ShoppingCart}
          href="/protected/pedidos"
        />
        {esAdmin && (
          <Tarjeta
            etiqueta="Equipo"
            conteo={equipoCount ?? 0}
            unidad="Registrados"
            Icono={UserPlus}
            href="/protected/equipo"
          />
        )}
      </div>

      {profile.es_superadmin && (
        <Link
          href="/reseller"
          className="flex items-center gap-3 rounded-lg border border-dashed border-primario bg-primario-suave p-4 text-primario transition hover:opacity-80"
        >
          <Building2 size={20} />
          <span className="text-sm font-medium">Panel de reseller →</span>
        </Link>
      )}
    </div>
  );
}

function Tarjeta({
  etiqueta,
  conteo,
  unidad,
  Icono,
  href,
}: {
  etiqueta: string;
  conteo: number;
  unidad: string;
  Icono: LucideIcon;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-3 rounded-lg border border-linea bg-white p-5 text-center transition hover:border-primario hover:shadow-sm"
    >
      <span className="text-xs font-bold tracking-wide text-ink/70">
        {etiqueta.toUpperCase()}
      </span>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primario-suave text-primario">
        <Icono size={22} />
      </div>
      <span className="cifra text-sm text-ink/60">
        {conteo} {unidad}
      </span>
    </Link>
  );
}
