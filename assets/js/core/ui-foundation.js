(()=>{
'use strict';
const VERSION=1;
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

const Components={
 pageHeader({title,subtitle='',actions=''}){
  return `<header class="ui-page-header"><div class="ui-page-heading"><h1>${escapeHtml(title)}</h1>${subtitle?`<p>${escapeHtml(subtitle)}</p>`:''}</div>${actions?`<div class="ui-page-actions">${actions}</div>`:''}</header>`;
 },
 card({title='',subtitle='',actions='',body='',className=''}){
  return `<section class="ui-card ${className}">${title||actions?`<header class="ui-card-header"><div><h2>${escapeHtml(title)}</h2>${subtitle?`<p>${escapeHtml(subtitle)}</p>`:''}</div>${actions?`<div class="ui-card-actions">${actions}</div>`:''}</header>`:''}<div class="ui-card-body">${body}</div></section>`;
 },
 toolbar(content){return `<div class="ui-toolbar">${content}</div>`},
 empty(title,description=''){return `<div class="ui-empty"><strong>${escapeHtml(title)}</strong>${description?`<p>${escapeHtml(description)}</p>`:''}</div>`},
 badge(label,tone='neutral'){return `<span class="ui-badge ui-badge-${tone}">${escapeHtml(label)}</span>`}
};

function removeInlineLayout(root){
 qa('[style]',root).forEach(element=>{
  const style=element.style;
  ['margin','marginTop','marginRight','marginBottom','marginLeft','padding','paddingTop','paddingRight','paddingBottom','paddingLeft','gap','maxWidth'].forEach(property=>{
   if(style[property])style.removeProperty(property.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`));
  });
 });
}

function normalizePage(view){
 const content=q('#content');
 if(!content)return;
 content.dataset.page=view;
 content.classList.add('ui-page');

 const legacyHead=q(':scope > .page-head',content);
 if(legacyHead){
  legacyHead.classList.add('ui-page-header');
  const heading=q(':scope > div:first-child',legacyHead);
  heading?.classList.add('ui-page-heading');
  q(':scope > .actions',legacyHead)?.classList.add('ui-page-actions');
 }

 qa(':scope > .card',content).forEach(card=>card.classList.add('ui-card'));
 qa('.card > .page-head, .card > .card-head, .card > .card-header',content).forEach(header=>header.classList.add('ui-card-header'));
 qa('.card > .table-wrap, .ui-card > .table-wrap',content).forEach(wrapper=>wrapper.classList.add('ui-table-wrap'));
 qa('.card > .actions:first-child, .card > .bills-toolbar, .card > .toolbar',content).forEach(toolbar=>toolbar.classList.add('ui-toolbar'));
 qa('table',content).forEach(table=>table.classList.add('ui-table'));
 qa('form',content).forEach(form=>form.classList.add('ui-form'));
 qa('.form-grid',content).forEach(grid=>grid.classList.add('ui-form-grid'));
 qa('.metrics',content).forEach(grid=>grid.classList.add('ui-metric-grid'));
 qa('.metric',content).forEach(metric=>metric.classList.add('ui-metric'));
 qa('.pager',content).forEach(pager=>pager.classList.add('ui-pagination'));
 qa('.empty',content).forEach(empty=>empty.classList.add('ui-empty'));
 removeInlineLayout(content);
}

function rebuildNavigation(){
 const nav=q('.nav');
 if(!nav||nav.dataset.foundation==='1')return;
 const groups=[
  ['Overview',[['Dashboard','dashboard','fa-table-cells-large']]],
  ['Procurement',[['Bills','bills','fa-file-invoice'],['Price Intelligence','rates','fa-chart-line'],['Products','products','fa-box'],['Vendors','vendors','fa-building']]],
  ['Analytics',[['Reports','reports','fa-chart-pie']]],
  ['Administration',[['Settings','settings','fa-gear'],['Admin & users','admin','fa-users-gear']]]
 ];
 nav.innerHTML=groups.map(([group,items])=>`<div class="ui-nav-group"><div class="ui-nav-label">${group}</div>${items.map(([label,view,icon])=>`<a href="#${view}" data-view="${view}"><i class="fa-solid ${icon}" aria-hidden="true"></i><span>${label}</span></a>`).join('')}</div>`).join('');
 nav.dataset.foundation='1';
}

function syncTopbar(view){
 const meta={
  dashboard:['Dashboard','Overview of procurement activity'],
  bills:['Bills','Manage supplier invoices and payments'],
  new:['New bill','Record a supplier purchase'],
  rates:['Price Intelligence','Compare product and supplier rates'],
  products:['Products','Manage the product catalogue'],
  vendors:['Vendors','Manage supplier records and corrections'],
  reports:['Reports','Analyse procurement performance'],
  settings:['Settings','Configure the procurement workspace'],
  admin:['Admin & users','Manage users, roles, and access']
 }[view]||['Procurement','White Saffron ERP'];
 const title=q('#topTitle');
 if(!title)return;
 let wrapper=title.closest('.ui-topbar-heading');
 if(!wrapper){
  wrapper=document.createElement('div');
  wrapper.className='ui-topbar-heading';
  title.parentNode.insertBefore(wrapper,title);
  wrapper.appendChild(title);
  const subtitle=document.createElement('span');
  subtitle.id='topSubtitle';
  wrapper.appendChild(subtitle);
 }
 title.textContent=meta[0];
 q('#topSubtitle').textContent=meta[1];
}

function afterRender(view){
 rebuildNavigation();
 syncTopbar(view);
 normalizePage(view);
 qa('.nav [data-view]').forEach(link=>link.classList.toggle('active',link.dataset.view===view));
}

window.UI={version:VERSION,Components,afterRender,normalizePage,rebuildNavigation,syncTopbar};
document.addEventListener('DOMContentLoaded',()=>{rebuildNavigation();syncTopbar((location.hash||'#dashboard').slice(1))},{once:true});
})();