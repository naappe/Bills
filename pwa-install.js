(() => {
  const updateConnectivity = () => {
    let badge = document.getElementById("connectivityStatus");
    if (navigator.onLine) { badge?.remove(); return; }
    if (!badge) { badge = document.createElement("div"); badge.id = "connectivityStatus"; badge.className = "connectivity-status"; badge.setAttribute("role","status"); document.body.appendChild(badge); }
    badge.textContent = "Offline — live records unavailable";
  };
  addEventListener("online", updateConnectivity);
  addEventListener("offline", updateConnectivity);
  addEventListener("DOMContentLoaded", updateConnectivity);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(error => {
        console.warn("PWA service worker registration failed:", error);
      });
    });
  }

  let installPrompt = null;
  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  const removeButton = () => document.getElementById("pwaInstallButton")?.remove();

  const showInstallButton = () => {
    if (!installPrompt || isStandalone() || document.getElementById("pwaInstallButton")) return;
    const button = document.createElement("button");
    button.id = "pwaInstallButton";
    button.type = "button";
    button.className = "pwa-install-button";
    button.textContent = "Install App";
    button.setAttribute("aria-label", "Install White Saffron on this device");
    button.addEventListener("click", async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      removeButton();
    });

    const target =
      document.querySelector(".topnav .links") ||
      document.querySelector(".sidebar .nav") ||
      document.querySelector(".side-nav") ||
      document.querySelector("header");
    if (target) target.appendChild(button);
  };

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    showInstallButton();
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    removeButton();
  });
})();
