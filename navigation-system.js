(() => {
  'use strict';

  const HOME = './index.html#dashboard';
  const routes = [
    { key:'dashboard', label:'Dashboard', href:'./index.html#dashboard' },
    { key:'bills', label:'Bills', href:'./index.html#bills' },
    { key:'supply', label:'Supply Rates', href:'./supply-rates.html' },
    { key:'prices', label:'Prices', href:'./prices.html' },
    { key:'settings', label:'Settings', href:'./master.html', adminOnly:true }
  ];

  const currentKey = () => {
    const page = location.pathname.split('/').pop() || 'index.html';
    if (page === 'supply-rates.html') return 'supply';
    if (page === 'prices.html') return 'prices';
    if (page === 'master.html') return 'settings';
    if (page === 'index.html' || page === '') return location.hash === '#dashboard' ? 'dashboard' : 'bills';
    return '';
  };

  const makeBrand = source => {
    if (!source || source.matches('a.master-link')) return;
    const link = document.createElement('a');
    link.href = HOME;
    link.className = `${source.className || 'brand'} master-link`;
    link.setAttribute('aria-label','White Saffron dashboard');
    while (source.firstChild) link.appendChild(source.firstChild);
    source.replaceWith(link);
  };

  const normalizeBrand = () => {
    makeBrand(document.querySelector('.side-brand:not(a)'));
    makeBrand(document.querySelector('.topnav .brand:not(a)'));
    makeBrand(document.querySelector('header .brand:not(a)'));
  };

  const buildExternalNav = container => {
    if (!container || container.closest('#appView')) return;
    const preserved = [...container.children].filter(node =>
      node.matches?.('#themeToggle,.theme-toggle,#logoutBtn,.nav-logout,#pwaInstallButton')
    );
    container.querySelectorAll('a,button').forEach(node => {
      if (!preserved.includes(node)) node.remove();
    });
    const active = currentKey();
    routes.forEach(route => {
      const a = document.createElement('a');
      a.href = route.href;
      a.textContent = route.label;
      a.dataset.navKey = route.key;
      if (route.key === active) {
        a.classList.add('active');
        a.setAttribute('aria-current','page');
      }
      if (route.adminOnly) a.classList.add('admin-only-nav');
      container.insertBefore(a, preserved[0] || null);
    });
  };

  const normalizeIndexNav = () => {
    const nav = document.querySelector('#appView .nav');
    if (!nav) return;
    const dashboard = nav.querySelector('[data-view="dashboard"]');
    const bills = nav.querySelector('[data-view="bills"]');
    if (dashboard) dashboard.setAttribute('aria-label','Open dashboard');
    if (bills) bills.setAttribute('aria-label','Open bills');
    const sync = () => {
      const dashboardActive = location.hash === '#dashboard';
      dashboard?.classList.toggle('active',dashboardActive);
      bills?.classList.toggle('active',!dashboardActive);
      dashboard?.setAttribute('aria-current',dashboardActive ? 'page' : 'false');
      bills?.setAttribute('aria-current',dashboardActive ? 'false' : 'page');
    };
    addEventListener('hashchange',sync);
    sync();
  };

  const addStyles = () => {
    if (document.getElementById('canonicalNavigationStyles')) return;
    const style = document.createElement('style');
    style.id = 'canonicalNavigationStyles';
    style.textContent = `
      .master-link{display:inline-flex!important;align-items:center!important;gap:10px!important;color:var(--brand-text,var(--text-primary,#1a1a2e))!important;text-decoration:none!important;white-space:nowrap!important}
      .master-link:hover{opacity:.82}
      .master-link:focus-visible{outline:3px solid var(--theme-accent,var(--accent-500,#c9a84c))!important;outline-offset:4px!important;border-radius:10px}
      .topnav .links,.side-nav,.sidebar .nav{align-items:center!important}
      .topnav .links>a,.side-nav>a{display:inline-flex!important;align-items:center!important;min-height:44px!important;padding:0 13px!important;text-decoration:none!important;white-space:nowrap!important}
      .topnav .links>a.active,.side-nav>a.active{color:var(--theme-primary,var(--secondary-500,#0f3460))!important;background:var(--theme-primary-50,var(--secondary-50,#e8edf5))!important}
      @media(max-width:860px){.master-link{display:none!important}.topnav .links,.side-nav,.sidebar .nav{overflow-x:auto!important;scrollbar-width:none}.topnav .links::-webkit-scrollbar,.side-nav::-webkit-scrollbar,.sidebar .nav::-webkit-scrollbar{display:none}}
    `;
    document.head.appendChild(style);
  };

  const init = () => {
    normalizeBrand();
    normalizeIndexNav();
    document.querySelectorAll('.topnav .links,.side-nav').forEach(buildExternalNav);
    addStyles();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
