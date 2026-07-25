(()=>{
'use strict';
const VERSION=2;
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

const Components={
 pageHeader({title,subtitle='',actions=''}){return `<header class="ui-page-header"><div class="ui-page-heading"><h1>${escapeHtml(title)}</h1>${subtitle?`<p>${escapeHtml(subtitle)}</p>`:''}</div>${actions?`<div class="ui-page-actions">${actions}</div>`:''}</header>`},
 card({title='',subtitle='',actions='',body='',className=''}){return `<section class="ui-card ${className}">${title||actions?`<header class="ui-card-header"><div><h2>${escapeHtml(title)}</h2>${subtitle?`<p>${escapeHtml(subtitle)}</p>`:''}</div>${actions?`<div class="ui-card-actions">${actions}</div>`:''}</header>`:''}<div class="ui-card-body">${body}</div></section>`},
 toolbar(content){return `<div class="ui-toolbar">${content}</div>`},
 empty(title,description=''){return `<div class="ui-empty"><strong>${escapeHtml(title)}</strong>${description?`<p>${escapeHtml(description)}</p>`:''}</div>`},
 badge(label,tone='neutral'){return `<span class="ui-badge ui-badge-${tone}">${escapeHtml(label)}</span>`}
};

function installFoundationStyles(){
 if(q('#uiFoundationRuntimeStyles'))return;
 const style=document.createElement('style');
 style.id='uiFoundationRuntimeStyles';
 style.textContent=`
 #content[data-page="admin"]{gap:20px!important}
 .admin-overview{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(360px,.6fr);gap:20px;padding:24px 25px;background:#fff;border:1px solid var(--line);border-radius:var(--radius-card);box-shadow:var(--shadow-sm);overflow:hidden}
 .admin-overview-copy{display:grid;align-content:center;gap:6px;min-width:0}.admin-overview-copy>span:first-child{color:var(--pink-dark);font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.admin-overview-copy h2,.admin-overview-copy strong{color:var(--header);font-size:24px;line-height:1.2}.admin-overview-copy p{color:var(--muted);font-size:13px}
 .admin-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:12px;overflow:hidden}.admin-summary>div{display:grid;align-content:center;gap:4px;padding:18px;background:var(--surface-soft)}.admin-summary span{color:var(--muted);font-size:11px;font-weight:700}.admin-summary strong{color:var(--header);font-family:var(--font-primary);font-size:24px;line-height:1.1}
 .admin-member-grid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px!important;margin:0!important}
 .admin-member-card{display:flex!important;flex-direction:column;gap:16px!important;min-width:0;padding:20px!important;margin:0!important;background:#fff;border:1px solid var(--line);border-radius:var(--radius-card);box-shadow:var(--shadow-sm);overflow:hidden}
 .admin-member-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-md)}
 .admin-member-head{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;align-items:center}.admin-member-avatar{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,var(--gold),var(--pink));color:var(--header);font-weight:900}.admin-member-identity{display:grid;gap:2px;min-width:0}.admin-member-identity strong{color:var(--header);font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.admin-member-identity span{color:var(--muted);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.admin-online{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;background:var(--success-soft);color:var(--success);font-size:11px;font-weight:800}.admin-online:before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}
 .admin-member-fields{display:grid;gap:12px}.admin-member-card label{gap:6px}.admin-member-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:auto;padding-top:2px}.admin-member-footer small{color:var(--muted);font-size:11px;line-height:1.4}.admin-member-footer .btn{flex:0 0 auto}
 #content[data-page="admin"]>.ui-page-header+*+*{min-width:0}
 @media(max-width:1000px){.admin-overview{grid-template-columns:1fr}.admin-member-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
 @media(max-width:720px){.admin-overview{padding:18px}.admin-summary{grid-template-columns:1fr}.admin-member-grid{grid-template-columns:1fr}.admin-member-card{padding:18px!important}.admin-member-footer{align-items:stretch;flex-direction:column}.admin-member-footer .btn{width:100%}}
 `;
 document.head.appendChild(style);
}

function removeInlineLayout(root){
 qa('[style]',root).forEach(element=>{const style=element.style;['margin','marginTop','marginRight','marginBottom','marginLeft','padding','paddingTop','paddingRight','paddingBottom','paddingLeft','gap','maxWidth'].forEach(property=>{if(style[property])style.removeProperty(property.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`))})});
}

function normalizeAdmin(content){
 const direct=[...content.children].filter(el=>!el.classList.contains('ui-page-header'));
 const overview=direct.find(el=>/Workspace access|Manage your procurement team/i.test(el.textContent||''));
 if(overview){
  overview.classList.add('admin-overview');
  const children=[...overview.children];
  const copy=children.find(el=>/Workspace access|Manage your procurement team/i.test(el.textContent||''))||overview.firstElementChild;
  if(copy)copy.classList.add('admin-overview-copy');
  let summary=children.find(el=>el!==copy&&el.children.length>=2);
  if(!summary){
   const text=(overview.textContent||'').match(/(\d+)\s*Members.*?(\d+)\s*Online now.*?(\d+)\s*Administrators/is);
   if(text){summary=document.createElement('div');summary.innerHTML=`<div><span>Members</span><strong>${text[1]}</strong></div><div><span>Online now</span><strong>${text[2]}</strong></div><div><span>Administrators</span><strong>${text[3]}</strong></div>`;overview.appendChild(summary)}
  }
  summary?.classList.add('admin-summary');
 }
 const candidates=qa('select',content).map(select=>select.closest('article,.card,section,div')).filter(Boolean);
 const cards=[...new Set(candidates)].filter(el=>el.querySelectorAll('select').length>=2&&el.querySelector('button'));
 if(cards.length){
  const grid=cards[0].parentElement;
  grid?.classList.add('admin-member-grid');
  cards.forEach(card=>{
   card.classList.add('admin-member-card');
   const raw=[...card.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim()).map(node=>node.textContent.trim());
   const strongs=qa(':scope > strong',card);
   const email=[...card.querySelectorAll('*')].find(el=>/@/.test(el.textContent||'')&&el.children.length===0);
   let name=strongs[0]?.textContent?.trim()||raw.find(v=>!/@/.test(v)&&v.length>1)||'Team member';
   const mail=email?.textContent?.trim()||raw.find(v=>/@/.test(v))||'';
   if(!q(':scope > .admin-member-head',card)){
    const head=document.createElement('div');head.className='admin-member-head';
    head.innerHTML=`<div class="admin-member-avatar">${escapeHtml(name.charAt(0).toUpperCase())}</div><div class="admin-member-identity"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(mail)}</span></div><span class="admin-online">Online</span>`;
    card.insertBefore(head,card.firstChild);
   }
   const labels=qa(':scope > label, :scope > div > label',card);
   if(labels.length){let fields=q(':scope > .admin-member-fields',card);if(!fields){fields=document.createElement('div');fields.className='admin-member-fields';labels[0].parentNode.insertBefore(fields,labels[0])}labels.forEach(label=>fields.appendChild(label))}
   const button=q('button',card);if(button&&!button.closest('.admin-member-footer')){const footer=document.createElement('div');footer.className='admin-member-footer';const activity=[...card.childNodes].find(node=>/Last page:/i.test(node.textContent||''));const small=document.createElement('small');small.textContent=activity?.textContent?.trim()||'Recent activity available';footer.append(small,button);card.appendChild(footer);if(activity&&activity.nodeType===Node.TEXT_NODE)activity.remove()}
  });
 }
}

function normalizePage(view){
 const content=q('#content');if(!content)return;content.dataset.page=view;content.classList.add('ui-page');
 const legacyHead=q(':scope > .page-head',content);if(legacyHead){legacyHead.classList.add('ui-page-header');const heading=q(':scope > div:first-child',legacyHead);heading?.classList.add('ui-page-heading');q(':scope > .actions',legacyHead)?.classList.add('ui-page-actions')}
 qa(':scope > .card',content).forEach(card=>card.classList.add('ui-card'));qa('.card > .page-head, .card > .card-head, .card > .card-header',content).forEach(header=>header.classList.add('ui-card-header'));qa('.card > .table-wrap, .ui-card > .table-wrap',content).forEach(wrapper=>wrapper.classList.add('ui-table-wrap'));qa('.card > .actions:first-child, .card > .bills-toolbar, .card > .toolbar',content).forEach(toolbar=>toolbar.classList.add('ui-toolbar'));qa('table',content).forEach(table=>table.classList.add('ui-table'));qa('form',content).forEach(form=>form.classList.add('ui-form'));qa('.form-grid',content).forEach(grid=>grid.classList.add('ui-form-grid'));qa('.metrics',content).forEach(grid=>grid.classList.add('ui-metric-grid'));qa('.metric',content).forEach(metric=>metric.classList.add('ui-metric'));qa('.pager',content).forEach(pager=>pager.classList.add('ui-pagination'));qa('.empty',content).forEach(empty=>empty.classList.add('ui-empty'));
 if(view==='admin')normalizeAdmin(content);
 removeInlineLayout(content);
}

function rebuildNavigation(){const nav=q('.nav');if(!nav||nav.dataset.foundation==='1')return;const groups=[['Overview',[['Dashboard','dashboard','fa-table-cells-large']]],['Procurement',[['Bills','bills','fa-file-invoice'],['Price Intelligence','rates','fa-chart-line'],['Products','products','fa-box'],['Vendors','vendors','fa-building']]],['Analytics',[['Reports','reports','fa-chart-pie']]],['Administration',[['Settings','settings','fa-gear'],['Admin & users','admin','fa-users-gear']]]];nav.innerHTML=groups.map(([group,items])=>`<div class="ui-nav-group"><div class="ui-nav-label">${group}</div>${items.map(([label,view,icon])=>`<a href="#${view}" data-view="${view}"><i class="fa-solid ${icon}" aria-hidden="true"></i><span>${label}</span></a>`).join('')}</div>`).join('');nav.dataset.foundation='1'}
function syncTopbar(view){const meta={dashboard:['Dashboard','Overview of procurement activity'],bills:['Bills','Manage supplier invoices and payments'],new:['New bill','Record a supplier purchase'],rates:['Price Intelligence','Compare product and supplier rates'],products:['Products','Manage the product catalogue'],vendors:['Vendors','Manage supplier records and corrections'],reports:['Reports','Analyse procurement performance'],settings:['Settings','Configure the procurement workspace'],admin:['Admin & users','Manage users, roles, and access']}[view]||['Procurement','White Saffron ERP'];const title=q('#topTitle');if(!title)return;let wrapper=title.closest('.ui-topbar-heading');if(!wrapper){wrapper=document.createElement('div');wrapper.className='ui-topbar-heading';title.parentNode.insertBefore(wrapper,title);wrapper.appendChild(title);const subtitle=document.createElement('span');subtitle.id='topSubtitle';wrapper.appendChild(subtitle)}title.textContent=meta[0];q('#topSubtitle').textContent=meta[1]}
function afterRender(view){installFoundationStyles();rebuildNavigation();syncTopbar(view);normalizePage(view);qa('.nav [data-view]').forEach(link=>link.classList.toggle('active',link.dataset.view===view))}
window.UI={version:VERSION,Components,afterRender,normalizePage,rebuildNavigation,syncTopbar};
document.addEventListener('DOMContentLoaded',()=>{installFoundationStyles();rebuildNavigation();syncTopbar((location.hash||'#dashboard').slice(1))},{once:true});
})();