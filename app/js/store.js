export const store={
  user:null,role:'staff',rows:[],route:'dashboard',page:1,pageSize:20,editing:null,dataRevision:0,
  set(patch){
    Object.assign(this,patch);
    if(Object.prototype.hasOwnProperty.call(patch,'rows'))this.dataRevision++;
    document.dispatchEvent(new CustomEvent('store:change',{detail:patch}));
  }
};
export const text=v=>String(v??'').trim();
export const number=v=>Number(String(v??0).replace(/,/g,''))||0;
export const money=v=>`MVR ${number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const get=(obj,...keys)=>{for(const key of keys)if(obj&&obj[key]!=null)return obj[key];return''};
export const billDate=b=>String(get(b,'bill_day','bill_date','Bill Date','date','Date','created_at')||'').slice(0,10);
export const vendor=b=>text(get(b,'vendor','Vendor','vendor_name','supplier','Supplier'))||'Unknown supplier';
export const amount=b=>number(get(b,'amount','Amount','total','Total','grand_total','Grand Total'));
export const status=b=>text(get(b,'payment_status','Payment Status','status','Status'))||'Pending';
export const billNo=b=>text(get(b,'bill_no','Bill No','invoice','Invoice'))||'—';
export const itemOf=b=>Array.isArray(b?.items)?b.items[0]||{}:{};
export const productOf=b=>text(get(itemOf(b),'description','product','name'))||text(get(b,'product','description'))||'Unspecified item';