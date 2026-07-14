(() => {
  const IDLE_MS = 14 * 60 * 1000;
  const WARNING_MS = 60 * 1000;
  let idleTimer, logoutTimer, warning;
  const reset = () => {
    clearTimeout(idleTimer);
    clearTimeout(logoutTimer);
    warning?.remove();
    warning = null;
    idleTimer = setTimeout(showWarning, IDLE_MS);
  };
  const showWarning = () => {
    warning = document.createElement("div");
    warning.className = "session-warning";
    warning.setAttribute("role", "alertdialog");
    warning.setAttribute("aria-label", "Session timeout warning");
    warning.innerHTML = '<strong>Still working?</strong><span>You will be signed out in 60 seconds.</span><button type="button">Continue session</button>';
    warning.querySelector("button").addEventListener("click", reset);
    document.body.appendChild(warning);
    logoutTimer = setTimeout(() => document.getElementById("logoutBtn")?.click(), WARNING_MS);
  };
  ["pointerdown","keydown","touchstart","scroll"].forEach(name => addEventListener(name, reset, {passive:true}));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) reset(); });
  reset();
})();
