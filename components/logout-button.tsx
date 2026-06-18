"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <button
      onClick={logout}
      title="Cerrar sesión"
      className="flex h-10 w-10 items-center justify-center rounded-full text-ink/70 transition hover:bg-primario-suave hover:text-primario"
    >
      <LogOut size={18} />
      <span className="sr-only">Cerrar sesión</span>
    </button>
  );
}
