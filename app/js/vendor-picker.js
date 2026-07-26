import {store} from './store.js';

const clean=value=>String(value??'').trim();
const read=(row,...keys)=>{for(const key of keys){const value=clean(row?.[key]);if(value)return value}return''};

function vendorDirectory(){
  const map=new Map();
  for(const row of store.rows||[]){
    const name=read(row,'vendor','vendor_name','supplier','supplier_name');
    if(!name||name.toLowerCase()==='unknown supplier')continue;
    const key=name.toLowerCase();
    if(!map.has(key))map.set(key,{name,tin:'',mobile:'',location:''});
    const entry=map.get(key);
    entry.tin ||= read(row,'tin','vendor_tin');
    entry.mobile ||= read(row,'mobile','phone','vendor_mobile');
    entry.location ||= read(row,'location','address');
  }
  return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
}

function escape(value){return clean(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')}

function installStyles(){
  if(document.querySelector('#vendorPickerStyles'))return;
  const style=document.createElement('style');
  style.id='vendorPickerStyles';
  style.textContent=`
    .vendor-picker{position:relative}.vendor-picker-list{position:absolute;z-index:80;left:0;right:0;top:calc(100% + 6px);max-height:300px;overflow:auto;padding:6px;background:var(--surface,#fff);border:1px solid var(--border,#d7e0e7);border-radius:14px;box-shadow:0 18px 42px rgba(13,35,62,.16)}
    .vendor-picker-list[hidden]{display:none}.vendor-picker-option{display:block;width:100%;padding:10px 12px;border:0;border-radius:10px;background:transparent;text-align:left;color:var(--text-strong,#102a43);cursor:pointer}.vendor-picker-option:hover,.vendor-picker-option:focus{background:var(--surface-muted,#f1f5f4);outline:0}.vendor-picker-option strong,.vendor-picker-option small{display:block}.vendor-picker-option small{margin-top:3px;color:var(--text-muted,#64748b)}.vendor-picker-empty{padding:12px;color:var(--text-muted,#64748b)}
  `;
  document.head.appendChild(style);
}

function setupVendorPicker(){
  const input=document.querySelector('#vendor');
  if(!input||input.dataset.vendorPickerReady==='1')return;
  input.dataset.vendorPickerReady='1';
  input.removeAttribute('list');
  input.setAttribute('autocomplete','new-password');
  input.setAttribute('name','supplier_lookup');
  input.setAttribute('autocorrect','off');
  input.setAttribute('autocapitalize','none');
  input.setAttribute('spellcheck','false');
  input.closest('form')?.setAttribute('autocomplete','off');
  document.querySelector('#vendorList')?.remove();

  const label=input.closest('label');
  if(!label)return;
  label.classList.add('vendor-picker');
  const list=document.createElement('div');
  list.className='vendor-picker-list';
  list.hidden=true;
  label.appendChild(list);

  const directory=vendorDirectory();
  const byName=new Map(directory.map(v=>[v.name.toLowerCase(),v]));

  const fill=vendor=>{
    if(!vendor)return;
    input.value=vendor.name;
    const tin=document.querySelector('#tin'),mobile=document.querySelector('#mobile'),location=document.querySelector('#location');
    if(tin)tin.value=vendor.tin;
    if(mobile)mobile.value=vendor.mobile;
    if(location)location.value=vendor.location;
    list.hidden=true;
    input.dispatchEvent(new Event('change',{bubbles:true}));
  };

  const draw=(showAll=false)=>{
    const query=showAll?'':clean(input.value).toLowerCase();
    const matches=(query?directory.filter(v=>`${v.name} ${v.tin} ${v.mobile} ${v.location}`.toLowerCase().includes(query)):directory).slice(0,120);
    list.innerHTML=matches.length?matches.map(v=>`<button type="button" class="vendor-picker-option" data-vendor="${escape(v.name)}"><strong>${escape(v.name)}</strong><small>${escape([v.tin&&`TIN ${v.tin}`,v.mobile,v.location].filter(Boolean).join(' · ')||'No saved contact details')}</small></button>`).join(''):'<div class="vendor-picker-empty">No matching vendor. Continue typing to use a new vendor.</div>';
    list.hidden=false;
    list.querySelectorAll('[data-vendor]').forEach(button=>button.addEventListener('mousedown',event=>{event.preventDefault();fill(byName.get(button.dataset.vendor.toLowerCase()))}));
  };

  const openAll=()=>{input.select();draw(true)};
  input.addEventListener('focus',openAll);
  input.addEventListener('click',openAll);
  input.addEventListener('input',()=>draw(false));
  input.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'&&!list.hidden){event.preventDefault();list.querySelector('button')?.focus()}
    if(event.key==='Escape')list.hidden=true;
  });
  input.addEventListener('blur',()=>setTimeout(()=>{list.hidden=true},150));
}

installStyles();
new MutationObserver(setupVendorPicker).observe(document.documentElement,{childList:true,subtree:true});
setupVendorPicker();