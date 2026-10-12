/* pwa.js — ลงทะเบียน Service Worker + ปุ่มติดตั้งแอป (Android/Chrome) */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(e => console.warn("SW failed:", e));
  });
}

let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById("install-btn");
  if (btn) btn.style.display = "inline-flex";
});

async function installApp() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  const btn = document.getElementById("install-btn");
  if (btn) btn.style.display = "none";
}
window.addEventListener("appinstalled", () => {
  const btn = document.getElementById("install-btn");
  if (btn) btn.style.display = "none";
});
