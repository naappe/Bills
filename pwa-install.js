(() => {
  const updateConnectivity = () => {
    let badge = document.getElementById('connectivityStatus');
    if (navigator.onLine) { badge?.remove(); return; }
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'connectivityStatus';
      badge.className = 'connectivity-status';
      badge.setAttribute('role', 'status');
      document.body.appendChild(badge);
    }
    badge.textContent = 'Offline — live records unavailable';
  };
  addEventListener('online', updateConnectivity);
  addEventListener('offline', updateConnectivity);
  addEventListener('DOMContentLoaded', updateConnectivity);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(error => {
        console.warn('PWA service worker registration failed:', error);
      });
    });
  }

  let installPrompt = null;
  const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const removeButton = () => document.getElementById('pwaInstallButton')?.remove();
  const showInstallButton = () => {
    if (!installPrompt || isStandalone() || document.getElementById('pwaInstallButton')) return;
    const button = document.createElement('button');
    button.id = 'pwaInstallButton';
    button.type = 'button';
    button.className = 'pwa-install-button';
    button.textContent = 'Install App';
    button.setAttribute('aria-label', 'Install White Saffron on this device');
    button.addEventListener('click', async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      removeButton();
    });
    const target = document.querySelector('.topnav .links') || document.querySelector('.sidebar .nav') || document.querySelector('.side-nav') || document.querySelector('header');
    target?.appendChild(button);
  };
  addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; showInstallButton(); });
  addEventListener('appinstalled', () => { installPrompt = null; removeButton(); });
})();

/* Bills performance layer: small startup query, local filters, server-side archive search. */
(() => {
  if (typeof db === 'undefined' || typeof state === 'undefined') return;

  const STARTUP_LIMIT = 60;
  const ARCHIVE_LIMIT = 200;
  const BILL_COLUMNS = 'id,bill_date,vendor,amount,bill_no,location,tin,category,user_id,created_by,created_at,payment_status,payment_method,notes';
  let recentRows = [];
  let searchTimer = null;
  let searchSequence = 0;

  const mergeRows = (...groups) => {
    const merged = new Map();
    groups.flat().forEach(row => {
      if (row?.id !== undefined && row?.id !== null) merged.set(String(row.id), row);
    });
    return [...merged.values()].sort((a,b) => (Number(b.id)||0) - (Number(a.id)||0));
  };

  const sixMonthStart = () => {
    const now = maldivesNow();
    return new Date(now.getFullYear(), now.getMonth()-5, 1, 0, 0, 0, 0);
  };
  const belongsToRecentWindow = row => {
    const billDate = parseDate(get(row,'date'));
    if (billDate) return billDate >= sixMonthStart() && billDate <= endToday();
    const created = parseDate(get(row,'createdAt'));
    return !!created && created >= sixMonthStart();
  };
  const ensureRecentRows = () => {
    if (recentRows.length || !state.rows.length) return;
    const recent = state.rows.filter(belongsToRecentWindow);
    recentRows = (recent.length ? recent : state.rows.slice(0,STARTUP_LIMIT)).slice();
  };

  const renderBillsOnly = () => {
    renderStats();
    renderRows();
  };

  const renderDashboardOnly = () => {
    renderStats();
    renderAdvancedDashboard();
    renderExtraAnalytics();
    renderBars(els.topVendors,totals(state.filtered,row=>canonicalVendor(get(row,'vendor'))),'vendor');
    renderBars(els.categoryDashboard,totals(state.filtered,category),'category');
    renderBars(els.paymentDashboard,totals(state.filtered,row=>get(row,'method')||'Not set'),'method');
    renderBars(els.statusSummary,totals(state.filtered,normStatus),'status');
  };

  render = function renderVisibleView(){
    if (state.view === 'dashboard') renderDashboardOnly();
    else renderBillsOnly();
  };

  switchView = function switchFastView(value,updateUrl=true){
    state.view = value === 'dashboard' ? 'dashboard' : 'bills';
    if (updateUrl && location.hash !== `#${state.view}`) history.pushState(null,'',`#${state.view}`);
    els.pageTitle.textContent = state.view === 'dashboard' ? 'Dashboard' : 'Bills';
    document.querySelectorAll('[data-view]').forEach(tab=>tab.classList.toggle('active',tab.dataset.view===state.view));
    els.dashboardView.classList.toggle('hidden',state.view!=='dashboard');
    els.billsView.classList.toggle('hidden',state.view!=='bills');
    $('billsKpiSummaryCards').classList.remove('hidden');
    document.querySelector('.filter-card').classList.remove('hidden');
    document.querySelector('.header-meta').classList.remove('hidden');
    render();
  };

  const localFilterAndRender = () => {
    updateDateRange();
    state.page = 1;
    const q = els.search.value.trim().toLowerCase();
    const status = els.status.value;
    const source = q.length >= 2 ? state.rows : activeRows();
    state.filtered = source.filter(row => {
      const text = [row.id,get(row,'vendor'),get(row,'billNo'),get(row,'location'),get(row,'tin'),get(row,'notes'),category(row),normStatus(row),get(row,'method'),formatCreated(get(row,'createdAt'))].join(' ').toLowerCase();
      const drill = state.drilldown;
      const drillMatch = !drill ||
        (drill.type==='vendor' && canonicalVendor(get(row,'vendor')||'Unknown')===drill.value) ||
        (drill.type==='category' && category(row)===drill.value) ||
        (drill.type==='method' && String(get(row,'method')||'Not set')===drill.value) ||
        (drill.type==='status' && normStatus(row)===drill.value);
      return (!q || text.includes(q)) && (!status || normStatus(row)===status) && drillMatch;
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
    const queryText = String(rawQuery||'').trim();
    const sequence = ++searchSequence;
    if (queryText.length < 2) { restoreRecentRows(); return; }
    els.recordStatus.textContent = 'Searching bill history...';
    const safe = queryText.replace(/[,%()]/g,' ').replace(/\s+/g,' ').trim();
    const requests = [
      db.from(TABLE_NAME).select(BILL_COLUMNS)
        .or(`vendor.ilike.%${safe}%,bill_no.ilike.%${safe}%,location.ilike.%${safe}%,tin.ilike.%${safe}%,notes.ilike.%${safe}%`)
        .order('id',{ascending:false}).limit(ARCHIVE_LIMIT)
    ];
    if (/^\d+$/.test(safe)) requests.push(db.from(TABLE_NAME).select(BILL_COLUMNS).eq('id',safe).limit(1));
    const results = await Promise.all(requests);
    if (sequence !== searchSequence) return;
    const failed = results.find(result => result.error);
    if (failed) {
      notice('error',`Older bill search failed: ${failed.error.message}`);
      restoreRecentRows();
      return;
    }
    const archiveRows = results.flatMap(result => result.data||[]);
    state.rows = mergeRows(recentRows,archiveRows);
    state.yearRows = state.rows.filter(isThisYear);
    rebuildVendorCanonicals();
    renderVendorOptions();
    localFilterAndRender();
    els.recordStatus.textContent = archiveRows.length ? `${archiveRows.length.toLocaleString()} history match(es) loaded` : 'No matching older bills found';
  };

  loadBills = async function loadRecentBills(){
    notice('','');
    els.recordStatus.textContent = 'Loading recent bills...';
    els.filterSummary.classList.toggle('hidden',!isAdmin());
    if (isAdmin()) els.filterSummary.textContent = 'Loading recent records from Supabase...';
    const previousRows = state.rows.slice();
    try {
      const {data,error} = await db.from(TABLE_NAME).select(BILL_COLUMNS).order('id',{ascending:false}).limit(STARTUP_LIMIT);
      if (error) throw error;
      const newest = data||[];
      const sixMonths = newest.filter(belongsToRecentWindow);
      recentRows = sixMonths.length ? sixMonths : newest;
      state.rows = recentRows.slice();
      state.yearRows = state.rows.filter(isThisYear);
      rebuildVendorCanonicals();
      renderVendorOptions();
      localFilterAndRender();
      $('lastUpdated').textContent = `Updated ${maldivesNow().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false})} MVT`;
      els.recordStatus.textContent = `${recentRows.length.toLocaleString()} recent bills loaded`;
      notice('','');
    } catch(error) {
      notice('error',`Bills could not load: ${error?.message||'Network request failed'}. Press Refresh to try again.`);
      if (!previousRows.length) { state.rows=[]; state.yearRows=[]; state.filtered=[]; render(); }
      else els.recordStatus.textContent = `Showing ${previousRows.length.toLocaleString()} previously loaded records`;
    }
  };

  applyFilters = function applyFastFilters(){
    ensureRecentRows();
    localFilterAndRender();
    clearTimeout(searchTimer);
    const q = els.search.value.trim();
    if (q.length >= 2) searchTimer = setTimeout(() => searchArchive(q),350);
    else searchArchive('');
  };
})();