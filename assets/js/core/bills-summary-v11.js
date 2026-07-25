(()=>{
'use strict';
const VERSION=11;
const id=x=>document.getElementById(x);
const txt=v=>String(v??'').trim();
const get=(o,...keys)=>{for(const key of keys){if(o&&o[key]!=null&&txt(o[key])!=='')return o[key]}return''};
const rows=()=>Array.isArray(state?.rows)?state.rows:[];
const amountOf=b=>num(get(b,'amount','Amount','total','Total','grand_total','Grand Total'));
const statusOf=b=>txt(get(b,'payment_status','Payment Status','status','Status'))||'Pending';
const parseDate=value=>{const raw=txt(value);if(!raw)return'';let m;if((m=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)))return`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;if((m=raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)))return`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;const d=new Date(raw);return Number.isNaN(d.getTime())?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const billDate=b=>{for(const key of ['bill_date','bill_day','Bill Date','date','Date']){const value=parseDate(b?.[key]);if(value)return value}return''};
const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const startWeek=()=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return localDate(d)};
function periodRows(period,from='',to=''){
 const list=rows(),now=new Date(),today=localDate(now),year=now.getFullYear(),month=String(now.getMonth()+1).padStart(2,'0');
 if(period==='today')return list.filter(b=>billDate(b)===today);
 if(period==='week')return list.filter(b=>{const d=billDate(b);return d&&d>=startWeek()&&d<=today});
 if(period==='month')return list.filter(b=>billDate(b).startsWith(`${year}-${month}`));
 if(period==='year')return list.filter(b=>billDate(b).startsWith(`${year}-`));
 if(period==='lastyear')return list.filter(b=>billDate(b).startsWith(`${year-1}-`));
 if(period==='custom')return list.filter(b=>{const d=billDate(b);return d&&(!from||d>=from)&&(!to||d<=to)});
 return list;
}
const labels={last:'All loaded bills',today:'Today',week:'This week',month:'This month',year:'This year',lastyear:'Last year',custom:'Custom range'};
function updateSummary(){
 const period=id('auditBillPeriod')?.value||'last',from=id('auditDateFrom')?.value||'',to=id('auditDateTo')?.value||'';
 const list=periodRows(period,from,to),total=list.reduce((s,b)=>s+amountOf(b),0),paid=list.filter(b=>statusOf(b).toLowerCase()==='paid').reduce((s,b)=>s+amountOf(b),0),pending=Math.max(0,total-paid),average=list.length?total/list.length:0;
 const strip=id('billPeriodDashboard');if(!strip)return;
 strip.innerHTML=`<article class="bill-period-main"><span>${esc(labels[period]||'Selected period')}</span><strong>${money(total)}</strong><small>${list.length.toLocaleString()} bill${list.length===1?'':'s'}</small></article><article><span>Paid</span><strong>${money(paid)}</strong><small>${total?Math.round(paid/total*100):0}% of period</small></article><article><span>Pending</span><strong>${money(pending)}</strong><small>${list.filter(b=>statusOf(b).toLowerCase()!=='paid').length} bills</small></article><article><span>Average bill</span><strong>${money(average)}</strong><small>Per recorded bill</small></article>`;
}
function install(){
 const header=document.querySelector('.audit-page>.audit-head');if(!header||id('billPeriodDashboard'))return;
 const actions=header.querySelector(':scope > .btn,:scope > .audit-actions');
 const strip=document.createElement('section');strip.id='billPeriodDashboard';strip.className='bill-period-dashboard';
 if(actions)header.insertBefore(strip,actions);else header.appendChild(strip);
 ['auditBillPeriod','auditDateFrom','auditDateTo'].forEach(key=>id(key)?.addEventListener('change',updateSummary));
 updateSummary();
}
const previous=window.renderBills;
window.renderBills=()=>{const result=previous?.();install();return result};
if(window.__WS_RENDERERS__)window.__WS_RENDERERS__.bills=window.renderBills;
window.__WS_BILLS_SUMMARY_V11__={version:VERSION,update:updateSummary};
})();