const ICONS={bills:'<path d="M6 2h9l3 3v17l-3-2-3 2-3-2-3 2V2Z"/><path d="M9 8h6M9 12h6M9 16h4"/>',inventory:'<path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="m3 7 9 4 9-4M3 7v10l9 4 9-4V7M12 11v10"/>',stock:'<path d="M4 8h16v12H4z"/><path d="M7 8V5h10v3M8 13h8M8 17h5"/>',vendors:'<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 11a3 3 0 0 1 5 2.2M17 17a5 5 0 0 1 4 3"/>',prices:'<path d="m3 17 6-6 4 4 8-9"/><path d="M14 6h7v7"/>',logout:'<path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h7v18h-7"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',plus:'<path d="M12 5v14M5 12h14"/>'};

/* Final operational scope: only the five modules used for purchasing. */
export const PAGES=[
  ['Inventory','./inventory.html','inventory'],
  ['Vendors','./index.html#vendors','vendors'],
  ['Stock','./stock-ledger.html','stock'],
  ['Bills','./bills-live.html','bills'],
  ['Prices','./index.html#price-intelligence','prices']
];

export const icon=(name,cls='')=>`<svg class="ws-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.inventory}</svg>`;

export function renderMasterNavigation({active='Inventory',desktop='#desktopNav',drawer='#drawerNav',bottom='#bottomNav'}={}){
  const links=PAGES.map((p,i)=>`<a class="${p[0]===active?'active':''}" href="${p[1]}">${icon(p[2],'ws-icon-sm')}<span class="nav-index">${String(i+1).padStart(2,'0')}</span>${p[0]}</a>`).join('');
  document.querySelector(desktop)?.replaceChildren(...htmlNodes(links));
  document.querySelector(drawer)?.replaceChildren(...htmlNodes(links));
  const mobile=PAGES.slice(0,4).map(p=>`<a class="${p[0]===active?'active':''}" href="${p[1]}">${icon(p[2])}<span>${p[0]}</span></a>`).join('');
  document.querySelector(bottom)?.replaceChildren(...htmlNodes(mobile));
}

export function wireMasterShell({active='Inventory',logout,onOpenMenu,onCloseMenu}={}){
  renderMasterNavigation({active});
  const logoutBtn=document.querySelector('#logout');
  if(logoutBtn){logoutBtn.innerHTML=icon('logout');if(logout)logoutBtn.onclick=logout;}
  const open=document.querySelector('#openMenu'),close=document.querySelector('#closeMenu'),backdrop=document.querySelector('#backdrop'),drawer=document.querySelector('#drawer');
  const set=v=>{drawer?.classList.toggle('open',v);backdrop?.classList.toggle('show',v)};
  if(open){open.innerHTML=icon('menu');open.onclick=()=>{set(true);onOpenMenu?.()}}
  if(close)close.onclick=()=>{set(false);onCloseMenu?.()};
  if(backdrop)backdrop.onclick=()=>set(false);
}

export function setAccount({role='viewer',email='',roleSelector='#role',emailSelector='#user,#userEmail'}={}){
  document.querySelector(roleSelector)?.replaceChildren(document.createTextNode(String(role).toUpperCase()));
  document.querySelectorAll(emailSelector).forEach(el=>el.textContent=email);
}

function htmlNodes(html){const t=document.createElement('template');t.innerHTML=html.trim();return [...t.content.childNodes];}
