"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Store,
  History,
  FileText,
  ScanLine,
  MapPin,
  Settings,
  BarChart3,
  Package,
  Truck,
  Wallet,
  Undo2,
  Users,
  UserPlus,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  nombre: string;
  rol: string;
  esAdmin: boolean;
  esVendedor: boolean;
  nombreEmpresa?: string;
};

type SubEnlace = { href: string; etiqueta: string };
type ItemNav =
  | { tipo: "enlace"; href: string; etiqueta: string; Icono: LucideIcon }
  | { tipo: "grupo"; etiqueta: string; Icono: LucideIcon; items: SubEnlace[] };

export function Sidebar({ nombre, rol, esAdmin, esVendedor, nombreEmpresa }: Props) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const inicial = nombre.charAt(0).toUpperCase() || "?";

  const enlaces: ItemNav[] = [
    { tipo: "enlace", href: "/protected", etiqueta: "Dashboard", Icono: LayoutDashboard },
    { tipo: "enlace", href: "/protected/pos", etiqueta: "Punto de venta", Icono: Store },
    {
      tipo: "enlace",
      href: "/protected/pedidos",
      etiqueta: "Historial de ventas",
      Icono: History,
    },
    {
      tipo: "enlace",
      href: "/protected/cotizaciones",
      etiqueta: "Cotizaciones",
      Icono: FileText,
    },
    {
      tipo: "enlace",
      href: "/protected/verificador",
      etiqueta: "Verificador de precios",
      Icono: ScanLine,
    },
  ];
  // La caja y las devoluciones son trabajo de mostrador — las ve
  // admin y cajero, pero no el vendedor en ruta.
  if (!esVendedor) {
    enlaces.push({
      tipo: "enlace",
      href: "/protected/devoluciones",
      etiqueta: "Devoluciones",
      Icono: Undo2,
    });
    enlaces.push({
      tipo: "grupo",
      etiqueta: "Caja",
      Icono: Wallet,
      items: [
        { href: "/protected/caja", etiqueta: "Caja del día" },
        { href: "/protected/caja/historial", etiqueta: "Historial" },
      ],
    });
  }
  if (esAdmin) {
    enlaces.push({
      tipo: "enlace",
      href: "/protected/reportes",
      etiqueta: "Reportes",
      Icono: BarChart3,
    });
    enlaces.push({
      tipo: "enlace",
      href: "/protected/rutas",
      etiqueta: "Ver rutas",
      Icono: MapPin,
    });
    enlaces.push({
      tipo: "grupo",
      etiqueta: "Productos",
      Icono: Package,
      items: [
        { href: "/protected/productos", etiqueta: "Catálogo" },
        { href: "/protected/productos/categorias", etiqueta: "Categorías" },
      ],
    });
    enlaces.push({
      tipo: "grupo",
      etiqueta: "Compras",
      Icono: Truck,
      items: [
        { href: "/protected/compras/recibir", etiqueta: "Recibir mercancía" },
        { href: "/protected/compras", etiqueta: "Historial" },
        { href: "/protected/proveedores", etiqueta: "Proveedores" },
      ],
    });
  }
  if (esAdmin || esVendedor) {
    enlaces.push({
      tipo: "enlace",
      href: esAdmin ? "/protected/clientes" : "/protected/mis-clientes",
      etiqueta: "Clientes",
      Icono: Users,
    });
  }
  if (esAdmin) {
    enlaces.push({ tipo: "enlace", href: "/protected/equipo", etiqueta: "Equipo", Icono: UserPlus });
    enlaces.push({ tipo: "enlace", href: "/protected/configuracion", etiqueta: "Configuración", Icono: Settings });
  }

  const tabsMobile = [
    { href: "/protected", etiqueta: "Inicio", Icono: LayoutDashboard },
    { href: "/protected/pos", etiqueta: "POS", Icono: Store },
    { href: "/protected/pedidos", etiqueta: "Ventas", Icono: History },
    { href: "/protected/clientes", etiqueta: "Clientes", Icono: Users },
    { href: "#menu", etiqueta: "Más", Icono: Menu },
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:border-r md:border-linea md:bg-white">
        <div className="flex flex-col items-center gap-2 border-b border-linea p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primario text-xl font-bold text-white">
            {inicial}
          </div>
          <p className="text-center font-semibold text-ink">{nombre}</p>
          <span className="insignia bg-primario-suave text-primario">{rol}</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {enlaces.map((item) =>
            item.tipo === "enlace" ? (
              <EnlaceNav key={item.href} item={item} activo={pathname === item.href} onClick={() => {}} />
            ) : (
              <GrupoNav key={item.etiqueta} item={item} pathname={pathname} onNavegar={() => {}} />
            ),
          )}
        </nav>
        <div className="border-t border-linea p-3"><BotonSalir /></div>
      </aside>

      {/* Mobile: top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-linea bg-white px-3 py-2 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primario text-xs font-bold text-white">
            {nombreEmpresa?.charAt(0)?.toUpperCase() ?? "V"}
          </div>
          <span className="text-sm font-semibold text-ink">{nombreEmpresa ?? "Ventastack"}</span>
        </div>
        <span className="text-xs text-ink/50">{nombre}</span>
      </div>

      {/* Overlay */}
      {abierto && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setAbierto(false)} />}

      {/* Drawer completo */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-white transition-transform duration-200 md:hidden ${abierto ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-linea p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primario text-sm font-bold text-white">{inicial}</div>
            <div>
              <p className="font-semibold text-ink leading-tight">{nombre}</p>
              <span className="text-xs text-ink/50">{rol}</span>
            </div>
          </div>
          <button onClick={() => setAbierto(false)} className="text-ink/40 hover:text-ink"><X size={20} /></button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {enlaces.map((item) =>
            item.tipo === "enlace" ? (
              <EnlaceNav key={item.href} item={item} activo={pathname === item.href} onClick={() => setAbierto(false)} />
            ) : (
              <GrupoNav key={item.etiqueta} item={item} pathname={pathname} onNavegar={() => setAbierto(false)} />
            ),
          )}
        </nav>
        <div className="border-t border-linea p-3"><BotonSalir /></div>
      </aside>

      {/* Bottom tab bar móvil */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around border-t border-linea bg-white md:hidden" style={{paddingBottom: "env(safe-area-inset-bottom)"}}>
        {tabsMobile.map(({ href, etiqueta, Icono }) => {
          const esMenu = href === "#menu";
          const activo = !esMenu && pathname === href;
          return (
            <button
              key={href}
              type="button"
              onClick={() => esMenu ? setAbierto(true) : router.push(href)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${activo ? "text-primario" : "text-ink/50"}`}
            >
              <Icono size={21} strokeWidth={activo ? 2.5 : 1.8} />
              {etiqueta}
            </button>
          );
        })}
      </nav>
      <div className="h-16 md:hidden" />
    </>
  );
}

function EnlaceNav({
  item,
  activo,
  onClick,
}: {
  item: { href: string; etiqueta: string; Icono: LucideIcon };
  activo: boolean;
  onClick: () => void;
}) {
  const Icono = item.Icono;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
        activo ? "bg-primario-suave text-primario" : "text-ink/70 hover:bg-paper"
      }`}
    >
      <Icono size={18} />
      {item.etiqueta}
    </Link>
  );
}

function GrupoNav({
  item,
  pathname,
  onNavegar,
}: {
  item: { etiqueta: string; Icono: LucideIcon; items: SubEnlace[] };
  pathname: string;
  onNavegar: () => void;
}) {
  const algunoActivo = item.items.some((sub) => pathname === sub.href);
  const [abierto, setAbierto] = useState(algunoActivo);
  const Icono = item.Icono;

  return (
    <div>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
          algunoActivo ? "text-primario" : "text-ink/70 hover:bg-paper"
        }`}
      >
        <span className="flex items-center gap-3">
          <Icono size={18} />
          {item.etiqueta}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform ${abierto ? "rotate-180" : ""}`}
        />
      </button>
      {abierto && (
        <div className="ml-6 mt-1 flex flex-col gap-1 border-l border-linea pl-3">
          {item.items.map((sub) => (
            <Link
              key={sub.href}
              href={sub.href}
              onClick={onNavegar}
              className={`rounded-md px-2 py-1.5 text-sm transition ${
                pathname === sub.href
                  ? "bg-primario-suave font-medium text-primario"
                  : "text-ink/60 hover:bg-paper"
              }`}
            >
              {sub.etiqueta}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function BotonSalir() {
  const router = useRouter();

  const cerrarSesion = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <button
      onClick={cerrarSesion}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-ink/70 transition hover:bg-paper"
    >
      <LogOut size={18} />
      Cerrar sesión
    </button>
  );
}
