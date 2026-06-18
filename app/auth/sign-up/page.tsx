import { redirect } from "next/navigation";

// Crear un negocio nuevo ya no es autoservicio — ahora solo lo
// hace el administrador general desde /reseller/nueva-empresa.
// Dejamos esta ruta como un simple reenvío (en vez de borrarla)
// por si algún enlace viejo seguía apuntando aquí.
export default function SignUpPage() {
  redirect("/auth/login");
}
