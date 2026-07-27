import {store,text} from './store.js';
import {db} from './data.js';

const actorId=()=>store.user?.id||null;
const actorEmail=()=>store.user?.email||'unknown';

export async function recordAudit(tableName,recordId,action,oldData=null,newData=null){
  const payload={
    table_name:text(tableName),
    record_id:recordId==null?null:String(recordId),
    action:text(action),
    old_data:oldData,
    new_data:newData,
    changed_by:actorId(),
    user_agent:navigator.userAgent
  };
  const {error}=await db.from('audit_log').insert(payload);
  if(error)console.warn('[audit] could not record activity',error);
}

export async function requestDeletion(entityType,entityId,entityLabel='',reason=''){
  if(store.role==='admin')throw new Error('Admin should delete through the approval screen.');
  const payload={
    entity_type:text(entityType),
    entity_id:String(entityId),
    entity_label:text(entityLabel),
    requested_by:actorId(),
    reason:text(reason),
    status:'pending'
  };
  const {data,error}=await db.from('deletion_requests').insert(payload).select().single();
  if(error)throw error;
  await recordAudit(entityType,entityId,'delete_requested',null,{request_id:data.id,label:entityLabel,reason,requested_by:actorEmail()});
  return data;
}

export async function loadDeletionRequests(){
  const {data,error}=await db.from('deletion_requests').select('*').order('requested_at',{ascending:false});
  if(error)throw error;
  return data||[];
}

export async function loadAuditLog(limit=100){
  const {data,error}=await db.from('audit_log').select('*').order('changed_at',{ascending:false}).limit(limit);
  if(error)throw error;
  return data||[];
}

export async function reviewDeletionRequest(request,decision,note=''){
  if(store.role!=='admin')throw new Error('Admin permission is required.');
  if(!request?.id)throw new Error('Deletion request is missing.');
  if(!['approved','rejected'].includes(decision))throw new Error('Invalid review decision.');

  if(decision==='approved'){
    const {data:record,error:readError}=await db.from(request.entity_type).select('*').eq('id',request.entity_id).maybeSingle();
    if(readError)throw readError;
    if(record){
      const {error:binError}=await db.from('restore_bin').insert({
        entity_type:request.entity_type,
        entity_id:String(request.entity_id),
        snapshot:record,
        deleted_by:actorId()
      });
      if(binError)throw binError;
      const {error:deleteError}=await db.from(request.entity_type).update({deleted_at:new Date().toISOString(),updated_by:actorId()}).eq('id',request.entity_id);
      if(deleteError)throw deleteError;
      await recordAudit(request.entity_type,request.entity_id,'delete_approved',record,{request_id:request.id,review_note:note});
    }
  }else{
    await recordAudit(request.entity_type,request.entity_id,'delete_rejected',null,{request_id:request.id,review_note:note});
  }

  const {error}=await db.from('deletion_requests').update({
    status:decision,
    reviewed_by:actorId(),
    reviewed_at:new Date().toISOString(),
    review_note:text(note)
  }).eq('id',request.id);
  if(error)throw error;
}
