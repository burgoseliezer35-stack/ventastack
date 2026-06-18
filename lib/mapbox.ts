type ResultadoGeocodificacion = { latitud: number; longitud: number } | null;

// Convierte una dirección en texto a coordenadas, usando la API de
// geocodificación de Mapbox. Corre en el servidor (la llave nunca se
// manda al navegador). Si la dirección no se puede ubicar, o no hay
// token configurado, regresa null — no es un error fatal: el cliente
// se guarda igual, solo que sin coordenadas, y el check-in no podrá
// usarse en él hasta que se corrija la dirección.
export async function geocodificarDireccion(
  direccion: string,
): Promise<ResultadoGeocodificacion> {
  const token = process.env.MAPBOX_TOKEN;
  if (!token || !direccion) return null;

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    direccion,
  )}.json?access_token=${token}&limit=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature?.center) return null;

    const [longitud, latitud] = feature.center as [number, number];
    return { latitud, longitud };
  } catch {
    return null;
  }
}
