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
export async function saveBillRecords(records){const {data,error}=await db.from(CONFIG.table).insert(records).select();if(error)throw error;store.set({rows:[...(data||[]),...store.rows]});return data}
export async function updateBill(id,record){const {data,error}=await db.from(CONFIG.table).update(record).eq('id',id).select().single();if(error)throw error;store.set({rows:store.rows.map(row=>String(row.id)===String(id)?data:row)});return data}
export async function deleteBill(id){const {error}=await db.from(CONFIG.table).delete().eq('id',id);if(error)throw error;store.set({rows:store.rows.filter(row=>String(row.id)!==String(id))})}
