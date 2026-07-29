import {escapeHtml} from './store.js';

const $=selector=>document.querySelector(selector);
let observer=null;
let helperTimer=null;

const blueprintAreas=[
  {label:'Page Header',selector:'.page-head,.entry-hero',required:true},
  {label:'Filter / Toolbar',selector:'.dashboard-commandbar,.bills-toolbar,.date-toolbar,.report-toolbar,.toolbar,.cost-workspace,.px-toolbar,.pm-top'},
  {label:'KPI Summary',selector:'.kpi-summary'},
  {label:'KPI Cards',selector:'.kpi-card'},
  {label:'KPI Icon',selector:'.kpi-card__icon'},
  {label:'KPI Content',selector:'.kpi-card__content'},
  {label:'KPI Label',selector:'.kpi-card__label'},
  {label:'KPI Value',selector:'.kpi-card__value'},
  {label:'KPI Meta',selector:'.kpi-card__meta'},
  {label:'Primary Content',selector:'.dashboard-primary-grid,.entry-main,.cost-focus,.cost-compare,.card,.vendor-grid,.px-grid,.admin-detail-grid',required:true},
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
  {label:'Legacy hidden helper text',selector:'[data-development-note],.development-note,.tutorial-note'}
];

function installStyles(){
  if($('#searchableListStyles'))return;
  const style=document.createElement('style');
  style.id='searchableListStyles';
  style.textContent=`
    .searchable-list-wrap{position:relative;display:block}
    .searchable-list-menu{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:1200;display:none;max-height:280px;overflow:auto;padding:6px;border:1px solid #d7e0e8;border-radius:12px;background:#fff;box-shadow:0 14px 36px rgba(15,35,61,.18)}
    .searchable-list-menu.open{display:block}.searchable-list-option{display:block;width:100%;padding:10px 12px;border:0;border-radius:8px;background:transparent;color:#162f52;text-align:left;font:600 13px/1.35 Inter,system-ui,sans-serif;cursor:pointer}.searchable-list-option:hover,.searchable-list-option.active{background:#eef4fb;color:#102b4e}.searchable-list-empty{padding:12px;color:#6f7f94;font-size:12px;text-align:center}
    .page-helper{position:fixed;right:22px;bottom:22px;z-index:3500;display:grid;justify-items:end;gap:9px;font-family:Inter,system-ui,sans-serif}.page-helper-toggle{min-height:42px;display:flex;align-items:center;gap:8px;padding:0 14px;border:1px solid #e7b844;border-radius:999px;background:#fff8e5;color:#694700;box-shadow:0 9px 28px rgba(15,42,69,.18);font-weight:800;cursor:pointer}.page-helper-panel{width:min(460px,calc(100vw - 28px));max-height:min(650px,78vh);overflow:auto;padding:14px;border:1px solid #e7c86f;border-radius:16px;background:#fffdf7;box-shadow:0 18px 48px rgba(15,42,69,.22)}.page-helper-panel[hidden]{display:none}.page-helper-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:11px}.page-helper-head strong,.page-helper-head small{display:block}.page-helper-head strong{color:#142f54;font-size:13px}.page-helper-head small{margin-top:3px;color:#6c7889;font-size:10px;line-height:1.4}.page-helper-close{width:30px;height:30px;padding:0;border:0;border-radius:8px;background:transparent;color:#68768a;cursor:pointer}.page-helper-close:hover{background:#f5ead0;color:#142f54}.page-helper-summary{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}.page-helper-status{padding:5px 8px;border-radius:999px;background:#eef4fb;color:#173d70;font:800 10px/1 Inter,system-ui,sans-serif}.page-helper-status.warn{background:#fff0d8;color:#7a4800}.page-helper-status.bad{background:#ffe5e5;color:#8d1d1d}.page-helper-tree{display:grid;gap:6px}.page-helper-node{width:100%;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid #e4e9ef;border-radius:10px;background:#fff;color:#243b5a;text-align:left;cursor:pointer}.page-helper-node:hover,.page-helper-node.active{border-color:#b8c8dc;background:#f5f8fc}.page-helper-node.warn{border-color:#efc477;background:#fff9ed}.page-helper-node.bad{border-color:#e5a4a4;background:#fff4f4}.page-helper-node small{display:block;margin-top:3px;color:#718096;font-size:10px}.page-helper-node b{font-size:11px}.page-helper-node em{font-style:normal;font:800 9px/1 Inter,system-ui,sans-serif;text-transform:uppercase}.page-helper-section-title{margin:12px 0 6px;color:#6b7889;font:800 9px/1 Inter,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.08em}.page-helper-target{position:relative;z-index:1;outline:3px solid #f0ad20!important;outline-offset:4px!important;box-shadow:0 0 0 7px rgba(240,173,32,.18)!important;animation:pageHelperPulse .9s ease 2}.page-helper-target-error{outline-color:#d94141!important;box-shadow:0 0 0 7px rgba(217,65,65,.17)!important}@keyframes pageHelperPulse{0%,100%{outline-color:#f0ad20}50%{outline-color:#173d70}}@media(max-width:700px){.page-helper{right:12px;bottom:12px}.page-helper-toggle{min-height:40px}.page-helper-panel{max-height:70vh}}
  `;
  document.head.appendChild(style);
}

function clearHelperTargets(){
  document.querySelectorAll('.page-helper-target,.page-helper-target-error').forEach(element=>element.classList.remove('page-helper-target','page-helper-target-error'));
  document.querySelectorAll('.page-helper-node.active').forEach(element=>element.classList.remove('active'));
  if(helperTimer){clearTimeout(helperTimer);helperTimer=null}
}

function isHidden(element){
  const style=getComputedStyle(element);
  return element.hidden||style.display==='none'||style.visibility==='hidden'||style.opacity==='0';
}

function hasMeaningfulContent(element){
  return Boolean(element.querySelector('input,select,textarea,button,a,table,canvas,svg,img')||element.textContent.trim());
}

function inspectPage(root){
  const nodes=[];
  blueprintAreas.forEach(area=>{
    const targets=[...root.querySelectorAll(area.selector)].filter(element=>!element.closest('.modal'));
    if(targets.length){
      const hidden=targets.filter(isHidden).length;
      const empty=targets.filter(element=>!hasMeaningfulContent(element)).length;
      nodes.push({...area,targets,status:hidden===targets.length?'hidden':empty===targets.length?'empty':'present',detail:`${targets.length} found${hidden?` · ${hidden} hidden`:''}${empty?` · ${empty} empty`:''}`});
    }else if(area.required){
      nodes.push({...area,targets:[],status:'missing',detail:'Required structure not found'});
    }
  });

  legacyAreas.forEach(area=>{
    const targets=[...root.querySelectorAll(area.selector)].filter(element=>!element.closest('.modal'));
    if(targets.length)nodes.push({...area,targets,status:'legacy',detail:`${targets.length} old structure${targets.length===1?'':'s'} found`});
  });

  root.querySelectorAll('.kpi-summary').forEach(summary=>{
    if(!summary.querySelector('.kpi-card'))nodes.push({label:'KPI Summary structure',targets:[summary],status:'missing',detail:'Summary exists but contains no .kpi-card'});
  });

  root.querySelectorAll('.kpi-card').forEach(card=>{
    const required=[['icon','.kpi-card__icon'],['content','.kpi-card__content'],['label','.kpi-card__label'],['value','.kpi-card__value']];
    const missing=required.filter(([,selector])=>!card.querySelector(selector)).map(([name])=>name);
    if(missing.length)nodes.push({label:'Incomplete KPI card',targets:[card],status:'missing',detail:`Missing ${missing.join(', ')}`});
  });

  [...root.querySelectorAll('section,article,aside,div')].filter(element=>!element.closest('.page-helper,.modal')).forEach(element=>{
    if(isHidden(element)&&hasMeaningfulContent(element)&&!element.matches('[aria-hidden="true"],.sr-only,.visually-hidden')){
      nodes.push({label:'Hidden content',targets:[element],status:'hidden',detail:'Contains content but is not visible'});
    }
  });

  return nodes;
}

function installPageHelper(root=document.querySelector('#content')){
  if(!root)return;
  $('#globalPageHelper')?.remove();
  const nodes=inspectPage(root);
  if(!nodes.length)return;
  const route=root.dataset.currentRoute||'page';
  const issues=nodes.filter(node=>['missing','legacy','hidden','empty'].includes(node.status));
  const helper=document.createElement('aside');
  helper.className='page-helper';
  helper.id='globalPageHelper';
  helper.innerHTML=`<section class="page-helper-panel" id="pageHelperPanel" hidden><div class="page-helper-head"><div><strong><i class="fa-solid fa-diagram-project"></i> ${escapeHtml(route.replace(/-/g,' '))} website blueprint</strong><small>Live DOM structure for users, developers, and AI. It shows what exists, what is old, what is hidden, and what is missing.</small></div><button class="page-helper-close" type="button" aria-label="Close blueprint"><i class="fa-solid fa-xmark"></i></button></div><div class="page-helper-summary"><span class="page-helper-status">${nodes.length} structures</span><span class="page-helper-status ${issues.length?'bad':''}">${issues.length} issue${issues.length===1?'':'s'}</span></div><div class="page-helper-section-title">Page structure</div><div class="page-helper-tree">${nodes.map((node,index)=>`<button class="page-helper-node ${['missing','legacy'].includes(node.status)?'bad':node.status==='present'?'':'warn'}" type="button" data-helper-index="${index}"><span><b>${escapeHtml(node.label)}</b><small>${escapeHtml(node.detail)}</small></span><em>${escapeHtml(node.status)}</em></button>`).join('')}</div></section><button class="page-helper-toggle" type="button" aria-expanded="false"><i class="fa-solid fa-sitemap"></i><span>Website blueprint${issues.length?` · ${issues.length}`:''}</span></button>`;
  document.body.appendChild(helper);
  const panel=helper.querySelector('.page-helper-panel'),toggle=helper.querySelector('.page-helper-toggle');
  const setOpen=open=>{panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open))};
  toggle.addEventListener('click',()=>setOpen(panel.hidden));
  helper.querySelector('.page-helper-close').addEventListener('click',()=>setOpen(false));
  helper.querySelectorAll('[data-helper-index]').forEach(button=>button.addEventListener('click',()=>{
    clearHelperTargets();
    const node=nodes[Number(button.dataset.helperIndex)];
    if(!node||!node.targets.length)return;
    button.classList.add('active');
    node.targets.forEach(target=>target.classList.add('page-helper-target',...(['missing','legacy'].includes(node.status)?['page-helper-target-error']:[])));
    node.targets[0]?.scrollIntoView({behavior:'smooth',block:'center'});
    helperTimer=setTimeout(clearHelperTargets,4200);
  }));
}

function enhanceInput(input){
  if(input.dataset.searchableList)return;
  const list=document.getElementById(input.getAttribute('list'));
  if(!list)return;
  const values=[...list.querySelectorAll('option')].map(option=>option.value||option.textContent||'').map(value=>value.trim()).filter(Boolean);
  if(!values.length)return;
  input.dataset.searchableList=list.id;input.removeAttribute('list');input.setAttribute('autocomplete','off');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');
  const wrap=document.createElement('span');wrap.className='searchable-list-wrap';input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
  const menu=document.createElement('div');menu.className='searchable-list-menu';menu.setAttribute('role','listbox');wrap.appendChild(menu);
  let active=-1;
  const close=()=>{menu.classList.remove('open');input.setAttribute('aria-expanded','false');active=-1};
  const choose=value=>{input.value=value;close();input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.focus()};
  const draw=(showAll=false)=>{const query=showAll?'':input.value.trim().toLowerCase(),matches=values.filter(value=>!query||value.toLowerCase().includes(query));active=-1;menu.innerHTML=matches.length?matches.map(value=>`<button class="searchable-list-option" type="button" role="option" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join(''):'<div class="searchable-list-empty">No matching options</div>';menu.classList.add('open');input.setAttribute('aria-expanded','true');menu.querySelectorAll('.searchable-list-option').forEach(option=>option.addEventListener('mousedown',event=>{event.preventDefault();choose(option.dataset.value)}))};
  const setActive=index=>{const options=[...menu.querySelectorAll('.searchable-list-option')];if(!options.length)return;active=(index+options.length)%options.length;options.forEach((option,i)=>{option.classList.toggle('active',i===active);option.setAttribute('aria-selected',String(i===active))});options[active].scrollIntoView({block:'nearest'})};
  input.addEventListener('focus',()=>draw(true));input.addEventListener('click',()=>draw(true));input.addEventListener('input',()=>draw(false));input.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();if(!menu.classList.contains('open'))draw(true);setActive(active+1)}else if(event.key==='ArrowUp'){event.preventDefault();if(!menu.classList.contains('open'))draw(true);setActive(active-1)}else if(event.key==='Enter'&&active>=0){event.preventDefault();menu.querySelectorAll('.searchable-list-option')[active]?.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))}else if(event.key==='Escape')close()});document.addEventListener('mousedown',event=>{if(!wrap.contains(event.target))close()});
}

export function enhanceSearchableLists(root=document){installStyles();root.querySelectorAll('input[list]:not([data-searchable-list])').forEach(enhanceInput)}

export function watchSharedUI(root=document.querySelector('#content')){
  enhanceSearchableLists(document);installPageHelper(root);
  if(!root||observer)return;
  observer=new MutationObserver(()=>{enhanceSearchableLists(root);clearTimeout(observer.helperRefreshTimer);observer.helperRefreshTimer=setTimeout(()=>installPageHelper(root),120)});
  observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','aria-hidden']});
}
