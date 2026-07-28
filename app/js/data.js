import {CONFIG} from './config.js';
import {store} from './store.js';

export const db=window.supabase.createClient(CONFIG.supabaseUrl,CONFIG.supabaseKey);

let billsLoadPromise=null;
let billsLoaded=false;
let billsLoadedAt=0;
let billsFetchCount=0;

export const billsLoadState=()=>({
  loading:Boolean(billsLoadPromise),
  loaded:billsLoaded,
  loadedAt:billsLoadedAt||null,
  fetchCount:billsFetchCount,
  rows:store.rows.length
});

export function invalidateBillsCache({clearRows=false}={}){
  billsLoadPromise=null;
  billsLoaded=false;
  billsLoadedAt=0;
  if(clearRows)store.set({rows:[]});
}

export async function signIn(username,password){
  const email=CONFIG.loginAliases[String(username||'').trim().toLowerCase()]||String(username||'').trim();
  const {data,error}=await db.auth.signInWithPassword({email,password});
  if(error)throw error;
  invalidateBillsCache({clearRows:true});
  store.set({user:data.user,role:CONFIG.adminIds.includes(data.user?.id)?'admin':'staff'});
  return data.user;
}

export async function signOut(){
  await db.auth.signOut();
  invalidateBillsCache({clearRows:true});
  store.set({user:null});
}

export async function restoreSession(){
  const {data}=await db.auth.getSession();
  const user=data.session?.user||null;
  const changedUser=String(store.user?.id||'')!==String(user?.id||'');
  if(changedUser)invalidateBillsCache({clearRows:true});
  store.set({user,role:CONFIG.adminIds.includes(user?.id)?'admin':'staff'});
  return user;
}

export async function sendPasswordReset(email=store.user?.email){
  const target=String(email||'').trim();
  if(!target)throw new Error('No account email is available.');
  const redirectTo=`${location.origin}${location.pathname}#settings`;
  const {error}=await db.auth.resetPasswordForEmail(target,{redirectTo});
  if(error)throw error;
  return target;
}

export async function updatePassword(password){
  const value=String(password||'');
  if(value.length<8)throw new Error('Password must contain at least 8 characters.');
  const {data,error}=await db.auth.updateUser({password:value});
  if(error)throw error;
  if(data?.user)store.set({user:data.user});
  return data?.user||null;
}

async function fetchAllBills(){
  const all=[];
  let from=0;
  const step=1000;
  billsFetchCount++;

  while(true){
    const {data,error}=await db.from(CONFIG.table).select('*').is('deleted_at',null).range(from,from+step-1);
    if(error)throw error;
    all.push(...(data||[]));
    if(!data||data.length<step)break;
    from+=step;
  }

  store.set({rows:all});
  billsLoaded=true;
  billsLoadedAt=Date.now();
  return all;
}

export function loadBills({force=false}={}){
  if(!force&&billsLoaded)return Promise.resolve(store.rows);
  if(!force&&billsLoadPromise)return billsLoadPromise;

  billsLoadPromise=fetchAllBills().finally(()=>{
    billsLoadPromise=null;
  });

  return billsLoadPromise;
}

const protectedColumns=new Set(['id','created_at','updated_at']);
function schemaColumns(){
  const columns=new Set();
  for(const row of store.rows||[])Object.keys(row||{}).forEach(key=>columns.add(key));
  return columns;
}

const aliases={
  bill_date:['bill_day','date','Date','Bill Date'],
  bill_no:['invoice','Invoice','Bill No'],
  vendor:['vendor_name','supplier','Supplier','Vendor'],
  payment_status:['status','Status','Payment Status'],
  payment_method:['method','Method','Payment Method'],
  amount:['grand_total','total','Total','Grand Total','Amount'],
  gst_total:['gst_amount','tax_total','GST Total'],
  mobile:['phone','vendor_mobile'],
  tin:['vendor_tin'],
  location:['address'],
  description:['product','name'],
  pack_format:['packing','pack'],
  qty:['quantity'],
  pack_rate:['rate','price'],
  gst:['gst_rate'],
  base_quantity:['total_quantity'],
  base_unit:['small_unit'],
  unit_rate:['small_unit_rate'],
  large_unit_rate:['kg_l_rate']
};

function adaptAliases(source,columns){
  if(!columns.size)return source;
  const result={...source};
  for(const [canonical,candidates] of Object.entries(aliases)){
    if(result[canonical]===undefined||columns.has(canonical))continue;
    const target=candidates.find(name=>columns.has(name)&&result[name]===undefined);
    if(target){result[target]=result[canonical];delete result[canonical]}
  }
  return result;
}

function compatibleRecord(record){
  const columns=schemaColumns();
  const source=adaptAliases({...record},columns);
  if(!columns.size)return source;
  return Object.fromEntries(
    Object.entries(source).filter(([key])=>columns.has(key)&&!protectedColumns.has(key))
  );
}

function assertPayload(payload){
  if(!payload.length)throw new Error('No bill data was prepared for saving.');
  for(const record of payload){
    if(!Object.keys(record).length)throw new Error('Bill data does not match the Supabase table columns. Reload the page and try again.');
  }
}

export async function saveBillRecords(records){
  const payload=(records||[]).map(compatibleRecord);
  assertPayload(payload);
  const {data,error}=await db.from(CONFIG.table).insert(payload).select();
  if(error)throw new Error(`Bill save failed: ${error.message}${error.details?` — ${error.details}`:''}`);
  if(!data?.length)throw new Error('Supabase accepted the request but returned no saved bill.');
  store.set({rows:[...data,...store.rows]});
  billsLoaded=true;
  billsLoadedAt=Date.now();
  return data;
}

export async function updateBill(id,record){
  const payload=compatibleRecord(record);
  assertPayload([payload]);
  const {data,error}=await db.from(CONFIG.table).update(payload).eq('id',id).select().single();
  if(error)throw new Error(`Bill update failed: ${error.message}${error.details?` — ${error.details}`:''}`);
  store.set({rows:store.rows.map(row=>String(row.id)===String(id)?data:row)});
  billsLoaded=true;
  billsLoadedAt=Date.now();
  return data;
}

export async function deleteBill(id){
  const {error}=await db.rpc('trash_bill',{p_bill_id:id});
  if(error)throw error;
  store.set({rows:store.rows.filter(row=>String(row.id)!==String(id))});
  billsLoaded=true;
  billsLoadedAt=Date.now();
}
