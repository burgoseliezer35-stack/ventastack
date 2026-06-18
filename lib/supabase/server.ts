import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Este cliente se usa en código que corre en el servidor: Server
// Components, Server Actions y Route Handlers. Hay que crear una
// instancia nueva cada vez que se usa, porque necesita leer las cookies
// de la petición que está llegando en ese momento.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Esto truena si se llama desde un Server Component, que no
            // puede escribir cookies. Lo ignoramos a propósito: el
            // archivo proxy.ts ya se encarga de refrescar la sesión.
          }
        },
      },
    },
  );
}
