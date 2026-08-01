import {escapeHtml} from './store.js';

const $=selector=>document.querySelector(selector);
let observer=null;
let helperTimer=null;

const routeLabels={dashboard:'Dashboard',bills:'Bills',new:'Bill entry',products:'Supply',vendors:'Inventory',cost:'Cost',reports:'Reports',settings:'Settings',admin:'Admin'};
const routeOrder=['dashboard','bills','new','products','vendors','cost','reports','settings','admin'];

const blueprintAreas=[
  {label:'Page Shell',selector:'.page-shell'},
  {label:'Page Header',selector:'.page-header,.page-head,.entry-hero',required:true},
  {label:'Header Actions',selector:'.page-header__actions,.page-head>.actions'},
  {label:'Filter / Toolbar',selector:'.page-toolbar,.dashboard-commandbar,.bills-toolbar,.date-toolbar,.report-toolbar,.toolbar,.cost-workspace,.px-toolbar,.pm-top'},
  {label:'KPI Summary',selector:'.kpi-summary'},
  {label:'KPI Cards',selector:'.kpi-card'},
  {label:'Primary Content',selector:'.page-content,.dashboard-primary-grid,.entry-main,.cost-focus,.cost-compare,.card,.panel,.vendor-grid,.px-grid,.admin-detail-grid',required:true},
  {label:'Secondary Panel',selector:'.dashboard-attention-stack,.entry-side,.secondary-panel,aside.card'},
  {label:'Card Header',selector:'.card-head,.cost-compare>header,.cost-focus>header'},
  {label:'Card Body',selector:'.card-body,.dashboard-record-list,.dashboard-supplier-list,.entry-section'},
  {label:'Data Table',selector:'.table-wrap,table'},
  {label:'Form / Fields',selector:'form,.entry-grid,.advanced-fields,.security-grid'},
  {label:'Actions',selector:'.actions,.entry-actions,.review-actions,.bills-export-actions'},
  {label:'Pagination',selector:'.pagination,.pager,[data-pagination]'}
];

const legacyAreas=[
  {label:'Legacy KPI summary',selector:'.dashboard-metrics,.bills-summary,.grid-4,.cost-kpis,.admin-summary-grid'},
  {label:'Legacy KPI card',selector:'.dashboard-metric,.kpi,.cost-kpis>article,.bills-summary>div'},
  {label:'Legacy helper text',selector:'[data-development-note],.development-note,.tutorial-note'}
];

function installStyles(){
  if($('#sharedUiStyles'))return;
  const style=document.createElement('style');
  style.id='sharedUiStyles';
  style.textContent=`
    .searchable-list-wrap{position:relative;display:block}.searchable-list-menu{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:1200;display:none;max-height:280px;overflow:auto;padding:6px;border:1px solid #d7e0e8;border-radius:12px;background:#fff;box-shadow:0 14px 36px rgba(15,35,61,.18)}.searchable-list-menu.open{display:block}.searchable-list-option{display:block;width:100%;padding:10px 12px;border:0;border-radius:8px;background:transparent;color:#162f52;text-align:left;font:600 13px/1.35 Inter,system-ui,sans-serif;cursor:pointer}.searchable-list-option:hover,.searchable-list-option.active{background:#eef4fb;color:#102b4e}.searchable-list-empty{padding:12px;color:#6f7f94;font-size:12px;text-align:center}
    .page-helper{position:fixed;right:22px;bottom:22px;z-index:3500;display:grid;justify-items:end;gap:9px;font-family:Inter,system-ui,sans-serif}.page-helper-toggle{min-height:42px;display:flex;align-items:center;gap:8px;padding:0 14px;border:1px solid #e7b844;border-radius:999px;background:#fff8e5;color:#694700;box-shadow:0 9px 28px rgba(15,42,69,.18);font-weight:800;cursor:pointer}.page-helper-panel{width:min(520px,calc(100vw - 28px));max-height:min(720px,82vh);overflow:auto;padding:14px;border:1px solid #e7c86f;border-radius:16px;background:#fffdf7;box-shadow:0 18px 48px rgba(15,42,69,.22)}.page-helper-panel[hidden]{display:none}.page-helper-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:11px}.page-helper-head strong,.page-helper-head small{display:block}.page-helper-head strong{color:#142f54;font-size:13px}.page-helper-head small{margin-top:3px;color:#6c7889;font-size:10px;line-height:1.4}.page-helper-close{width:30px;height:30px;padding:0;border:0;border-radius:8px;background:transparent;color:#68768a;cursor:pointer}.page-helper-close:hover{background:#f5ead0;color:#142f54}.page-helper-summary{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}.page-helper-status{padding:5px 8px;border-radius:999px;background:#eef4fb;color:#173d70;font:800 10px/1 Inter,system-ui,sans-serif}.page-helper-status.warn{background:#fff0d8;color:#7a4800}.page-helper-status.bad{background:#ffe5e5;color:#8d1d1d}.page-helper-routes{display:flex;gap:6px;overflow:auto;padding:2px 0 8px;scrollbar-width:thin}.page-helper-route{flex:0 0 auto;padding:7px 9px;border:1px solid #dfe6ee;border-radius:8px;background:#fff;color:#40536c;font:700 10px/1 Inter,system-ui,sans-serif;cursor:pointer}.page-helper-route:hover{background:#f3f7fb}.page-helper-route.active{border-color:#3157f6;background:#eef2ff;color:#2449d8}.page-helper-filters{display:flex;gap:6px;margin:0 0 10px}.page-helper-filter{padding:6px 9px;border:1px solid #e0e6ed;border-radius:999px;background:#fff;color:#5d6c80;font:700 9px/1 Inter,system-ui,sans-serif;cursor:pointer}.page-helper-filter.active{background:#173d70;color:#fff;border-color:#173d70}.page-helper-tree{display:grid;gap:6px}.page-helper-node{width:100%;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid #e4e9ef;border-radius:10px;background:#fff;color:#243b5a;text-align:left;cursor:pointer}.page-helper-node:hover,.page-helper-node.active{border-color:#b8c8dc;background:#f5f8fc}.page-helper-node.warn{border-color:#efc477;background:#fff9ed}.page-helper-node.bad{border-color:#e5a4a4;background:#fff4f4}.page-helper-node small{display:block;margin-top:3px;color:#718096;font-size:10px}.page-helper-node b{font-size:11px}.page-helper-node em{font-style:normal;font:800 9px/1 Inter,system-ui,sans-serif;text-transform:uppercase}.page-helper-section-title{margin:12px 0 6px;color:#6b7889;font:800 9px/1 Inter,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.08em}.page-helper-detail{display:none;margin:8px 0 10px;padding:10px;border:1px solid #dce5ef;border-radius:10px;background:#f8fbff;color:#34475f;font-size:10px;line-height:1.5}.page-helper-detail.open{display:block}.page-helper-detail code{display:block;margin-top:6px;padding:7px;border-radius:7px;background:#eef3f8;color:#173d70;white-space:normal;overflow-wrap:anywhere}.page-helper-target{position:relative;z-index:1;outline:3px solid #f0ad20!important;outline-offset:4px!important;box-shadow:0 0 0 7px rgba(240,173,32,.18)!important;animation:pageHelperPulse .9s ease 2}.page-helper-target-error{outline-color:#d94141!important;box-shadow:0 0 0 7px rgba(217,65,65,.17)!important}@keyframes pageHelperPulse{0%,100%{outline-color:#f0ad20}50%{outline-color:#173d70}}@media(max-width:700px){.page-helper{right:12px;bottom:12px}.page-helper-toggle{min-height:40px}.page-helper-panel{max-height:76vh}}
  `;
  document.head.appendChild(style);
}

function clearHelperTargets(){
  document.querySelectorAll('.page-helper-target,.page-helper-target-error').forEach(element=>element.classList.remove('page-helper-target','page-helper-target-error'));
  document.querySelectorAll('.page-helper-node.active').forEach(element=>element.classList.remove('active'));
  if(helperTimer){clearTimeout(helperTimer);helperTimer=null}
}

function isIntentionallyHidden(element){
  return Boolean(element.closest('.modal.hidden,.session-warning.hidden,.login.hidden,.auth-loader.hidden,.mobile-drawer:not(.open)')||element.matches('[hidden],[aria-hidden="true"],.hidden,.sr-only,.visually-hidden'));
}
function isHidden(element){
  const style=getComputedStyle(element);
  return element.hidden||style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0;
}
function hasMeaningfulContent(element){
  return Boolean(element.querySelector('input,select,textarea,button,a,table,canvas,svg,img,[role="img"],i[class*="fa-"]')||element.textContent.trim());
}
function selectorPath(element){
  if(!element)return'';
  const parts=[];let node=element;
  while(node&&node.nodeType===1&&node!==document.body&&parts.length<5){
    let part=node.tagName.toLowerCase();
    if(node.id){part+=`#${node.id}`;parts.unshift(part);break}
    const classes=[...node.classList].filter(name=>!name.startsWith('page-helper')).slice(0,2);
    if(classes.length)part+=`.${classes.join('.')}`;
    parts.unshift(part);node=node.parentElement;
  }
  return parts.join(' > ');
}
function describeNode(node){
  const target=node.targets?.[0];
  if(!target)return node.detail;
  const style=getComputedStyle(target),rect=target.getBoundingClientRect();
  return `${node.detail}. Size ${Math.round(rect.width)}×${Math.round(rect.height)}px; display ${style.display}; position ${style.position}; overflow ${style.overflow}.`;
}

function inspectPage(root){
  const nodes=[];
  blueprintAreas.forEach(area=>{
    const targets=[...root.querySelectorAll(area.selector)].filter(element=>!element.closest('.modal'));
    if(targets.length){
      const accidentalHidden=targets.filter(element=>isHidden(element)&&!isIntentionallyHidden(element)).length;
      const empty=targets.filter(element=>!hasMeaningfulContent(element)).length;
      nodes.push({...area,targets,status:accidentalHidden===targets.length?'hidden':empty===targets.length?'empty':'present',detail:`${targets.length} found${accidentalHidden?` · ${accidentalHidden} hidden`:''}${empty?` · ${empty} empty`:''}`,category:'structure'});
    }else if(area.required)nodes.push({...area,targets:[],status:'missing',detail:'Required structure not found',category:'structure'});
  });
  legacyAreas.forEach(area=>{
    const targets=[...root.querySelectorAll(area.selector)].filter(element=>!element.closest('.modal'));
    if(targets.length)nodes.push({...area,targets,status:'legacy',detail:`${targets.length} old structure${targets.length===1?'':'s'} found`,category:'structure'});
  });
  [...root.querySelectorAll('section,article,aside,div')].filter(element=>!element.closest('.page-helper,.modal')).forEach(element=>{
    if(isHidden(element)&&!isIntentionallyHidden(element)&&hasMeaningfulContent(element))nodes.push({label:'Hidden content',targets:[element],status:'hidden',detail:'Contains content but is not visible',category:'visibility'});
  });
  [...root.querySelectorAll('*')].filter(element=>!element.closest('.page-helper,.modal')).forEach(element=>{
    const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
    if(rect.width>0&&element.scrollWidth>element.clientWidth+3&&style.overflowX==='visible')nodes.push({label:'Horizontal overflow',targets:[element],status:'overflow',detail:`Content is ${element.scrollWidth-element.clientWidth}px wider than its container`,category:'layout'});
    if(['absolute','fixed'].includes(style.position)&&rect.width>0&&rect.height>0&&rect.right>innerWidth+2)nodes.push({label:'Off-screen element',targets:[element],status:'overflow',detail:'Positioned beyond the right edge of the viewport',category:'layout'});
  });
  return nodes.filter((node,index,list)=>index===list.findIndex(other=>other.label===node.label&&other.targets?.[0]===node.targets?.[0]));
}

function installPageHelper(root=document.querySelector('#content')){
  if(!root)return;
  const previousOpen=!$('#pageHelperPanel')?.hidden;
  $('#globalPageHelper')?.remove();
  const nodes=inspectPage(root),route=root.dataset.currentRoute||'page';
  const issues=nodes.filter(node=>node.status!=='present');
  const availableRoutes=routeOrder.filter(name=>document.querySelector(`.nav a[data-route="${name}"]:not([hidden])`));
  const helper=document.createElement('aside');helper.className='page-helper';helper.id='globalPageHelper';
  helper.innerHTML=`<section class="page-helper-panel" id="pageHelperPanel" ${previousOpen?'':'hidden'}><div class="page-helper-head"><div><strong><i class="fa-solid fa-diagram-project"></i> Website Blueprint 4</strong><small>Navigate routes, inspect live structure, locate layout problems and highlight the exact element.</small></div><button class="page-helper-close" type="button" aria-label="Close blueprint"><i class="fa-solid fa-xmark"></i></button></div><div class="page-helper-routes">${availableRoutes.map(name=>`<button class="page-helper-route ${name===route?'active':''}" type="button" data-blueprint-route="${name}">${escapeHtml(routeLabels[name]||name)}</button>`).join('')}</div><div class="page-helper-summary"><span class="page-helper-status">${nodes.length} structures</span><span class="page-helper-status ${issues.length?'bad':''}">${issues.length} issue${issues.length===1?'':'s'}</span><span class="page-helper-status">${escapeHtml(routeLabels[route]||route)}</span></div><div class="page-helper-filters"><button class="page-helper-filter active" data-filter="all">All</button><button class="page-helper-filter" data-filter="issues">Issues</button><button class="page-helper-filter" data-filter="layout">Layout</button><button class="page-helper-filter" data-filter="visibility">Hidden</button></div><div class="page-helper-detail" id="pageHelperDetail"></div><div class="page-helper-section-title">Page structure</div><div class="page-helper-tree">${nodes.map((node,index)=>`<button class="page-helper-node ${['missing','legacy'].includes(node.status)?'bad':node.status==='present'?'':'warn'}" type="button" data-helper-index="${index}" data-status="${node.status}" data-category="${node.category||'structure'}"><span><b>${escapeHtml(node.label)}</b><small>${escapeHtml(node.detail)}</small></span><em>${escapeHtml(node.status)}</em></button>`).join('')}</div></section><button class="page-helper-toggle" type="button" aria-expanded="${String(previousOpen)}"><i class="fa-solid fa-sitemap"></i><span>Website blueprint${issues.length?` · ${issues.length}`:''}</span></button>`;
  document.body.appendChild(helper);
  const panel=helper.querySelector('.page-helper-panel'),toggle=helper.querySelector('.page-helper-toggle'),detail=helper.querySelector('#pageHelperDetail');
  const setOpen=open=>{panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open))};
  toggle.addEventListener('click',()=>setOpen(panel.hidden));helper.querySelector('.page-helper-close').addEventListener('click',()=>setOpen(false));
  helper.querySelectorAll('[data-blueprint-route]').forEach(button=>button.addEventListener('click',()=>{sessionStorage.setItem('blueprint.open','1');location.hash=`#${button.dataset.blueprintRoute}`}));
  helper.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{helper.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===button));const filter=button.dataset.filter;helper.querySelectorAll('.page-helper-node').forEach(node=>{node.hidden=filter==='issues'?node.dataset.status==='present':filter==='all'?false:node.dataset.category!==filter})}));
  helper.querySelectorAll('[data-helper-index]').forEach(button=>button.addEventListener('click',()=>{
    clearHelperTargets();const node=nodes[Number(button.dataset.helperIndex)];if(!node)return;button.classList.add('active');
    detail.classList.add('open');detail.innerHTML=`<strong>${escapeHtml(node.label)}</strong><div>${escapeHtml(describeNode(node))}</div>${node.targets?.[0]?`<code>${escapeHtml(selectorPath(node.targets[0]))}</code>`:''}`;
    if(!node.targets.length)return;
    node.targets.forEach(target=>target.classList.add('page-helper-target',...(['missing','legacy','hidden','overflow'].includes(node.status)?['page-helper-target-error']:[])));
    node.targets[0].scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});helperTimer=setTimeout(clearHelperTargets,5000);
  }));
  if(sessionStorage.getItem('blueprint.open')==='1'){sessionStorage.removeItem('blueprint.open');setOpen(true)}
}

function enhanceInput(input){
  if(input.dataset.searchableList)return;const list=document.getElementById(input.getAttribute('list'));if(!list)return;
  const values=[...list.querySelectorAll('option')].map(option=>(option.value||option.textContent||'').trim()).filter(Boolean);if(!values.length)return;
  input.dataset.searchableList=list.id;input.removeAttribute('list');input.setAttribute('autocomplete','off');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');
  const wrap=document.createElement('span');wrap.className='searchable-list-wrap';input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);const menu=document.createElement('div');menu.className='searchable-list-menu';menu.setAttribute('role','listbox');wrap.appendChild(menu);let active=-1;
  const close=()=>{menu.classList.remove('open');input.setAttribute('aria-expanded','false');active=-1};
  const choose=value=>{input.value=value;close();input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.focus()};
  const draw=(showAll=false)=>{const query=showAll?'':input.value.trim().toLowerCase(),matches=values.filter(value=>!query||value.toLowerCase().includes(query));active=-1;menu.innerHTML=matches.length?matches.map(value=>`<button class="searchable-list-option" type="button" role="option" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join(''):'<div class="searchable-list-empty">No matching options</div>';menu.classList.add('open');input.setAttribute('aria-expanded','true');menu.querySelectorAll('.searchable-list-option').forEach(option=>option.addEventListener('mousedown',event=>{event.preventDefault();choose(option.dataset.value)}))};
  const setActive=index=>{const options=[...menu.querySelectorAll('.searchable-list-option')];if(!options.length)return;active=(index+options.length)%options.length;options.forEach((option,i)=>{option.classList.toggle('active',i===active);option.setAttribute('aria-selected',String(i===active))});options[active].scrollIntoView({block:'nearest'})};
  input.addEventListener('focus',()=>draw(true));input.addEventListener('click',()=>draw(true));input.addEventListener('input',()=>draw(false));input.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();if(!menu.classList.contains('open'))draw(true);setActive(active+1)}else if(event.key==='ArrowUp'){event.preventDefault();if(!menu.classList.contains('open'))draw(true);setActive(active-1)}else if(event.key==='Enter'&&active>=0){event.preventDefault();menu.querySelectorAll('.searchable-list-option')[active]?.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))}else if(event.key==='Escape')close()});document.addEventListener('mousedown',event=>{if(!wrap.contains(event.target))close()});
}

export function enhanceSearchableLists(root=document){installStyles();root.querySelectorAll('input[list]:not([data-searchable-list])').forEach(enhanceInput)}
export function watchSharedUI(root=document.querySelector('#content')){
  installStyles();enhanceSearchableLists(document);installPageHelper(root);
  if(!root||observer)return;
  observer=new MutationObserver(()=>{enhanceSearchableLists(root);clearTimeout(observer.helperRefreshTimer);observer.helperRefreshTimer=setTimeout(()=>installPageHelper(root),180)});
  observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','aria-hidden','style']});
}
