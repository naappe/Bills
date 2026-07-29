(()=>{
  const ROOT_SELECTOR='#content';
  let refreshTimer=null;

  const directChildren=element=>[...element.children];
  const hasContent=element=>Boolean(element?.textContent?.trim()||element?.querySelector?.('input,select,button,table,img,svg,canvas'));

  function ensurePageHeader(root){
    let header=root.querySelector('.page-head,.entry-hero,[data-blueprint="page-header"]');
    if(header)return header;
    const heading=root.querySelector(':scope > h1,:scope > header h1,:scope h1');
    if(!heading)return null;
    header=heading.closest('header,section,div')||heading.parentElement;
    header?.classList.add('page-head');
    header?.setAttribute('data-blueprint','page-header');
    return header;
  }

  function ensurePrimaryContent(root,header){
    let primary=root.querySelector('[data-blueprint="primary-content"],.page-primary-content,.dashboard-primary-grid,.entry-main,.cost-focus,.cost-compare,.card,.vendor-grid,.px-grid,.admin-detail-grid');
    if(primary)return primary;
    const candidates=directChildren(root).filter(element=>element!==header&&!element.matches('.product-simple-toolbar,.bills-toolbar,.date-toolbar,.report-toolbar,.toolbar,.kpi-summary,.bills-export-actions')&&hasContent(element));
    primary=candidates.find(element=>element.matches('main,section,article'))||candidates[0]||null;
    if(primary){
      primary.classList.add('page-primary-content');
      primary.setAttribute('data-blueprint','primary-content');
    }
    return primary;
  }

  function migrateProductKpis(root){
    root.querySelectorAll('.px-kpis').forEach(summary=>{
      summary.classList.remove('px-kpis');
      summary.classList.add('kpi-summary');
      summary.setAttribute('data-blueprint-migrated','products');
      [...summary.children].forEach((card,index)=>{
        if(card.classList.contains('kpi-card'))return;
        const label=card.querySelector('span')?.textContent?.trim()||`Product KPI ${index+1}`;
        const value=card.querySelector('strong')?.textContent?.trim()||'—';
        card.className='kpi-card';
        card.innerHTML=`<span class="kpi-card__icon" aria-hidden="true"><i class="fa-solid fa-box"></i></span><span class="kpi-card__content"><span class="kpi-card__label"></span><strong class="kpi-card__value"></strong><small class="kpi-card__meta">Live product data</small></span>`;
        card.querySelector('.kpi-card__label').textContent=label;
        card.querySelector('.kpi-card__value').textContent=value;
      });
    });
    root.querySelectorAll('.px-kpi').forEach(card=>card.classList.remove('px-kpi'));
  }

  function normalise(){
    const root=document.querySelector(ROOT_SELECTOR);
    if(!root||!hasContent(root))return;
    migrateProductKpis(root);
    const header=ensurePageHeader(root);
    ensurePrimaryContent(root,header);
  }

  function schedule(){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(normalise,30);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    schedule();
    const root=document.querySelector(ROOT_SELECTOR);
    if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  });
  window.addEventListener('hashchange',schedule);
})();
