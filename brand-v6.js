(()=>{
  const iconMap={dashboard:'layout-dashboard',bills:'receipt-text',new:'circle-plus',products:'package',vendors:'store',prices:'chart-no-axes-combined',reports:'file-chart-column',settings:'settings'};
  function renderIcons(){
    document.querySelectorAll('.nav button[data-view]').forEach(btn=>{
      const view=btn.dataset.view, label=btn.textContent.replace(/[▦▤＋◫♙↗▥⚙]/g,'').trim();
      btn.innerHTML=`<i data-lucide="${iconMap[view]||'circle'}" class="nav-icon"></i><span>${label}</span>`;
    });
    if(window.lucide) window.lucide.createIcons();
  }
  function vendors(){
    const fromRows=(window.state?.rows||[]).map(r=>window.vendorVal?window.vendorVal(r):(r.vendor||r.Vendor||r.supplier||r.Supplier||''));
    const local=JSON.parse(localStorage.getItem('ws_custom_vendors')||'[]');
    return [...new Set([...fromRows,...local].map(v=>String(v||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  }
  function enhanceVendor(){
    const input=document.querySelector('#billForm [name="vendor"]');
    if(!input||input.dataset.enhanced)return;
    input.dataset.enhanced='1';
    const list=document.createElement('datalist'); list.id='vendorOptions';
    list.innerHTML=vendors().map(v=>`<option value="${v.replace(/"/g,'&quot;')}"></option>`).join('');
    document.body.appendChild(list); input.setAttribute('list',list.id); input.setAttribute('autocomplete','off');
    const label=input.closest('label'); if(!label)return;
    const wrapper=document.createElement('div'); wrapper.className='vendor-picker';
    const fieldWrap=document.createElement('div');
    const title=document.createElement('div'); title.textContent='Vendor'; title.style.cssText='font-size:12px;font-weight:750;margin-bottom:6px';
    const helper=document.createElement('div'); helper.className='vendor-helper'; helper.textContent='Select a saved vendor or type a new name.';
    fieldWrap.append(title,input,helper);
    const add=document.createElement('button'); add.type='button'; add.className='btn secondary vendor-create'; add.innerHTML='<i data-lucide="store"></i> New vendor';
    add.onclick=()=>{input.value='';input.focus();helper.textContent='Type the new vendor name. It will be saved with this bill.'};
    wrapper.append(fieldWrap,add); label.replaceWith(wrapper);
    input.addEventListener('change',()=>{
      const value=input.value.trim(); if(!value)return;
      const current=JSON.parse(localStorage.getItem('ws_custom_vendors')||'[]');
      if(!vendors().some(v=>v.toLowerCase()===value.toLowerCase())){
        localStorage.setItem('ws_custom_vendors',JSON.stringify([...new Set([...current,value])]));
        helper.textContent='New vendor ready to save.';
      }else helper.textContent='Saved vendor selected.';
    });
    if(window.lucide)window.lucide.createIcons();
  }
  function ribbon(){
    const c=document.querySelector('#content'); if(!c||c.querySelector('.brand-ribbon'))return;
    const r=document.createElement('div');r.className='brand-ribbon';r.innerHTML='<i data-lucide="sparkles"></i><strong>White Saffron Procurement</strong><span>Clear purchasing, accurate prices, better decisions.</span>';
    c.prepend(r); if(window.lucide)window.lucide.createIcons();
  }
  function apply(){renderIcons();enhanceVendor();ribbon()}
  const observer=new MutationObserver(()=>requestAnimationFrame(apply));
  window.addEventListener('DOMContentLoaded',()=>{observer.observe(document.body,{childList:true,subtree:true});apply()});
})();
