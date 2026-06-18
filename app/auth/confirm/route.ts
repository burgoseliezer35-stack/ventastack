import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// A esta dirección apunta el enlace que llega por correo. Toma el
// "token_hash" del enlace, lo valida contra Supabase, y si es válido,
// deja al usuario con sesión iniciada.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Si lo invitaron (type "invite"), todavía no tiene contraseña —
  // lo mandamos a crearla antes de dejarlo entrar a /protected.
  const next =
    type === "invite"
      ? "/auth/establecer-password"
      : searchParams.get("next") ?? "/protected";

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      const redirectTo = request.nextUrl.clone();
      redirectTo.pathname = next;
      redirectTo.searchParams.delete("token_hash");
      redirectTo.searchParams.delete("type");
      redirectTo.searchParams.delete("next");
      return NextResponse.redirect(redirectTo);
    }
  }

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = "/auth/error";
  return NextResponse.redirect(redirectTo);
}
