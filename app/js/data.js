import {CONFIG} from './config.js';
import {store} from './store.js';

export const db=window.supabase.createClient(CONFIG.supabaseUrl,CONFIG.supabaseKey);

export async function signIn(username,password){
  const email=CONFIG.loginAliases[String(username||'').trim().toLowerCase()]||String(username||'').trim();
  const {data,error}=await db.auth.signInWithPassword({email,password});
  if(error)throw error;
  store.set({user:data.user,role:CONFIG.adminIds.includes(data.user?.id)?'admin':'staff'});
  return data.user;
}
export async function signOut(){await db.auth.signOut();store.set({user:null,rows:[]})}
export async function restoreSession(){const {data}=await db.auth.getSession();const user=data.session?.user||null;store.set({user,role:CONFIG.adminIds.includes(user?.id)?'admin':'staff'});return user}
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
export async function loadBills(){
  const all=[];let from=0;const step=1000;
  while(true){
    const {data,error}=await db.from(CONFIG.table).select('*').range(from,from+step-1);
    if(error)throw error;
    all.push(...(data||[]));
    if(!data||data.length<step)break;
    from+=step;
  }
  store.set({rows:all});return all;
}

const protectedColumns=new Set(['id','created_at','updated_at']);
function schemaColumns(){
  const columns=new Set();
  for(const row of store.rows||[])Object.keys(row||{}).forEach(key=>columns.add(key));
  return columns;
}
function compatibleRecord(record){
  const source={...(record||{})},columns=schemaColumns();
  if(source.mobile!==undefined&&!columns.has('mobile')){
    if(columns.has('phone')&&source.phone===undefined)source.phone=source.mobile;
    else if(columns.has('vendor_mobile')&&source.vendor_mobile===undefined)source.vendor_mobile=source.mobile;
    delete source.mobile;
  }
  if(source.tin!==undefined&&!columns.has('tin')&&columns.has('vendor_tin')){
    source.vendor_tin=source.tin;delete source.tin;
  }
  if(source.location!==undefined&&!columns.has('location')&&columns.has('address')){
    source.address=source.location;delete source.location;
  }
  if(!columns.size)return source;
  return Object.fromEntries(Object.entries(source).filter(([key])=>columns.has(key)&&!protectedColumns.has(key)));
}

export async function saveBillRecords(records){
  const payload=(records||[]).map(compatibleRecord);
  const {data,error}=await db.from(CONFIG.table).insert(payload).select();
  if(error)throw error;
  store.set({rows:[...(data||[]),...store.rows]});return data;
}
export async function updateBill(id,record){
  const payload=compatibleRecord(record);
  const {data,error}=await db.from(CONFIG.table).update(payload).eq('id',id).select().single();
  if(error)throw error;
  store.set({rows:store.rows.map(row=>String(row.id)===String(id)?data:row)});return data;
}
export async function deleteBill(id){const {error}=await db.from(CONFIG.table).delete().eq('id',id);if(error)throw error;store.set({rows:store.rows.filter(row=>String(row.id)!==String(id))})}