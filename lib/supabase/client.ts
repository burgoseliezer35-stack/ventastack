import { createBrowserClient } from "@supabase/ssr";

// Este cliente se usa dentro de Client Components (archivos que empiezan
// con "use client" arriba). Corre en el navegador del usuario.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
