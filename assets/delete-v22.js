(()=>{
'use strict';

const isAdmin=()=>String(state?.role||'').toLowerCase()==='admin'||(Array.isArray(ADMIN_IDS)&&ADMIN_IDS.includes(state?.user?.id));
const stamp=()=>new Date().toISOString();

async function deleteBill(id,button){
  if(!isAdmin())return alert('Only administrators can delete bills.');
  if(!confirm('Delete this bill? It will move to the Restore centre.'))return;
  button.disabled=true;button.textContent='Deleting…';
  const {error}=await db.from('bills').update({deleted_at:stamp(),archived_at:null}).eq('id',id);
  if(error){button.disabled=false;button.textContent='Delete';return alert(error.message)}
  await loadBills(true);
  if(state.view==='bills')renderBills();
}

async function deleteProduct(id,button){
  if(!isAdmin())return alert('Only administrators can delete products.');
  if(!confirm('Delete this product? It will move to archived products and can be restored.'))return;
  button.disabled=true;button.textContent='Deleting…';
  const {error}=await db.from('products').update({deleted_at:stamp()}).eq('id',id);
  if(error){button.disabled=false;button.textContent='Delete';return alert(error.message)}
  if(state.view==='products')renderProducts();
}

function addDeleteButtons(root=document){
  if(!isAdmin())return;
  root.querySelectorAll('[data-phase-archive]').forEach(archive=>{
    if(archive.parentElement?.querySelector('[data-delete-bill]'))return;
    const button=document.createElement('button');
    button.type='button';button.className='btn danger small';button.textContent='Delete';
    button.dataset.deleteBill=archive.dataset.phaseArchive;
    button.onclick=()=>deleteBill(button.dataset.deleteBill,button);
    archive.insertAdjacentElement('afterend',button);
  });
  root.querySelectorAll('[data-product-archive]').forEach(archive=>{
    const id=archive.dataset.productArchive;
    const row=archive.closest('tr');
    const archived=/restore/i.test(archive.textContent||'');
    if(archived||row?.querySelector('[data-delete-product]'))return;
    const button=document.createElement('button');
    button.type='button';button.className='btn danger small';button.textContent='Delete';
    button.dataset.deleteProduct=id;
    button.onclick=()=>deleteProduct(id,button);
    archive.insertAdjacentElement('afterend',button);
  });
}

const content=document.querySelector('#content');
if(content){
  const observer=new MutationObserver(()=>requestAnimationFrame(()=>addDeleteButtons(content)));
  observer.observe(content,{childList:true,subtree:true});
}
document.addEventListener('click',()=>setTimeout(()=>addDeleteButtons(document),0),true);
setTimeout(()=>addDeleteButtons(document),300);
})();
