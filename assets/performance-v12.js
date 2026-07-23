(()=>{
  const originalShow=window.show;
  const originalBoot=window.boot;
  const sixMonthsAgo=()=>{const d=new Date();d.setMonth(d.getMonth()-6);return d.toISOString().slice(0,10)};
  const debounce=(fn,wait=180)=>{let t;return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),wait)}};

  window.show=function(view){
    localStorage.setItem('ws-current-view',view);
    return originalShow(view);
  };

  window.boot=async function(session){
    if(!session)return originalBoot(session);
    state.user=session.user;
    state.role=ADMIN_IDS.includes(session.user.id)?'admin':'staff';
    $('#loginView').classList.add('hidden');
    $('#appView').classList.remove('hidden');
    $('#roleLabel').textContent=state.role.toUpperCase();
    $('#emailLabel').textContent=session.user.email||'Signed in';
    $('#avatar').textContent=(session.user.email||'A')[0].toUpperCase();
    try{
      await loadBills();
      const saved=localStorage.getItem('ws-current-view')||'dashboard';
      show(['dashboard','bills','new','products','vendors','prices','reports','settings'].includes(saved)?saved:'dashboard');
    }catch(e){
      $('#content').innerHTML=`<div class="card"><div class="empty">Could not load bills: ${esc(e.message)}</div></div>`;
    }
  };

  window.loadBills=async function(loadAll=false){
    const started=performance.now();
    let query=db.from(TABLE).select('*').order('id',{ascending:false}).limit(5000);
    if(!loadAll)query=query.gte('bill_date',sixMonthsAgo());
    let {data,error}=await query;
    if(error&&!loadAll){({data,error}=await db.from(TABLE).select('*').order('id',{ascending:false}).limit(5000));loadAll=true;}
    if(error)throw error;
    state.rows=data||[];
    state.filtered=[...state.rows];
    state.allBillsLoaded=loadAll;
    state.loadedInMs=Math.round(performance.now()-started);
  };

  const dateKey=r=>{
    if(r.__billTs!==undefined)return r.__billTs;
    const d=new Date(dateVal(r));
    const ts=isNaN(d)?NaN:d.getTime();
    try{Object.defineProperty(r,'__billTs',{value:ts,writable:true,configurable:true})}catch{}
    return ts;
  };

  window.renderBills=function(){
    const actions=`<button class="btn secondary" id="exportBtn">Export CSV</button><button class="btn" data-go="new">＋ New Bill</button>`;
    $('#content').innerHTML=pageHead('Bills','Fast date-based search and review of supplier bills.',actions)+`<section class="card"><div class="toolbar bills-toolbar"><input class="field" id="billSearch" placeholder="Search vendor, bill number or notes"><select class="field" id="statusFilter"><option value="all">All status</option><option>Paid</option><option>Pending</option><option>Cancelled</option></select><select class="field" id="periodFilter"><option value="month">This month</option><option value="last_month">Last month</option><option value="3months">Last 3 months</option><option value="6months">Last 6 months</option><option value="year">This year</option><option value="custom">Custom dates</option><option value="all">All records</option></select><input class="field date-filter" id="dateFrom" type="date" aria-label="From date"><input class="field date-filter" id="dateTo" type="date" aria-label="To date"><select class="field" id="sizeFilter"><option value="20">20 per page</option><option value="50">50 per page</option></select></div><div class="filter-note" id="filterNote"></div><div class="table-wrap"><table><thead><tr><th>Status</th><th>Date</th><th>Bill no.</th><th>Vendor</th><th>Due date</th><th>Amount</th><th>Payment</th><th>Actions</th></tr></thead><tbody id="billRows"></tbody></table></div><div class="pager" id="pager"></div></section>`;
    bindGo();
    const saved=JSON.parse(localStorage.getItem('ws-bill-filters')||'{}');
    for(const [id,val] of Object.entries(saved)){const el=$('#'+id);if(el&&val!==undefined)el.value=val;}
    const delayed=debounce(()=>{state.page=1;applyBillFilters()},180);
    $('#billSearch').addEventListener('input',delayed);
    ['statusFilter','periodFilter','dateFrom','dateTo','sizeFilter'].forEach(id=>$('#'+id).addEventListener('change',async()=>{
      state.page=1;
      const period=$('#periodFilter').value;
      if(period==='all'&&!state.allBillsLoaded){$('#filterNote').textContent='Loading all historical bills…';await loadBills(true);}
      await applyBillFilters();
    }));
    $('#exportBtn').onclick=exportCsv;
    applyBillFilters();
  };

  window.applyBillFilters=async function(){
    const search=$('#billSearch');if(!search)return;
    const q=(search.value||'').trim().toLowerCase();
    const st=$('#statusFilter').value||'all';
    const period=$('#periodFilter').value||'month';
    const from=$('#dateFrom').value;
    const to=$('#dateTo').value;
    state.pageSize=Number($('#sizeFilter').value||20);
    const now=new Date();
    const startOfToday=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    let start=null,end=null;
    if(period==='month'){start=new Date(now.getFullYear(),now.getMonth(),1);end=new Date(now.getFullYear(),now.getMonth()+1,1);}
    if(period==='last_month'){start=new Date(now.getFullYear(),now.getMonth()-1,1);end=new Date(now.getFullYear(),now.getMonth(),1);}
    if(period==='3months'){start=new Date(startOfToday);start.setMonth(start.getMonth()-3);end=new Date(startOfToday);end.setDate(end.getDate()+1);}
    if(period==='6months'){start=new Date(startOfToday);start.setMonth(start.getMonth()-6);end=new Date(startOfToday);end.setDate(end.getDate()+1);}
    if(period==='year'){start=new Date(now.getFullYear(),0,1);end=new Date(now.getFullYear()+1,0,1);}
    if(period==='custom'){start=from?new Date(from+'T00:00:00'):null;end=to?new Date(to+'T23:59:59.999'):null;}
    const min=start?.getTime()??-Infinity,max=end?.getTime()??Infinity;
    state.filtered=state.rows.filter(r=>{
      const ts=dateKey(r);
      const dateOk=period==='all'||(!Number.isNaN(ts)&&ts>=min&&ts<=max);
      const statusOk=st==='all'||statusVal(r)===st;
      if(!dateOk||!statusOk)return false;
      if(!q)return true;
      return [vendorVal(r),get(r,'bill_no','Bill No','number'),get(r,'notes','Notes'),amountVal(r)].join(' ').toLowerCase().includes(q);
    });
    localStorage.setItem('ws-bill-filters',JSON.stringify({billSearch:q,statusFilter:st,periodFilter:period,dateFrom:from,dateTo:to,sizeFilter:String(state.pageSize)}));
    const note=$('#filterNote');
    if(note)note.textContent=`${state.filtered.length} matching bills · ${state.rows.length} loaded${state.allBillsLoaded?'':' (latest 6 months)'} · loaded in ${state.loadedInMs||0} ms`;
    renderBillRows();
  };
})();