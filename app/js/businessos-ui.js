(()=>{
  const routeMap={
    dashboard:{title:'Management Dashboard',desc:'Operational command centre for purchasing, inventory, supplier exposure and approvals.'},
    products:{title:'Product Master',desc:'Maintain the purchasing catalogue, canonical units, categories and reorder controls.'},
    stock:{title:'Inventory Ledger',desc:'Trace every stock receipt, usage, return, adjustment and reversal from one movement ledger.'},
    suppliers:{title:'Supplier Management',desc:'Manage supplier profiles, purchasing history, contacts and commercial details.'},
    bills:{title:'Purchase Invoices',desc:'Create, review, approve and manage supplier purchase invoices and payment status.'},
    prices:{title:'Price Intelligence',desc:'Track supplier price history, unit-cost movement and purchasing trends.'},
    reports:{title:'Reporting & Analytics',desc:'Export purchasing, inventory, reorder and supplier-spend management reports.'},
    approvals:{title:'Approvals & Recovery',desc:'Control invoice approvals, deletion requests, audit recovery and record restoration.'},
    admin:{title:'Administration',desc:'Manage users, roles, access status and operational governance.'},
    settings:{title:'Organisation Settings',desc:'Maintain company, tax, currency and application defaults.'}
  };
  let scheduled=false;
  const q=s=>document.querySelector(s);
  const currentRoute=()=>((location.hash||'#dashboard').slice(1)||'dashboard');
  const setText=(el,value)=>{if(el&&el.textContent!==value)el.textContent=value};

  function activate(route){
    const btn=q(`[data-route="${route}"]`);
    if(btn){btn.click();return;}
    location.hash=route;
  }

  function renameHeader(){
    const route=currentRoute(),meta=routeMap[route],head=q('#workspace .page-head');
    if(!meta||!head)return;
    setText(head.querySelector('h1'),meta.title);
    setText(head.querySelector('p'),meta.desc);
    setText(head.querySelector('.eyebrow'),'BusinessOS · White Saffron');
    setText(q('#pageTitle'),meta.title);
  }

  function dashboardLayer(){
    if(currentRoute()!=='dashboard')return;
    const ws=q('#workspace'),head=ws?.querySelector('.page-head');
    if(!ws||!head||q('#bosCommand'))return;
    const command=document.createElement('section');
    command.className='bos-command';command.id='bosCommand';
    command.innerHTML=`
      <article class="bos-hero">
        <div class="bos-hero-copy">
          <span class="bos-kicker">BusinessOS · Procurement v0.2</span>
          <h2>White Saffron operating workspace</h2>
          <p>Business demand now flows through purchase requests and controlled purchase orders before supplier invoicing, inventory and cost analysis.</p>
          <span class="bos-chip live">Requests & Purchase Orders · Live</span>
        </div>
      </article>
      <article class="bos-flow">
        <div class="bos-flow-title"><strong>Operational flow</strong><span>Current system</span></div>
        <div class="bos-flow-grid" data-v02="1">
          <button type="button" data-bos-procurement="requests">Purchase Request<span>Demand & approval</span></button>
          <button type="button" data-bos-procurement="orders">Purchase Order<span>Supplier commitment</span></button>
          <button type="button" data-bos-route="bills">Purchase Invoice<span>Supplier billing</span></button>
          <button type="button" data-bos-route="stock">Inventory<span>Movement ledger</span></button>
          <button type="button" data-bos-route="prices">Price Intelligence<span>Cost history</span></button>
          <button type="button" data-bos-route="reports">Reporting<span>Management output</span></button>
        </div>
      </article>`;
    head.insertAdjacentElement('afterend',command);

    const roadmap=document.createElement('div');
    roadmap.className='bos-roadmap';roadmap.id='bosRoadmap';roadmap.dataset.v02='1';
    roadmap.innerHTML=`<strong>Procurement roadmap</strong>
      <span class="bos-chip live">Product Master · Live</span>
      <span class="bos-chip live">Suppliers · Live</span>
      <span class="bos-chip live">Purchase Requests · Live</span>
      <span class="bos-chip live">Purchase Orders · Live</span>
      <span class="bos-chip live">Purchase Invoices · Live</span>
      <span class="bos-chip live">Inventory Ledger · Live</span>
      <span class="bos-chip live">Approvals · Live</span>
      <span class="bos-chip live">Price History · Live</span>
      <span class="bos-chip next">Goods Receipts · Next</span>
      <span class="bos-chip next">Payments · Next</span>`;
    command.insertAdjacentElement('afterend',roadmap);
  }

  function enhance(){
    scheduled=false;
    renameHeader();
    dashboardLayer();
  }

  function scheduleEnhance(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(enhance);
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-bos-route]');
    if(!b)return;
    e.preventDefault();activate(b.dataset.bosRoute);
  });

  const start=()=>{
    const ws=q('#workspace');
    if(!ws){setTimeout(start,120);return;}
    scheduleEnhance();
    new MutationObserver(scheduleEnhance).observe(ws,{childList:true,subtree:false});
    window.addEventListener('hashchange',scheduleEnhance);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
