export const store={
  user:null,role:'staff',rows:[],route:'dashboard',page:1,pageSize:20,editing:null,dataRevision:0,
  set(patch){Object.assign(this,patch);if(Object.prototype.hasOwnProperty.call(patch,'rows'))this.dataRevision++;document.dispatchEvent(new CustomEvent('store:change',{detail:patch}))}
};
export const text=v=>String(v??'').trim();
export const number=v=>Number(String(v??0).replace(/,/g,''))||0;
export const money=v=>`MVR ${number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const get=(obj,...keys)=>{for(const key of keys)if(obj&&obj[key]!=null)return obj[key];return''};
export const localISO=(value=new Date())=>`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
export const today=()=>localISO();
export const billDate=b=>String(get(b,'bill_day','bill_date','Bill Date','date','Date','created_at')||'').slice(0,10);
export const vendor=b=>text(get(b,'vendor','Vendor','vendor_name','supplier','Supplier'))||'Unknown supplier';
export const status=b=>text(get(b,'payment_status','Payment Status','status','Status'))||'Pending';
export const billNo=b=>text(get(b,'bill_no','Bill No','invoice','Invoice'))||'—';
export const itemsOf=b=>Array.isArray(b?.items)&&b.items.length?b.items:[b&&Object.keys(b).some(key=>['product','description','qty','quantity','pack_rate','rate'].includes(key))?b:{}].filter(item=>item&&Object.keys(item).length);
export const itemOf=b=>itemsOf(b)[0]||{};
export const productName=(item,row={})=>text(get(item,'description','product','name')||get(row,'product','description'))||'Unspecified item';
export const productOf=b=>productName(itemOf(b),b);
export const lineTotal=item=>{const saved=number(get(item,'row_total','line_total','total','net_amount'));return saved||number(get(item,'qty','quantity'))*number(get(item,'pack_rate','bill_rate','rate','purchase_rate','price'))};
export const itemCategory=(item,row={})=>text(get(item,'category')||get(row,'category'))||'Other';
export const billComputedTotal=b=>{const items=itemsOf(b);if(!items.length)return 0;return items.reduce((sum,item)=>{const line=lineTotal(item),gst=number(get(item,'gst','gst_rate'));return sum+line+line*gst/100},0)};
export const amount=b=>number(get(b,'amount','Amount','total','Total','grand_total','Grand Total'))||billComputedTotal(b);
