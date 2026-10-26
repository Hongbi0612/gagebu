// 타닥 가계부 서비스 워커: 앱 파일은 캐시해서 오프라인에서도 열리게 한다.
// 기록은 브라우저 저장소에 있어서 여기서 다루지 않는다.
// CACHE 이름은 scripts/build_public.py 가 빌드할 때마다 '버전-index.html 해시'로 바꿔 넣는다. 손으로 고치지 않는다.
const CACHE = "tadak-gagebu-v8-907bba50";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-180.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 앱 페이지: 새 버전을 먼저 받아 보고, 오프라인이면 캐시.
  // 앱 주소(./ 또는 ./index.html)의 정상 응답만 저장한다. 같은 범위의 다른 파일·404 페이지로 덮어쓰지 않게
  if (req.mode === "navigate") {
    const scope = new URL(self.registration.scope), isApp = url.origin === scope.origin && (url.pathname === scope.pathname || url.pathname === scope.pathname + "index.html");
    e.respondWith(fetch(req).then(r => { if (r.ok && isApp) { const copy = r.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); } return r; }).catch(() => caches.match("./index.html")));
    return;
  }
  // 글꼴·아이콘 등: 캐시 우선, 없으면 받아서 정상 응답만 저장
  if (url.origin === location.origin || url.host.endsWith("fonts.googleapis.com") || url.host.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; })));
  }
});
