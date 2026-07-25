(()=>{
'use strict';
const originalRender=window.renderBillRows;
if(typeof originalRender!=='function')return;
const rawDate=row=>row?.bill_day??row?.bill_date??row?.['Bill Date']??row?.date??row?.Date??'';
const timestamp=value=>{
 const source=String(value??'').trim();
 if(!source)return 0;
 const iso=source.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
 if(iso)return Date.UTC(Number(iso[1]),Number(iso[2])-1,Number(iso[3]));
 const dmy=source.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
 if(dmy)return Date.UTC(Number(dmy[3]),Number(dmy[2])-1,Number(dmy[1]));
 const parsed=new Date(source).getTime();
 return Number.isFinite(parsed)?parsed:0;
};
const createdAt=row=>{
 const parsed=new Date(row?.created_at??row?.createdAt??0).getTime();
 return Number.isFinite(parsed)?parsed:0;
};
window.renderBillRows=function(){
 if(Array.isArray(state?.filtered)){
  state.filtered.sort((a,b)=>timestamp(rawDate(b))-timestamp(rawDate(a))||createdAt(b)-createdAt(a)||Number(b?.id||0)-Number(a?.id||0));
 }
 return originalRender.apply(this,arguments);
};
window.__WS_BILL_DATE_SORT__={version:1,timestamp};
})();