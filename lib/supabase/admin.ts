import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ⚠️ OJO: este cliente usa la llave SECRETA (SUPABASE_SECRET_KEY) y
// tiene permiso total — se salta TODAS las políticas de RLS. Por eso
// SOLO se debe importar desde código que corre en el servidor (como
// app/api/invitar/route.ts). Nunca lo importes desde un archivo que
// empiece con "use client", o la llave secreta terminaría expuesta
// en el navegador.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
