(()=>{
'use strict';
const originalRenderBillRows=window.renderBillRows;
if(typeof originalRenderBillRows!=='function')return;
window.renderBillRows=()=>{
  originalRenderBillRows();
  document.querySelectorAll('#billRows [data-delete]').forEach(button=>{
    button.onclick=async()=>{
      const row=(Array.isArray(state.rows)?state.rows:[]).find(item=>String(item.id)===button.dataset.delete);
      if(!row||!confirm('Delete this bill?'))return;
      button.disabled=true;
      const deletedAt=new Date().toISOString();
      const result=await db.from(TABLE)
        .update({deleted_at:deletedAt,updated_at:deletedAt,updated_by:state.user?.id||null})
        .eq('id',row.id)
        .is('deleted_at',null)
        .select('id');
      if(result.error){
        alert('Delete failed: '+result.error.message);
        button.disabled=false;
        return;
      }
      if(!Array.isArray(result.data)||result.data.length===0){
        alert('Bill was not deleted. The database did not permit the update.');
        button.disabled=false;
        return;
      }
      state.rows=state.rows.filter(item=>String(item.id)!==String(row.id));
      state.filtered=(state.filtered||[]).filter(item=>String(item.id)!==String(row.id));
      window.renderBillRows();
      if(typeof window.reloadBillsNow==='function')await window.reloadBillsNow();
    };
  });
};
})();
