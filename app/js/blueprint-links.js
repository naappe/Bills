const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function accessibleName(element){
  return (element.getAttribute('aria-label')||element.getAttribute('title')||element.textContent||'').replace(/\s+/g,' ').trim();
}

function routeTarget(element){
  const dataRoute=element.dataset?.route;
  if(dataRoute)return String(dataRoute).replace(/^#/,'').toLowerCase();
  const href=element.getAttribute?.('href')||'';
  if(href.startsWith('#'))return href.slice(1).toLowerCase();
  return '';
}

function collectAudit(){
  const config=window.__BILLS_ROUTE_CONFIG__||{};
  const defined=Object.keys(config);
  const role=(document.querySelector('#roleLabel')?.textContent||'').trim().toLowerCase();
  const interactive=[...document.querySelectorAll('a[href],button[data-route],[role="link"][data-route]')]
    .filter(element=>!element.closest('.page-helper'));
  const routeRefs=interactive.map(element=>({element,target:routeTarget(element),label:accessibleName(element)})).filter(item=>item.target);
  const broken=routeRefs.filter(item=>!defined.includes(item.target));
  const inaccessible=routeRefs.filter(item=>config[item.target]&&!config[item.target].roles.includes(role)&&!item.element.hidden);
  const unlabeled=interactive.filter(element=>!accessibleName(element));
  const emptyHref=interactive.filter(element=>element.tagName==='A'&&['','#'].includes((element.getAttribute('href')||'').trim()));
  const unsafeExternal=interactive.filter(element=>{
    if(element.tagName!=='A')return false;
    const href=element.getAttribute('href')||'';
    if(!/^https?:\/\//i.test(href))return false;
    if(element.getAttribute('target')!=='_blank')return false;
    const rel=(element.getAttribute('rel')||'').toLowerCase();
    return !rel.includes('noopener')||!rel.includes('noreferrer');
  });
  const ids=[...document.querySelectorAll('[id]')].map(element=>element.id).filter(Boolean);
  const duplicateIds=[...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];
  const grouped=new Map();
  routeRefs.forEach(item=>{if(!grouped.has(item.target))grouped.set(item.target,[]);grouped.get(item.target).push(item)});
  const duplicateRoutes=[...grouped.entries()].filter(([,items])=>items.length>1).map(([target,items])=>({target,items,expected:items.every(item=>item.element.closest('#desktopNav,#mobileNav')||item.element.dataset.route)}));
  const reachable=defined.filter(name=>document.querySelector(`[data-route="${CSS.escape(name)}"],a[href="#${CSS.escape(name)}"]`)||location.hash===`#${name}`);
  const hiddenByRole=defined.filter(name=>!config[name].roles.includes(role));
  const issues=[...broken,...inaccessible,...unlabeled,...emptyHref,...unsafeExternal,...duplicateIds];
  return {config,defined,role,interactive,routeRefs,broken,inaccessible,unlabeled,emptyHref,unsafeExternal,duplicateIds,duplicateRoutes,reachable,hiddenByRole,issueCount:issues.length};
}

function row(label,value,tone=''){
  return `<div class="blueprint-link-stat ${tone}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function issueList(title,items,formatter){
  if(!items.length)return'';
  return `<div class="blueprint-link-group"><h4>${escapeHtml(title)}</h4>${items.map(formatter).join('')}</div>`;
}

function renderPanel(panel){
  if(!panel||panel.querySelector('#blueprintLinksRoutes'))return;
  const audit=collectAudit();
  const section=document.createElement('section');
  section.id='blueprintLinksRoutes';
  section.className='blueprint-links-section';
  section.innerHTML=`
    <div class="page-helper-section-title">Links &amp; Routes</div>
    <div class="blueprint-link-grid">
      ${row('Defined routes',audit.defined.length)}
      ${row('Reachable routes',audit.reachable.length)}
      ${row('Broken targets',audit.broken.length,audit.broken.length?'bad':'good')}
      ${row('Inaccessible links',audit.inaccessible.length,audit.inaccessible.length?'bad':'good')}
      ${row('Expected duplicate sets',audit.duplicateRoutes.filter(item=>item.expected).length)}
      ${row('Duplicate IDs',audit.duplicateIds.length,audit.duplicateIds.length?'bad':'good')}
      ${row('Unlabelled links',audit.unlabeled.length,audit.unlabeled.length?'bad':'good')}
      ${row('Hidden by role',audit.hiddenByRole.length)}
    </div>
    <details class="blueprint-link-details" open>
      <summary>Canonical route registry</summary>
      <div class="blueprint-route-list">${audit.defined.map(name=>`<div><code>#${escapeHtml(name)}</code><span>${escapeHtml(audit.config[name].title)}</span><small>${escapeHtml(audit.config[name].roles.join(', '))}</small></div>`).join('')}</div>
    </details>
    ${issueList('Broken route targets',audit.broken,item=>`<button type="button" data-link-locate="${escapeHtml(item.target)}"><strong>${escapeHtml(item.label||'Unlabelled control')}</strong><span>#${escapeHtml(item.target)} is not defined</span></button>`)}
    ${issueList('Role permission mismatches',audit.inaccessible,item=>`<button type="button" data-link-locate="${escapeHtml(item.target)}"><strong>${escapeHtml(item.label||item.target)}</strong><span>Visible to ${escapeHtml(audit.role)} but route is restricted</span></button>`)}
    ${issueList('Duplicate IDs',audit.duplicateIds,id=>`<button type="button" data-id-locate="${escapeHtml(id)}"><strong>#${escapeHtml(id)}</strong><span>More than one element uses this ID</span></button>`)}
    ${issueList('Expected duplicate navigation',audit.duplicateRoutes.filter(item=>item.expected),item=>`<div class="blueprint-link-note"><strong>#${escapeHtml(item.target)}</strong><span>${item.items.length} controls use the same canonical route; desktop/mobile duplication is expected.</span></div>`)}
    ${audit.issueCount===0?'<div class="blueprint-link-clean"><i class="fa-solid fa-circle-check"></i><strong>Link and route audit passed</strong><span>No broken targets, permission leaks, duplicate IDs or unlabelled controls were found in the live DOM.</span></div>':''}
  `;
  panel.appendChild(section);
  section.querySelectorAll('[data-link-locate]').forEach(button=>button.addEventListener('click',()=>{
    const target=button.dataset.linkLocate;
    const element=document.querySelector(`[data-route="${CSS.escape(target)}"],a[href="#${CSS.escape(target)}"]`);
    element?.scrollIntoView({behavior:'smooth',block:'center'});
    element?.classList.add('page-helper-target-error');
    setTimeout(()=>element?.classList.remove('page-helper-target-error'),3500);
  }));
  section.querySelectorAll('[data-id-locate]').forEach(button=>button.addEventListener('click',()=>{
    const elements=[...document.querySelectorAll(`#${CSS.escape(button.dataset.idLocate)}`)];
    elements.forEach(element=>element.classList.add('page-helper-target-error'));
    elements[0]?.scrollIntoView({behavior:'smooth',block:'center'});
    setTimeout(()=>elements.forEach(element=>element.classList.remove('page-helper-target-error')),3500);
  }));
}

function installStyles(){
  if(document.querySelector('#blueprintLinkAuditStyles'))return;
  const style=document.createElement('style');
  style.id='blueprintLinkAuditStyles';
  style.textContent=`
    .blueprint-links-section{margin-top:12px;padding-top:2px;border-top:1px solid #eadcae}.blueprint-link-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.blueprint-link-stat{padding:8px;border:1px solid #e2e8f0;border-radius:9px;background:#fff}.blueprint-link-stat span{display:block;color:#718096;font-size:9px;text-transform:uppercase}.blueprint-link-stat strong{display:block;margin-top:4px;color:#173d70;font-size:14px}.blueprint-link-stat.good strong{color:#16734a}.blueprint-link-stat.bad{border-color:#efb0b0;background:#fff6f6}.blueprint-link-stat.bad strong{color:#b42318}.blueprint-link-details{margin-top:8px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}.blueprint-link-details summary{padding:9px 10px;cursor:pointer;color:#34475f;font-size:10px;font-weight:800}.blueprint-route-list{display:grid;gap:5px;padding:0 9px 9px}.blueprint-route-list>div{display:grid;grid-template-columns:115px 1fr auto;gap:8px;align-items:center;padding:6px;border-radius:7px;background:#f7f9fc;font-size:9px}.blueprint-route-list code{color:#2449d8}.blueprint-route-list small{color:#718096}.blueprint-link-group{display:grid;gap:5px;margin-top:9px}.blueprint-link-group h4{margin:0;color:#6b7889;font-size:9px;text-transform:uppercase}.blueprint-link-group button,.blueprint-link-note{display:grid;gap:3px;width:100%;padding:8px;border:1px solid #e3e8ef;border-radius:9px;background:#fff;text-align:left;color:#34475f}.blueprint-link-group button{cursor:pointer}.blueprint-link-group button:hover{border-color:#e5a4a4;background:#fff6f6}.blueprint-link-group strong,.blueprint-link-note strong{font-size:10px}.blueprint-link-group span,.blueprint-link-note span{font-size:9px;color:#718096}.blueprint-link-clean{display:grid;grid-template-columns:auto 1fr;gap:2px 8px;align-items:center;margin-top:10px;padding:10px;border:1px solid #bfe4cf;border-radius:10px;background:#f0fbf5;color:#16734a}.blueprint-link-clean i{grid-row:1/3}.blueprint-link-clean strong{font-size:10px}.blueprint-link-clean span{font-size:9px;color:#4f7d66}@media(max-width:520px){.blueprint-link-grid{grid-template-columns:1fr}.blueprint-route-list>div{grid-template-columns:95px 1fr}.blueprint-route-list small{grid-column:2}}
  `;
  document.head.appendChild(style);
}

function enhance(){
  installStyles();
  const panel=document.querySelector('#pageHelperPanel');
  if(panel)renderPanel(panel);
}

const observer=new MutationObserver(()=>requestAnimationFrame(enhance));
window.addEventListener('DOMContentLoaded',()=>{enhance();observer.observe(document.body,{childList:true,subtree:true})});
window.addEventListener('hashchange',()=>setTimeout(enhance,180));
