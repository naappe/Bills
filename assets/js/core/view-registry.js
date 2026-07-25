(() => {
  'use strict';

  const VERSION = 4;
  const supportedViews = ['dashboard', 'bills', 'new', 'rates', 'mobile'];
  const rendererNames = {
    dashboard: 'renderDashboard',
    bills: 'renderBills',
    new: 'renderNewBill',
    rates: 'renderRates',
    mobile: 'renderMobileDemo'
  };

  const registry = window.__WS_RENDERERS__ || {};
  supportedViews.forEach(view => {
    const renderer = window[rendererNames[view]];
    if (typeof renderer === 'function') registry[view] = renderer;
  });

  window.__WS_RENDERERS__ = registry;
  window.__WS_PAGES__ = {
    version: VERSION,
    ready: supportedViews.every(view => typeof registry[view] === 'function'),
    supportedViews
  };
})();
