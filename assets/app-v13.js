(()=>{
'use strict';

const VALID_VIEWS=new Set(['dashboard','bills','new','products','vendors','prices','reports','settings']);
const VIEW_KEY='ws-current-view';
const FILTER_KEY='ws-bill-filters-v13';
let allBillsLoaded=false;
let vendorCache=null;
let vendorLoadPromise=null;

const debounce=(fn,wait=180)=>{let timer;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),wait)}};
const sixMonthsAgo=()=>{const d=new Date();d.setMonth(d.getMonth()-6);return d.toISOString().slice(0,10)};
const safeJson=(value,fallback={})=>{try{return JSON.parse(value)||fallback}catch{return fallback}};

// Keep the active page without replacing the application's core navigation functions.
document.addEventListener('click',event=>{
  const target=event.target.closest('[data-view],[data-go]');
  const view=target?.dataset.view||target?.dataset.go;
  if(VALID_VIEWS.has(view))localStorage.setItem(VIEW_KEY,view);
},true);

// Load only recent bills by default. This assignment is safe because callers resolve loadBills at call time.
window.loadBills=async function(loadAll=false){
  let query=db.from(TABLE).select('*').order('id',{ascending:false}).limit(5000);
  if(!loadAll)query=query.gte('bill_date',sixMonthsAgo());
  let {data,error}=await query;
  if(error&&!loadAll){({data,error}=await db.from(TABLE).select('*').order('id',{ascending:false}).limit(5000));loadAll=true;}
  if(error)throw error;
  state.rows=data||[];
  state.filtered=[...state.rows];
  allBillsLoaded=loadAll;
};

function billTimestamp(row){
  if(row.__billTimestamp!==undefined)return row.__billTimestamp;
  const d=new Date(dateVal(row));
  const value=Number.isNaN(d.getTime())?NaN:d.getTime();
  try{Object.defineProperty(row,'__billTimestamp',{value,configurable:true})}catch{}
  return value;
}

window.renderBills=function(){
  const actions='<button class="btn secondary" id="exportBtn" type="button">Export CSV</button><button class="btn" data-go="new" type="button">＋ New Bill</button>';
  $('#content').innerHTML=pageHead('Bills','Search and filter supplier bills by date.',actions)+`<section class="card"><div class="toolbar bills-toolbar"><input class="field" id="billSearch" placeholder="Search vendor, bill number or notes"><select class="field" id="statusFilter"><option value="all">All status</option><option>Paid</option><option>Pending</option><option>Cancelled</option></select><select class="field" id="periodFilter"><option value="month">This month</option><option value="last_month">Last month</option><option value="3months">Last 3 months</option><option value="6months">Last 6 months</option><option value="year">This year</option><option value="custom">Custom dates</option><option value="all">All records</option></select><input class="field date-filter" id="dateFrom" type="date" aria-label="From date"><input class="field date-filter" id="dateTo" type="date" aria-label="To date"><select class="field" id="sizeFilter"><option value="20">20 per page</option><option value="50">50 per page</option></select></div><div class="filter-note" id="filterNote"></div><div class="table-wrap"><table><thead><tr><th>Status</th><th>Date</th><th>Bill no.</th><th>Vendor</th><th>Due date</th><th>Amount</th><th>Payment</th><th>Actions</th></tr></thead><tbody id="billRows"></tbody></table></div><div class="pager" id="pager"></div></section>`;
  bindGo();
  const saved=safeJson(localStorage.getItem(FILTER_KEY));
  Object.entries(saved).forEach(([id,value])=>{const el=$('#'+id);if(el&&value!==undefined)el.value=value});
  const delayed=debounce(()=>{state.page=1;applyBillFilters()},180);
  $('#billSearch').addEventListener('input',delayed);
  ['statusFilter','periodFilter','dateFrom','dateTo','sizeFilter'].forEach(id=>$('#'+id).addEventListener('change',async()=>{
    state.page=1;
    if($('#periodFilter').value==='all'&&!allBillsLoaded){
      $('#filterNote').textContent='Loading historical bills…';
      await loadBills(true);
    }
    applyBillFilters();
  }));
  $('#exportBtn').onclick=exportCsv;
  applyBillFilters();
};

window.applyBillFilters=function(){
  if(!$('#billSearch'))return;
  const q=($('#billSearch').value||'').trim().toLowerCase();
  const status=$('#statusFilter').value||'all';
  const period=$('#periodFilter').value||'month';
  const from=$('#dateFrom').value;
  const to=$('#dateTo').value;
  state.pageSize=Number($('#sizeFilter').value||20);
  const now=new Date();
  let start=null,end=null;
  if(period==='month'){start=new Date(now.getFullYear(),now.getMonth(),1);end=new Date(now.getFullYear(),now.getMonth()+1,1);}
  else if(period==='last_month'){start=new Date(now.getFullYear(),now.getMonth()-1,1);end=new Date(now.getFullYear(),now.getMonth(),1);}
  else if(period==='3months'||period==='6months'){start=new Date(now);start.setMonth(start.getMonth()-(period==='3months'?3:6));end=new Date(now);end.setDate(end.getDate()+1);}
  else if(period==='year'){start=new Date(now.getFullYear(),0,1);end=new Date(now.getFullYear()+1,0,1);}
  else if(period==='custom'){start=from?new Date(from+'T00:00:00'):null;end=to?new Date(to+'T23:59:59.999'):null;}
  const min=start?start.getTime():-Infinity;
  const max=end?end.getTime():Infinity;
  state.filtered=state.rows.filter(row=>{
    const ts=billTimestamp(row);
    if(period!=='all'&&(Number.isNaN(ts)||ts<min||ts>max))return false;
    if(status!=='all'&&statusVal(row)!==status)return false;
    if(!q)return true;
    return [vendorVal(row),get(row,'bill_no','Bill No','number'),get(row,'notes','Notes'),amountVal(row)].join(' ').toLowerCase().includes(q);
  });
  localStorage.setItem(FILTER_KEY,JSON.stringify({billSearch:q,statusFilter:status,periodFilter:period,dateFrom:from,dateTo:to,sizeFilter:String(state.pageSize)}));
  $('#filterNote').textContent=`${state.filtered.length} matching bills · ${state.rows.length} loaded${allBillsLoaded?'':' (latest 6 months)'}`;
  renderBillRows();
};

const normalize=value=>String(value??'').trim();
const vendorKey=value=>normalize(value).toLocaleLowerCase();

function vendorsFromBills(){
  const map=new Map();
  for(const row of state.rows||[]){
    const name=normalize(vendorVal(row));
    if(!name)continue;
    const key=vendorKey(name);
    const current=map.get(key)||{name,tin:'',location:'',phone:'',paymentMethod:''};
    current.tin=current.tin||normalize(get(row,'tin','TIN'));
    current.location=current.location||normalize(get(row,'location','Location','address','Address'));
    current.phone=current.phone||normalize(get(row,'phone','mobile','contact'));
    current.paymentMethod=current.paymentMethod||normalize(get(row,'payment_method','Payment Method'));
    map.set(key,current);
  }
  return [...map.values()];
}

async function loadVendorDirectory(){
  if(vendorCache)return vendorCache;
  if(vendorLoadPromise)return vendorLoadPromise;
  vendorLoadPromise=(async()=>{
    let external=[];
    for(const table of ['vendors','Vendors','vendor']){
      try{
        const {data,error}=await db.from(table).select('*').limit(2000);
        if(!error&&Array.isArray(data)&&data.length){
          external=data.map(row=>({
            name:normalize(row.name??row.vendor??row.vendor_name??row.supplier??row.company),
            tin:normalize(row.tin??row.TIN??row.gst_tin??row.tax_id),
            location:normalize(row.location??row.address??row.Address),
            phone:normalize(row.phone??row.mobile??row.contact),
            paymentMethod:normalize(row.payment_method??row.paymentMethod)
          })).filter(v=>v.name);
          break;
        }
      }catch{}
    }
    const map=new Map();
    for(const vendor of [...external,...vendorsFromBills()]){
      const key=vendorKey(vendor.name);
      if(!key)continue;
      const current=map.get(key)||{name:vendor.name,tin:'',location:'',phone:'',paymentMethod:''};
      for(const field of ['tin','location','phone','paymentMethod'])if(!current[field]&&vendor[field])current[field]=vendor[field];
      map.set(key,current);
    }
    vendorCache=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
    return vendorCache;
  })();
  return vendorLoadPromise;
}

async function enhanceVendorSearch(){
  const input=document.querySelector('#vendorInput');
  if(!input||input.dataset.advancedVendor==='1')return;
  input.dataset.advancedVendor='1';
  input.removeAttribute('list');
  document.querySelector('#vendorOptions')?.remove();
  const vendors=await loadVendorDirectory();
  if(!document.body.contains(input))return;
  const wrapper=input.parentElement;
  wrapper.classList.add('advanced-vendor');
  const dropdown=document.createElement('div');
  dropdown.className='vendor-dropdown';
  dropdown.hidden=true;
  wrapper.appendChild(dropdown);
  let active=-1;

  const fill=vendor=>{
    input.value=vendor.name;
    const form=input.closest('form');
    const tin=form?.querySelector('[name="tin"]');
    const location=form?.querySelector('[name="location"]');
    const method=form?.querySelector('[name="payment_method"]');
    if(tin)tin.value=vendor.tin||'';
    if(location)location.value=vendor.location||'';
    if(method&&vendor.paymentMethod&&[...method.options].some(o=>o.value===vendor.paymentMethod))method.value=vendor.paymentMethod;
    dropdown.hidden=true;
    input.dispatchEvent(new Event('change',{bubbles:true}));
  };

  const renderOptions=()=>{
    const query=vendorKey(input.value);
    const matches=vendors.filter(v=>!query||vendorKey(v.name).includes(query)||vendorKey(v.tin).includes(query)||vendorKey(v.location).includes(query)||vendorKey(v.phone).includes(query)).slice(0,40);
    active=-1;
    dropdown.innerHTML=matches.length?matches.map((v,index)=>`<button type="button" class="vendor-option" data-index="${index}"><strong>${esc(v.name)}</strong><span>${esc([v.tin&&'TIN '+v.tin,v.location,v.phone].filter(Boolean).join(' · ')||'Saved vendor')}</span></button>`).join(''):'<div class="vendor-empty">No saved vendor found. Keep typing to add a new vendor.</div>';
    dropdown.hidden=false;
    dropdown.querySelectorAll('.vendor-option').forEach((button,index)=>button.addEventListener('mousedown',event=>{event.preventDefault();fill(matches[index])}));
  };

  input.addEventListener('focus',renderOptions);
  input.addEventListener('input',debounce(renderOptions,80));
  input.addEventListener('keydown',event=>{
    const options=[...dropdown.querySelectorAll('.vendor-option')];
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();
      active=event.key==='ArrowDown'?Math.min(active+1,options.length-1):Math.max(active-1,0);
      options.forEach((o,i)=>o.classList.toggle('active',i===active));
      options[active]?.scrollIntoView({block:'nearest'});
    }else if(event.key==='Enter'&&active>=0){event.preventDefault();options[active]?.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));}
    else if(event.key==='Escape')dropdown.hidden=true;
  });
  input.addEventListener('blur',()=>setTimeout(()=>{dropdown.hidden=true},120));
}

// Observe only content replacement and enhance once; no DOM rewrite loop.
const content=document.querySelector('#content');
if(content){
  const observer=new MutationObserver(()=>requestAnimationFrame(enhanceVendorSearch));
  observer.observe(content,{childList:true});
}

// Restore the saved view after authentication has made the application visible.
db.auth.onAuthStateChange((event,session)=>{
  if(!session)return;
  setTimeout(()=>{
    const saved=localStorage.getItem(VIEW_KEY);
    if(VALID_VIEWS.has(saved)&&state.view!==saved)show(saved);
    enhanceVendorSearch();
  },0);
});

window.addEventListener('error',event=>{
  console.error('Bills application error:',event.error||event.message);
  const content=document.querySelector('#content');
  if(content&&!content.children.length)content.innerHTML='<section class="card"><div class="empty">The page could not render. Refresh once or return to Dashboard.</div></section>';
});
})();