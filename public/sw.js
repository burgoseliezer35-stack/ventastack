// Service Worker — Ventastack offline mode
const CACHE_NAME = "ventastack-v1";

// Páginas y assets que se cachean al instalar
const CACHE_STATIC = [
  "/protected/pos",
  "/protected/productos",
  "/protected",
];

// Al instalar, cachear páginas principales
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_STATIC).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Al activar, limpiar caches viejos
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia: Network first, cache como fallback
self.addEventListener("fetch", (e) => {
  // Solo interceptar GETs de navegación (páginas HTML)
  if (e.request.method !== "GET") return;
  
  const url = new URL(e.request.url);
  
  // No interceptar APIs ni assets dinámicos
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/")) {
    // Assets de Next.js — cache first
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Páginas — network first, fallback a cache
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => {
        return caches.match(e.request).then((cached) => {
          if (cached) return cached;
          // Fallback a la página del POS si está en cache
          return caches.match("/protected/pos") ?? Response.error();
        });
      })
  );
});
