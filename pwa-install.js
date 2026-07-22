(() => {
  const updateConnectivity = () => {
    let badge = document.getElementById("connectivityStatus");
    if (navigator.onLine) { badge?.remove(); return; }
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "connectivityStatus";
      badge.className = "connectivity-status";
      badge.setAttribute("role", "status");
      document.body.appendChild(badge);
    }
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
  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
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
    const target = document.querySelector(".topnav .links") || document.querySelector(".sidebar .nav") || document.querySelector(".side-nav") || document.querySelector("header");
    if (target) target.appendChild(button);
  };
  window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); installPrompt = event; showInstallButton(); });
  window.addEventListener("appinstalled", () => { installPrompt = null; removeButton(); });
})();

/* Bills performance layer: capped recent load, local filters, full archive search. */
(() => {
  if (typeof db === "undefined" || typeof state === "undefined") return;

  const STARTUP_LIMIT = 50;
  const ARCHIVE_LIMIT = 250;
  let recentRows = [];
  let searchTimer = null;
  let searchSequence = 0;

  const mergeRows = (...groups) => {
    const merged = new Map();
    groups.flat().forEach(row => {
      if (row && row.id !== undefined && row.id !== null) merged.set(String(row.id), row);
    });
    return [...merged.values()].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
  };

  const sixMonthStart = () => {
    const now = maldivesNow();
    return new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
  };

  const belongsToRecentWindow = row => {
    const billDate = parseDate(get(row, "date"));
    if (billDate) return billDate >= sixMonthStart() && billDate <= endToday();
    const created = parseDate(get(row, "createdAt"));
    return !!created && created >= sixMonthStart();
  };

  const ensureRecentRows = () => {
    if (recentRows.length || !state.rows.length) return;
    const recent = state.rows.filter(belongsToRecentWindow);
    recentRows = (recent.length ? recent : state.rows.slice(0, STARTUP_LIMIT)).slice();
  };

  const localFilterAndRender = () => {
    updateDateRange();
    state.page = 1;
    const q = els.search.value.trim().toLowerCase();
    const status = els.status.value;
    const source = q.length >= 2 ? state.rows : activeRows();
    state.filtered = source.filter(row => {
      const text = [row.id, get(row,"vendor"), get(row,"billNo"), get(row,"location"), get(row,"tin"), get(row,"notes"), category(row), normStatus(row), get(row,"method"), formatCreated(get(row,"createdAt"))].join(" ").toLowerCase();
      const drill = state.drilldown;
      const drillMatch = !drill ||
        (drill.type === "vendor" && canonicalVendor(get(row,"vendor") || "Unknown") === drill.value) ||
        (drill.type === "category" && category(row) === drill.value) ||
        (drill.type === "method" && String(get(row,"method") || "Not set") === drill.value) ||
        (drill.type === "status" && normStatus(row) === drill.value);
      return (!q || text.includes(q)) && (!status || normStatus(row) === status) && drillMatch;
    });
    render();
  };

  const restoreRecentRows = () => {
    ensureRecentRows();
    state.rows = recentRows.slice();
    state.yearRows = state.rows.filter(isThisYear);
    rebuildVendorCanonicals();
    renderVendorOptions();
    localFilterAndRender();
  };

  const searchArchive = async rawQuery => {
    const queryText = String(rawQuery || "").trim();
    const sequence = ++searchSequence;
    if (queryText.length < 2) { restoreRecentRows(); return; }

    els.recordStatus.textContent = "Searching all bill history...";
    const safe = queryText.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim();
    const requests = [db.from(TABLE_NAME).select("*").or(`vendor.ilike.%${safe}%,bill_no.ilike.%${safe}%,location.ilike.%${safe}%,tin.ilike.%${safe}%,notes.ilike.%${safe}%`).order("id", { ascending:false }).limit(ARCHIVE_LIMIT)];
    if (/^\d+$/.test(safe)) requests.push(db.from(TABLE_NAME).select("*").eq("id", safe).limit(1));

    const results = await Promise.all(requests);
    if (sequence !== searchSequence) return;
    const failed = results.find(result => result.error);
    if (failed) {
      notice("error", `Older bill search failed: ${failed.error.message}`);
      restoreRecentRows();
      return;
    }

    const archiveRows = results.flatMap(result => result.data || []);
    state.rows = mergeRows(recentRows, archiveRows);
    state.yearRows = state.rows.filter(isThisYear);
    rebuildVendorCanonicals();
    renderVendorOptions();
    localFilterAndRender();
    els.recordStatus.textContent = archiveRows.length ? `${archiveRows.length.toLocaleString()} history match(es) loaded` : "No matching older bills found";
  };

  loadBills = async function loadRecentBills() {
    notice("", "");
    els.recordStatus.textContent = "Loading recent bills...";
    els.filterSummary.classList.toggle("hidden", !isAdmin());
    if (isAdmin()) els.filterSummary.textContent = "Loading a capped recent set from Supabase...";
    const previousRows = state.rows.slice();

    try {
      const { data, error } = await db.from(TABLE_NAME).select("*").order("id", { ascending:false }).limit(STARTUP_LIMIT);
      if (error) throw error;
      const newest = data || [];
      const sixMonths = newest.filter(belongsToRecentWindow);
      recentRows = sixMonths.length ? sixMonths : newest;
      state.rows = recentRows.slice();
      state.yearRows = state.rows.filter(isThisYear);
      rebuildVendorCanonicals();
      renderVendorOptions();
      localFilterAndRender();
      $("lastUpdated").textContent = `Updated ${maldivesNow().toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit", hour12:false })} MVT`;
      els.recordStatus.textContent = `${recentRows.length.toLocaleString()} recent bills loaded`;
      notice("", "");
    } catch (error) {
      notice("error", `Bills could not load: ${error?.message || "Network request failed"}. Press Refresh to try again.`);
      if (!previousRows.length) { state.rows=[]; state.yearRows=[]; state.filtered=[]; render(); }
      else els.recordStatus.textContent = `Showing ${previousRows.length.toLocaleString()} previously loaded records`;
    }
  };

  applyFilters = function applyFastFilters() {
    ensureRecentRows();
    localFilterAndRender();
    clearTimeout(searchTimer);
    const q = els.search.value.trim();
    if (q.length >= 2) searchTimer = setTimeout(() => searchArchive(q), 350);
    else searchArchive("");
  };
})();