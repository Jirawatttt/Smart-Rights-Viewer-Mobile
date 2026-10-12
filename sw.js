/* Service Worker — Smart Rights Viewer
   - ไฟล์หน้าเว็บ (app shell): network-first แล้ว fallback เป็น cache (ได้เวอร์ชันใหม่เสมอเมื่อออนไลน์)
   - Google Fonts / chart.js (CDN): stale-while-revalidate
   - API (onrender.com): ไม่ cache เด็ดขาด (ข้อมูลส่วนบุคคล + ผลวิเคราะห์ต้องสดเสมอ)
   เปลี่ยน VERSION ทุกครั้งที่แก้ไฟล์ใน SHELL */
const VERSION = "v1";
const SHELL_CACHE = `srv-shell-${VERSION}`;
const CDN_CACHE = `srv-cdn-${VERSION}`;

const SHELL = [
  "/", "/index.html", "/input.html", "/result.html",
  "/styles.css", "/app.js", "/input.js", "/result.js", "/pwa.js",
  "/logo.png", "/manifest.json", "/offline.html",
  "/icons/icon-192.png", "/icons/icon-512.png",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => ![SHELL_CACHE, CDN_CACHE].includes(k))
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const CDN_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net"];

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;           // POST ไป API ปล่อยผ่านเสมอ
  const url = new URL(req.url);

  // CDN: stale-while-revalidate
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(CDN_CACHE).then(async cache => {
        const cached = await cache.match(req);
        const fetching = fetch(req).then(res => {
          if (res.ok || res.type === "opaque") cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || fetching;
      })
    );
    return;
  }

  // ข้ามทุก origin อื่น (รวม API บน Render)
  if (url.origin !== self.location.origin) return;

  // ไฟล์ของเราเอง: network-first -> cache -> offline.html
  event.respondWith(
    fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(SHELL_CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(async () => {
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;
      if (req.mode === "navigate") return caches.match("/offline.html");
      return Response.error();
    })
  );
});
