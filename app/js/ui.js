import {escapeHtml} from './store.js';

const $=selector=>document.querySelector(selector);
let observer=null;
let helperTimer=null;

const helperAreas=[
  ['Page Header','.page-head,.entry-hero'],
  ['Filter / Toolbar','.dashboard-commandbar,.bills-toolbar,.date-toolbar,.report-toolbar,.toolbar,.cost-workspace,.px-toolbar,.pm-top'],
  ['KPI Summary','.kpi-summary'],
  ['KPI Cards','.kpi-card'],
  ['KPI Icon','.kpi-card__icon'],
  ['KPI Content','.kpi-card__content'],
  ['KPI Label','.kpi-card__label'],
  ['KPI Value','.kpi-card__value'],
  ['KPI Meta','.kpi-card__meta'],
  ['Primary Content','.dashboard-primary-grid,.entry-main,.cost-focus,.cost-compare,.card,.vendor-grid,.px-grid,.admin-detail-grid'],
  ['Secondary Panel','.dashboard-attention-stack,.entry-side,.secondary-panel,aside.card'],
  ['Card Header','.card-head,.cost-compare>header,.cost-focus>header'],
  ['Card Body','.card-body,.dashboard-record-list,.dashboard-supplier-list,.entry-section'],
  ['Data Table','.table-wrap,table'],
  ['Form / Fields','form,.entry-grid,.advanced-fields,.security-grid'],
  ['Actions','.actions,.entry-actions,.review-actions,.bills-export-actions'],
  ['Pagination','.pagination,.pager,[data-pagination]']
];

function installStyles(){
  if($('#searchableListStyles'))return;
  const style=document.createElement('style');
  style.id='searchableListStyles';
  style.textContent=`
    .searchable-list-wrap{position:relative;display:block}
    .searchable-list-menu{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:1200;display:none;max-height:280px;overflow:auto;padding:6px;border:1px solid #d7e0e8;border-radius:12px;background:#fff;box-shadow:0 14px 36px rgba(15,35,61,.18)}
    .searchable-list-menu.open{display:block}
    .searchable-list-option{display:block;width:100%;padding:10px 12px;border:0;border-radius:8px;background:transparent;color:#162f52;text-align:left;font:600 13px/1.35 Inter,system-ui,sans-serif;cursor:pointer}
    .searchable-list-option:hover,.searchable-list-option.active{background:#eef4fb;color:#102b4e}
    .searchable-list-empty{padding:12px;color:#6f7f94;font-size:12px;text-align:center}
    .page-helper{position:fixed;right:22px;bottom:22px;z-index:3500;display:grid;justify-items:end;gap:9px;font-family:Inter,system-ui,sans-serif}
    .page-helper-toggle{min-height:42px;display:flex;align-items:center;gap:8px;padding:0 14px;border:1px solid #e7b844;border-radius:999px;background:#fff8e5;color:#694700;box-shadow:0 9px 28px rgba(15,42,69,.18);font-weight:800;cursor:pointer}
    .page-helper-panel{width:min(390px,calc(100vw - 28px));max-height:min(560px,72vh);overflow:auto;padding:14px;border:1px solid #e7c86f;border-radius:16px;background:#fffdf7;box-shadow:0 18px 48px rgba(15,42,69,.22)}
    .page-helper-panel[hidden]{display:none}
    .page-helper-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:11px}
    .page-helper-head strong,.page-helper-head small{display:block}.page-helper-head strong{color:#142f54;font-size:13px}.page-helper-head small{margin-top:3px;color:#6c7889;font-size:10px;line-height:1.4}
    .page-helper-close{width:30px;height:30px;padding:0;border:0;border-radius:8px;background:transparent;color:#68768a;cursor:pointer}.page-helper-close:hover{background:#f5ead0;color:#142f54}
    .page-helper-items{display:flex;flex-wrap:wrap;gap:7px}
    .page-helper-item{padding:7px 10px;border:1px solid #ead8aa;border-radius:999px;background:#fff;color:#75510b;font:800 10px/1 Inter,system-ui,sans-serif;cursor:pointer}.page-helper-item:hover,.page-helper-item.active{border-color:#d89b0b;background:#fff1c7;color:#5a3b00}
    .page-helper-target{position:relative;z-index:1;outline:3px solid #f0ad20!important;outline-offset:4px!important;box-shadow:0 0 0 7px rgba(240,173,32,.18)!important;animation:pageHelperPulse .9s ease 2}
    @keyframes pageHelperPulse{0%,100%{outline-color:#f0ad20}50%{outline-color:#173d70}}
    @media(max-width:700px){.page-helper{right:12px;bottom:12px}.page-helper-toggle{min-height:40px}.page-helper-panel{max-height:64vh}}
  `;
  document.head.appendChild(style);
}

function clearHelperTargets(){
  document.querySelectorAll('.page-helper-target').forEach(element=>element.classList.remove('page-helper-target'));
  document.querySelectorAll('.page-helper-item.active').forEach(element=>element.classList.remove('active'));
  if(helperTimer){clearTimeout(helperTimer);helperTimer=null}
}

function installPageHelper(root=document.querySelector('#content')){
  if(!root)return;
  root.querySelector('.dashboard-layout-note')?.remove();
  $('#globalPageHelper')?.remove();
  const available=helperAreas.map(([label,selector])=>({label,selector,targets:[...root.querySelectorAll(selector)].filter(element=>!element.closest('.modal'))})).filter(area=>area.targets.length);
  if(!available.length)return;
  const route=root.dataset.currentRoute||'page';
  const helper=document.createElement('aside');
  helper.className='page-helper';
  helper.id='globalPageHelper';
  helper.innerHTML=`<section class="page-helper-panel" id="pageHelperPanel" hidden><div class="page-helper-head"><div><strong><i class="fa-solid fa-wand-magic-sparkles"></i> ${escapeHtml(route.replace(/-/g,' '))} page helper</strong><small>Click a component name to jump to and highlight every matching area on this page.</small></div><button class="page-helper-close" type="button" aria-label="Close helper"><i class="fa-solid fa-xmark"></i></button></div><div class="page-helper-items">${available.map((area,index)=>`<button class="page-helper-item" type="button" data-helper-index="${index}">${escapeHtml(area.label)}${area.targets.length>1?` · ${area.targets.length}`:''}</button>`).join('')}</div></section><button class="page-helper-toggle" type="button" aria-expanded="false"><i class="fa-solid fa-circle-question"></i><span>Page helper</span></button>`;
  document.body.appendChild(helper);
  const panel=helper.querySelector('.page-helper-panel'),toggle=helper.querySelector('.page-helper-toggle');
  const setOpen=open=>{panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open))};
  toggle.addEventListener('click',()=>setOpen(panel.hidden));
  helper.querySelector('.page-helper-close').addEventListener('click',()=>setOpen(false));
  helper.querySelectorAll('[data-helper-index]').forEach(button=>button.addEventListener('click',()=>{
    clearHelperTargets();
    const area=available[Number(button.dataset.helperIndex)];
    if(!area)return;
    button.classList.add('active');
    area.targets.forEach(target=>target.classList.add('page-helper-target'));
    area.targets[0]?.scrollIntoView({behavior:'smooth',block:'center'});
    helperTimer=setTimeout(clearHelperTargets,4200);
  }));
}

function enhanceInput(input){
  if(input.dataset.searchableList)return;
  const listId=input.getAttribute('list');
  const list=document.getElementById(listId);
  if(!list)return;
  const values=[...list.querySelectorAll('option')].map(option=>option.value||option.textContent||'').map(value=>value.trim()).filter(Boolean);
  if(!values.length)return;
  input.dataset.searchableList=listId;
  input.removeAttribute('list');
  input.setAttribute('autocomplete','off');
  input.setAttribute('aria-autocomplete','list');
  input.setAttribute('aria-expanded','false');
  const wrap=document.createElement('span');
  wrap.className='searchable-list-wrap';
  input.parentNode.insertBefore(wrap,input);
  wrap.appendChild(input);
  const menu=document.createElement('div');
  menu.className='searchable-list-menu';
  menu.setAttribute('role','listbox');
  wrap.appendChild(menu);
  let active=-1;
  const close=()=>{menu.classList.remove('open');input.setAttribute('aria-expanded','false');active=-1};
  const choose=value=>{input.value=value;close();input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.focus()};
  const draw=(showAll=false)=>{const query=showAll?'':input.value.trim().toLowerCase(),matches=values.filter(value=>!query||value.toLowerCase().includes(query));active=-1;menu.innerHTML=matches.length?matches.map(value=>`<button class="searchable-list-option" type="button" role="option" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join(''):'<div class="searchable-list-empty">No matching options</div>';menu.classList.add('open');input.setAttribute('aria-expanded','true');menu.querySelectorAll('.searchable-list-option').forEach(option=>option.addEventListener('mousedown',event=>{event.preventDefault();choose(option.dataset.value)}))};
  const setActive=index=>{const options=[...menu.querySelectorAll('.searchable-list-option')];if(!options.length)return;active=(index+options.length)%options.length;options.forEach((option,i)=>{option.classList.toggle('active',i===active);option.setAttribute('aria-selected',String(i===active))});options[active].scrollIntoView({block:'nearest'})};
  input.addEventListener('focus',()=>draw(true));
  input.addEventListener('click',()=>draw(true));
  input.addEventListener('input',()=>draw(false));
  input.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();if(!menu.classList.contains('open'))draw(true);setActive(active+1)}else if(event.key==='ArrowUp'){event.preventDefault();if(!menu.classList.contains('open'))draw(true);setActive(active-1)}else if(event.key==='Enter'&&active>=0){event.preventDefault();menu.querySelectorAll('.searchable-list-option')[active]?.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))}else if(event.key==='Escape')close()});
  document.addEventListener('mousedown',event=>{if(!wrap.contains(event.target))close()});
}

export function enhanceSearchableLists(root=document){
  installStyles();
  root.querySelectorAll('input[list]:not([data-searchable-list])').forEach(enhanceInput);
}

export function watchSharedUI(root=document.querySelector('#content')){
  enhanceSearchableLists(document);
  installPageHelper(root);
  if(!root||observer)return;
  observer=new MutationObserver(()=>{
    enhanceSearchableLists(root);
    clearTimeout(observer.helperRefreshTimer);
    observer.helperRefreshTimer=setTimeout(()=>installPageHelper(root),80);
  });
  observer.observe(root,{childList:true,subtree:true});
}