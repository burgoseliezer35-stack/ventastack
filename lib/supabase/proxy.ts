import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Esta función la llama proxy.ts en cada petición que llega al servidor.
// Su trabajo: revisar si el token de sesión del usuario expiró y, si es
// así, renovarlo solo, antes de que la página termine de cargar.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: getClaims() valida la firma del token contra las llaves
  // públicas del proyecto cada vez. Nunca usar getSession() aquí para
  // proteger rutas — no garantiza que el token siga siendo válido.
  const { data } = await supabase.auth.getClaims();
  const estaLogueado = !!data?.claims;

  // Si no hay sesión y trata de entrar a una ruta protegida, lo
  // regresamos al login en vez de dejarlo pasar.
  if (!estaLogueado && request.nextUrl.pathname.startsWith("/protected")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return response;
}
