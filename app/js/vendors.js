import {store,money,escapeHtml,text,billDate,vendor,amount,status,itemsOf,productName,get} from './store.js';

const $=s=>document.querySelector(s),content=()=>$('#content');
const META_KEY='bills.vendorMetadata.v1';
const readMeta=()=>{try{return JSON.parse(localStorage.getItem(META_KEY)||'{}')}catch{return{}}};
const writeMeta=value=>localStorage.setItem(META_KEY,JSON.stringify(value));
const clean=value=>text(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const digits=value=>text(value).replace(/\D/g,'');
const initials=name=>name.split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase()||'V';
const manualKey=()=>`manual:${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const kpi=(icon,label,value,meta)=>`<article class="kpi-card"><span class="kpi-card__icon"><i class="fa-solid ${icon}" aria-hidden="true"></i></span><div class="kpi-card__content"><span class="kpi-card__label">${escapeHtml(label)}</span><strong class="kpi-card__value">${value}</strong><small class="kpi-card__meta">${escapeHtml(meta)}</small></div></article>`;

const vendorKey=row=>{
  const tin=digits(get(row,'tin','vendor_tin'));
  if(tin)return`tin:${tin}`;
  const mobile=digits(get(row,'mobile','phone','vendor_mobile'));
  if(mobile.length>=7)return`mobile:${mobile}`;
  return`name:${clean(vendor(row))}`;
};

function addValue(set,value){
  const normalized=text(value);
  if(normalized)set.add(normalized);
}

function buildVendors(){
  const meta=readMeta();
  const groups=new Map();

  [...store.rows].sort((a,b)=>billDate(a).localeCompare(billDate(b))).forEach(row=>{
    const raw=vendor(row);
    const base=vendorKey(row);
    const assigned=meta.aliasToCanonical?.[clean(raw)];
    const key=assigned||base;
    const override=meta.records?.[key]||{};

    if(!groups.has(key)){
      groups.set(key,{
        key,
        name:text(override.name)||raw,
        aliases:new Set(),
        tins:new Set(),
        mobiles:new Set(),
        locations:new Set(),
        products:new Set(),
        bills:0,
        total:0,
        paid:0,
        pending:0,
        lastDate:'',
        active:override.active!==false,
        notes:text(override.notes),
        contact:text(override.contact),
        bank:text(override.bank),
        category:text(override.category),
        manual:false,
        rows:[]
      });
    }

    const entry=groups.get(key);
    const value=amount(row);
    const state=status(row).toLowerCase();
    const date=billDate(row);

    entry.aliases.add(raw);
    addValue(entry.tins,get(row,'tin','vendor_tin'));
    addValue(entry.mobiles,get(row,'mobile','phone','vendor_mobile'));
    addValue(entry.locations,get(row,'location','address'));
    itemsOf(row).forEach(item=>{
      const name=productName(item,row);
      if(name!=='Unspecified item')entry.products.add(name);
    });

    entry.bills++;
    entry.total+=value;
    if(state==='paid')entry.paid+=value;else entry.pending+=value;
    if(date>entry.lastDate)entry.lastDate=date;
    entry.rows.push(row);
  });

  Object.entries(meta.records||{}).forEach(([key,record])=>{
    if(groups.has(key)){
      const entry=groups.get(key);
      entry.name=text(record.name)||entry.name;
      entry.active=record.active!==false;
      entry.notes=text(record.notes);
      entry.contact=text(record.contact);
      entry.bank=text(record.bank);
      entry.category=text(record.category);
      addValue(entry.tins,record.tin);
      addValue(entry.mobiles,record.mobile);
      addValue(entry.locations,record.location);
      return;
    }

    const name=text(record.name);
    if(!name)return;
    groups.set(key,{
      key,
      name,
      aliases:new Set([name]),
      tins:new Set(record.tin?[text(record.tin)]:[]),
      mobiles:new Set(record.mobile?[text(record.mobile)]:[]),
      locations:new Set(record.location?[text(record.location)]:[]),
      products:new Set(),
      bills:0,
      total:0,
      paid:0,
      pending:0,
      lastDate:'',
      active:record.active!==false,
      notes:text(record.notes),
      contact:text(record.contact),
      bank:text(record.bank),
      category:text(record.category),
      manual:true,
      rows:[]
    });
  });

  return[...groups.values()].map(entry=>({
    ...entry,
    average:entry.bills?entry.total/entry.bills:0,
    possibleDuplicate:entry.aliases.size>1||entry.tins.size>1||entry.mobiles.size>1
  })).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
}

function vendorFormMarkup(record={}){
  return`<form class="card-body form-grid" id="vendorEditForm">
    <label>Vendor name <span aria-hidden="true">*</span><input id="vendorName" value="${escapeHtml(record.name||'')}" required autocomplete="organization"></label>
    <label>Status<select id="vendorActive"><option value="active" ${record.active!==false?'selected':''}>Active</option><option value="inactive" ${record.active===false?'selected':''}>Inactive</option></select></label>
    <label>TIN<input id="vendorTin" value="${escapeHtml(record.tin||'')}" inputmode="numeric"></label>
    <label>Mobile<input id="vendorMobile" value="${escapeHtml(record.mobile||'')}" inputmode="tel" autocomplete="tel"></label>
    <label>Location / address<input id="vendorLocation" value="${escapeHtml(record.location||'')}" autocomplete="street-address"></label>
    <label>Contact person<input id="vendorContact" value="${escapeHtml(record.contact||'')}" autocomplete="name"></label>
    <label>Category<input id="vendorCategory" value="${escapeHtml(record.category||'')}"></label>
    <label>Bank details<input id="vendorBank" value="${escapeHtml(record.bank||'')}"></label>
    <label class="vendor-notes">Notes<textarea id="vendorNotes">${escapeHtml(record.notes||'')}</textarea></label>
    <div class="actions"><button class="btn" type="submit">Save vendor</button><button class="btn secondary" data-close type="button">Cancel</button></div>
  </form>`;
}

export function vendorsPage(){
  const vendors=buildVendors();
  content().innerHTML=`<header class="page-head"><div><h1>Vendors</h1><p>Supplier directory, spend, contacts and duplicate review.</p></div>${store.role==='admin'?'<button class="btn" id="createVendor" type="button">Create new vendor</button>':''}</header>
    <section class="kpi-summary">
      ${kpi('fa-building','Vendors',vendors.length,`${vendors.filter(item=>item.active).length} active`)}
      ${kpi('fa-wallet','Total spend',money(vendors.reduce((sum,item)=>sum+item.total,0)),'All bills')}
      ${kpi('fa-clock','Pending',money(vendors.reduce((sum,item)=>sum+item.pending,0)),'Not marked paid')}
      ${kpi('fa-code-compare','Possible duplicates',vendors.filter(item=>item.possibleDuplicate).length,'Review contacts and aliases')}
    </section>
    <section class="toolbar vendor-filters"><input id="vendorSearch" placeholder="Search vendor, TIN, mobile or product"><select id="vendorStatus"><option value="active">Active vendors</option><option value="all">All vendors</option><option value="inactive">Inactive vendors</option></select><select id="vendorDuplicates"><option value="all">All records</option><option value="duplicates">Possible duplicates</option></select><span id="vendorCount"></span></section>
    <section class="vendor-grid" id="vendorGrid"></section>`;

  const draw=()=>{
    const query=clean($('#vendorSearch').value);
    const state=$('#vendorStatus').value;
    const duplicates=$('#vendorDuplicates').value;
    const list=vendors.filter(item=>(!query||clean(`${item.name} ${[...item.aliases]} ${[...item.tins]} ${[...item.mobiles]} ${[...item.products]} ${item.contact} ${item.category}`).includes(query))&&(state==='all'||(state==='active'?item.active:!item.active))&&(duplicates==='all'||item.possibleDuplicate));

    $('#vendorCount').textContent=`${list.length} vendors`;
    $('#vendorGrid').innerHTML=list.map(item=>`<article class="vendor-card">
      <div class="vendor-card-head"><div class="vendor-avatar">${escapeHtml(initials(item.name))}</div><div><h3>${escapeHtml(item.name)}</h3><p>${item.bills} bills · ${item.products.size} products</p></div>${item.possibleDuplicate?'<span class="badge pending">Review</span>':''}</div>
      <div class="vendor-contact"><span><b>TIN</b>${escapeHtml([...item.tins][0]||'Not recorded')}</span><span><b>Mobile</b>${escapeHtml([...item.mobiles][0]||'Not recorded')}</span><span><b>Location</b>${escapeHtml([...item.locations][0]||'Not recorded')}</span></div>
      <dl class="vendor-stats"><div><dt>Total spend</dt><dd>${money(item.total)}</dd></div><div><dt>Paid</dt><dd>${money(item.paid)}</dd></div><div><dt>Pending</dt><dd>${money(item.pending)}</dd></div><div><dt>Average bill</dt><dd>${money(item.average)}</dd></div><div><dt>Last purchase</dt><dd>${escapeHtml(item.lastDate||'No purchases')}</dd></div><div><dt>Products</dt><dd>${item.products.size}</dd></div></dl>
      ${store.role==='admin'?`<div class="vendor-actions"><button class="btn secondary small" data-manage="${escapeHtml(item.key)}" type="button">Edit vendor</button></div>`:''}
    </article>`).join('')||'<div class="empty">No vendors match these filters.</div>';

    document.querySelectorAll('[data-manage]').forEach(button=>button.onclick=()=>openVendorEditor(vendors.find(item=>item.key===button.dataset.manage)));
  };

  function openVendorEditor(item=null){
    const isNew=!item;
    const record=isNew?{active:true}:{
      name:item.name,
      active:item.active,
      tin:[...item.tins][0]||'',
      mobile:[...item.mobiles][0]||'',
      location:[...item.locations][0]||'',
      contact:item.contact,
      bank:item.bank,
      category:item.category,
      notes:item.notes
    };

    const modal=document.createElement('div');
    modal.className='modal';
    modal.innerHTML=`<section class="modal-card vendor-editor"><header class="card-head"><div><h2>${isNew?'Create new vendor':'Edit vendor'}</h2><small>Vendor name is required. All other fields are optional.</small></div><button class="btn secondary small" data-close type="button">Close</button></header>${vendorFormMarkup(record)}</section>`;
    document.body.appendChild(modal);

    const close=()=>modal.remove();
    modal.querySelectorAll('[data-close]').forEach(button=>button.onclick=close);
    const form=modal.querySelector('form');
    const nameInput=modal.querySelector('#vendorName');
    nameInput?.focus();

    form.onsubmit=event=>{
      event.preventDefault();
      const name=text(nameInput?.value);
      if(!name){
        nameInput?.setCustomValidity('Vendor name is required.');
        nameInput?.reportValidity();
        return;
      }
      nameInput.setCustomValidity('');

      const meta=readMeta();
      meta.records||={};
      const key=isNew?manualKey():item.key;
      meta.records[key]={
        name,
        active:modal.querySelector('#vendorActive').value==='active',
        tin:text(modal.querySelector('#vendorTin').value),
        mobile:text(modal.querySelector('#vendorMobile').value),
        location:text(modal.querySelector('#vendorLocation').value),
        contact:text(modal.querySelector('#vendorContact').value),
        category:text(modal.querySelector('#vendorCategory').value),
        bank:text(modal.querySelector('#vendorBank').value),
        notes:text(modal.querySelector('#vendorNotes').value)
      };
      writeMeta(meta);
      close();
      vendorsPage();
    };
  }

  $('#createVendor')?.addEventListener('click',()=>openVendorEditor());
  $('#vendorSearch').oninput=draw;
  $('#vendorStatus').onchange=draw;
  $('#vendorDuplicates').onchange=draw;
  draw();
}