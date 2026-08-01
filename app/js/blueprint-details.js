const MASTER_FILES=[
  'app.css','kpi.css','system.css','consistency.css','products.css','vendors.css','reports.css','admin.css','dashboard.css','bills-mobile.css','cost.css','master-components.css','marketplace-theme.css','layout.css'
];

const TOKEN_NAMES=[
  '--bg','--surface','--surface-muted','--border','--text-strong','--text-muted',
  '--brand-navy','--brand-gold','--radius-card','--radius-control','--shadow-sm',
  '--control-height','--table-row','--header-height'
];

const px=value=>value&&value!=='0px'?value:'—';
const cssValue=(style,name)=>style.getPropertyValue(name).trim()||'—';
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[char]));

function selectorPath(element){
  if(!element)return'—';
  const parts=[];let node=element;
  while(node&&node.nodeType===1&&node!==document.body&&parts.length<6){
    let part=node.tagName.toLowerCase();
    if(node.id){part+=`#${node.id}`;parts.unshift(part);break}
    const classes=[...node.classList].filter(name=>!name.startsWith('page-helper')).slice(0,3);
    if(classes.length)part+=`.${classes.join('.')}`;
    parts.unshift(part);node=node.parentElement;
  }
  return parts.join(' > ');
}

function stylesheetName(sheet){
  try{return sheet.href?new URL(sheet.href).pathname.split('/').pop():'inline <style>'}catch{return'inline <style>'}
}

function matchingRules(element){
  const matches=[];
  [...document.styleSheets].forEach(sheet=>{
    let rules;try{rules=[...sheet.cssRules]}catch{return}
    const walk=list=>list.forEach(rule=>{
      if(rule.cssRules){walk([...rule.cssRules]);return}
      if(!rule.selectorText)return;
      try{if(element.matches(rule.selectorText))matches.push({file:stylesheetName(sheet),selector:rule.selectorText,css:rule.style.cssText})}catch{}
    });
    walk(rules);
  });
  return matches.slice(-12);
}

function elementReport(element){
  const style=getComputedStyle(element),rect=element.getBoundingClientRect();
  const rules=matchingRules(element);
  return `
    <div class="bp-detail-grid">
      <div><b>DOM selector</b><code>${escape(selectorPath(element))}</code></div>
      <div><b>Geometry</b><span>${Math.round(rect.width)} × ${Math.round(rect.height)} px · x ${Math.round(rect.x)} · y ${Math.round(rect.y)}</span></div>
      <div><b>Layout</b><span>display ${escape(style.display)} · position ${escape(style.position)} · z-index ${escape(style.zIndex)}</span></div>
      <div><b>Box model</b><span>margin ${escape(style.margin)} · padding ${escape(style.padding)} · gap ${escape(style.gap)}</span></div>
      <div><b>Sizing</b><span>width ${escape(style.width)} · max ${escape(style.maxWidth)} · min ${escape(style.minWidth)}</span></div>
      <div><b>Overflow</b><span>x ${escape(style.overflowX)} · y ${escape(style.overflowY)}</span></div>
      <div><b>Typography</b><span>${escape(style.fontFamily)} · ${escape(style.fontSize)} / ${escape(style.lineHeight)} · weight ${escape(style.fontWeight)}</span></div>
      <div><b>Theme</b><span>color ${escape(style.color)} · background ${escape(style.backgroundColor)} · border ${escape(style.borderColor)} · radius ${escape(style.borderRadius)}</span></div>
    </div>
    <div class="bp-rule-title">Matching CSS rules (${rules.length})</div>
    <div class="bp-rules">${rules.length?rules.map(rule=>`<details><summary>${escape(rule.file)} · ${escape(rule.selector)}</summary><code>${escape(rule.css)}</code></details>`).join(''):'<span>No readable stylesheet rules. Computed styles are still shown above.</span>'}</div>`;
}

function masterReport(){
  const root=getComputedStyle(document.documentElement);
  const content=document.querySelector('#content'),main=document.querySelector('.main'),header=document.querySelector('.app-header');
  const contentStyle=content?getComputedStyle(content):null;
  const loaded=[...document.styleSheets].map(stylesheetName);
  return `
    <section class="bp-master-card">
      <h4>Master application shell</h4>
      <div class="bp-detail-grid">
        <div><b>Viewport</b><span>${innerWidth} × ${innerHeight}px</span></div>
        <div><b>Header</b><span>${header?`${Math.round(header.getBoundingClientRect().height)}px · ${getComputedStyle(header).position}`:'Not found'}</span></div>
        <div><b>Main workspace</b><span>${main?`${Math.round(main.getBoundingClientRect().width)}px wide`:'Not found'}</span></div>
        <div><b>Content container</b><span>${contentStyle?`max ${contentStyle.maxWidth} · margin ${contentStyle.margin} · padding ${contentStyle.padding}`:'Not found'}</span></div>
        <div><b>Direction</b><span>${escape(root.direction)} · language ${escape(document.documentElement.lang||'not set')}</span></div>
        <div><b>Theme mode</b><span>${matchMedia('(prefers-color-scheme: dark)').matches?'System dark preference':'System light preference'} · app background ${escape(root.backgroundColor)}</span></div>
      </div>
    </section>
    <section class="bp-master-card">
      <h4>Design tokens</h4>
      <div class="bp-token-grid">${TOKEN_NAMES.map(name=>`<div><code>${name}</code><span>${escape(cssValue(root,name))}</span></div>`).join('')}</div>
    </section>
    <section class="bp-master-card">
      <h4>Master CSS architecture</h4>
      <p>Expected cascade order: foundation → system → consistency → route styles → master components → marketplace theme → layout overrides.</p>
      <div class="bp-file-list">${MASTER_FILES.map(name=>`<span class="${loaded.includes(name)?'loaded':'missing'}">${loaded.includes(name)?'✓':'!'} ${name}</span>`).join('')}</div>
    </section>
    <section class="bp-master-card">
      <h4>Responsive master rules</h4>
      <div class="bp-detail-grid">
        <div><b>Desktop</b><span>Main navigation visible; mobile topbar removed; centered content workspace.</span></div>
        <div><b>Mobile ≤ 820px</b><span>Desktop header hidden; hamburger topbar and slide-out drawer enabled.</span></div>
        <div><b>Small mobile ≤ 520px</b><span>Reduced page padding and narrower drawer.</span></div>
        <div><b>Current breakpoint</b><span>${innerWidth<=520?'Small mobile':innerWidth<=820?'Tablet/mobile':'Desktop'}</span></div>
      </div>
    </section>`;
}

function installStyles(){
  if(document.querySelector('#blueprintMasterDetailsStyles'))return;
  const style=document.createElement('style');style.id='blueprintMasterDetailsStyles';style.textContent=`
  .bp-master-tabs{display:flex;gap:6px;margin:10px 0}.bp-master-tab{padding:7px 10px;border:1px solid #dbe3ec;border-radius:8px;background:#fff;color:#40536c;font:700 10px/1 Inter,sans-serif;cursor:pointer}.bp-master-tab.active{border-color:#173d70;background:#173d70;color:#fff}.bp-master-panel{display:none}.bp-master-panel.active{display:grid;gap:9px}.bp-master-card{padding:10px;border:1px solid #dce5ef;border-radius:10px;background:#fff}.bp-master-card h4{margin:0 0 8px;color:#173d70;font-size:11px}.bp-master-card p{margin:0 0 8px;color:#667085;font-size:10px;line-height:1.45}.bp-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.bp-detail-grid>div{min-width:0;padding:7px;border-radius:7px;background:#f6f8fb}.bp-detail-grid b,.bp-detail-grid span{display:block}.bp-detail-grid b{margin-bottom:3px;color:#667085;font-size:9px;text-transform:uppercase}.bp-detail-grid span{color:#263b56;font-size:10px;overflow-wrap:anywhere}.bp-detail-grid code{display:block;color:#173d70;font-size:9px;overflow-wrap:anywhere}.bp-token-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}.bp-token-grid div{padding:7px;border-radius:7px;background:#f6f8fb}.bp-token-grid code,.bp-token-grid span{display:block;font-size:9px;overflow-wrap:anywhere}.bp-token-grid code{color:#173d70}.bp-token-grid span{margin-top:3px;color:#526379}.bp-file-list{display:flex;flex-wrap:wrap;gap:5px}.bp-file-list span{padding:5px 7px;border-radius:999px;background:#edf7f1;color:#176b45;font-size:9px}.bp-file-list span.missing{background:#fff1e5;color:#9a4f00}.bp-rule-title{margin:10px 0 5px;color:#667085;font-size:9px;font-weight:800;text-transform:uppercase}.bp-rules{display:grid;gap:5px}.bp-rules details{padding:6px;border:1px solid #dce5ef;border-radius:7px;background:#fff}.bp-rules summary{cursor:pointer;color:#334a65;font-size:9px}.bp-rules code{display:block;margin-top:6px;padding:6px;border-radius:6px;background:#eef3f8;color:#173d70;font-size:8px;white-space:pre-wrap;overflow-wrap:anywhere}@media(max-width:600px){.bp-detail-grid,.bp-token-grid{grid-template-columns:1fr}}
  `;document.head.appendChild(style);
}

function enhance(){
  installStyles();
  const panel=document.querySelector('#pageHelperPanel');
  if(!panel||panel.dataset.masterDetails==='1')return;
  panel.dataset.masterDetails='1';
  const tree=panel.querySelector('.page-helper-tree');
  if(!tree)return;
  const tabs=document.createElement('div');tabs.className='bp-master-tabs';tabs.innerHTML='<button class="bp-master-tab active" data-bp-view="structure" type="button">Structure</button><button class="bp-master-tab" data-bp-view="master" type="button">Design & theme CSS</button>';
  const master=document.createElement('div');master.className='bp-master-panel';master.dataset.bpPanel='master';master.innerHTML=masterReport();
  const structureWrap=document.createElement('div');structureWrap.className='bp-master-panel active';structureWrap.dataset.bpPanel='structure';
  const title=panel.querySelector('.page-helper-section-title');
  title.parentNode.insertBefore(tabs,title);structureWrap.append(title,tree);tabs.after(structureWrap);structureWrap.after(master);
  tabs.querySelectorAll('[data-bp-view]').forEach(button=>button.onclick=()=>{tabs.querySelectorAll('.bp-master-tab').forEach(x=>x.classList.toggle('active',x===button));panel.querySelectorAll('[data-bp-panel]').forEach(x=>x.classList.toggle('active',x.dataset.bpPanel===button.dataset.bpView))});
  panel.querySelectorAll('[data-helper-index]').forEach(button=>button.addEventListener('click',()=>{
    requestAnimationFrame(()=>{
      const highlighted=document.querySelector('.page-helper-target,.page-helper-target-error');
      const detail=panel.querySelector('#pageHelperDetail');
      if(highlighted&&detail){detail.classList.add('open');detail.innerHTML=elementReport(highlighted)}
    });
  },true));
}

const observer=new MutationObserver(()=>enhance());
function start(){enhance();observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('resize',()=>{const master=document.querySelector('[data-bp-panel="master"]');if(master)master.innerHTML=masterReport()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
