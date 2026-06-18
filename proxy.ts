import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Nota: desde Next.js 16, lo que antes se llamaba "middleware.ts" ahora
// se llama "proxy.ts" — hace exactamente lo mismo, solo cambió el nombre.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
